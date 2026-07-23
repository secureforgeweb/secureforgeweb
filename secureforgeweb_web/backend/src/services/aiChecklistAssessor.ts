import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod/v4";
import type { AutoAssessmentSuggestion } from "./checklistAssessor.js";
import { getAiAssistantRuntimeConfig, formatLlmHttpError } from "./aiAssistantConfig.js";
import {
  assessHttpSecurityItems,
  fetchHttpSecuritySnapshot,
  HTTP_ASSESSMENT_ITEM_CODES,
  type HttpSecuritySnapshot,
} from "./checklistAssessor.js";
import {
  assessGitRepositoryItems,
  fetchGitRepositorySnapshot,
  GIT_ASSESSMENT_ITEM_CODES,
  type GitRepositorySnapshot,
} from "./gitRepoAssessor.js";
import type { ComplianceValue } from "../models/analyses.db.js";
import { enrichSuggestionArtifacts } from "./assessmentEvidence.js";

const execFileAsync = promisify(execFile);

/** Itens avaliados prioritariamente por raciocínio contextual (6C). */
export const AI_ASSESSMENT_ITEM_CODES = [
  "EXPOS-01",
  "EXPOS-02",
  "DATA-02",
  "SURF-01",
  "SURF-02",
] as const;

/** Checklist completo coberto pelo assistente IA (6A + 6B + 6C integrados). */
export const AI_ORCHESTRATED_ITEM_CODES = [
  ...HTTP_ASSESSMENT_ITEM_CODES,
  ...GIT_ASSESSMENT_ITEM_CODES,
  ...AI_ASSESSMENT_ITEM_CODES,
] as const;

export type AiAssessmentItemCode = (typeof AI_ASSESSMENT_ITEM_CODES)[number];

export type AiAssessmentItemInput = {
  id: number;
  code: string;
  essentialCode?: string | null;
  asvsId?: string | null;
  verificationLevel?: number | null;
  sectionName?: string | null;
  title: string;
  description: string;
};

export type AiAssessmentContext = {
  application: {
    name: string;
    baseUrl: string | null;
    repositoryUrl: string | null;
    techStack: string | null;
    description: string | null;
  };
  httpSnapshot: HttpSecuritySnapshot | null;
  gitSnapshot: GitRepositorySnapshot | null;
  corpus: string;
  npmAuditSummary: NpmAuditSummary | null;
};

export type NpmAuditSummary = {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  total: number;
};

export type AiAssessmentMode = "llm" | "heuristic" | "heuristic-fallback";

export type AiAssessmentResult = {
  mode: AiAssessmentMode;
  provider: string;
  contextSummary: string;
  suggestions: AutoAssessmentSuggestion[];
};

const llmSuggestionSchema = z.object({
  itemCode: z.string(),
  compliance: z.enum(["conforme", "parcial", "nao_conforme", "nao_aplicavel"]),
  confidence: z.number().min(0).max(100),
  evidence: z.string().min(1),
  rationale: z.string().min(1),
});

const llmResponseSchema = z.object({
  suggestions: z.array(llmSuggestionSchema),
});

type HeuristicResult = Omit<AutoAssessmentSuggestion, "itemId" | "itemCode" | "source">;

function result(
  compliance: ComplianceValue,
  confidence: number,
  evidence: string,
  rationale: string
): HeuristicResult {
  return { compliance, confidence, evidence, rationale };
}

function findEvidence(pattern: RegExp, corpus: string, files: GitRepositorySnapshot["files"]): string | null {
  for (const file of files) {
    const match = file.content.match(pattern);
    if (match) {
      const idx = file.content.indexOf(match[0]);
      const start = Math.max(0, idx - 40);
      const end = Math.min(file.content.length, idx + match[0].length + 60);
      const snippet = file.content.slice(start, end).replace(/\s+/g, " ").trim();
      return `${file.path}: …${snippet}…`;
    }
  }
  if (pattern.test(corpus)) {
    return "Padrão detectado no corpus de código analisado.";
  }
  return null;
}

function buildCorpus(gitSnapshot: GitRepositorySnapshot | null): string {
  if (!gitSnapshot) return "";
  return gitSnapshot.files.map((f) => `${f.path}\n${f.content}`).join("\n\n");
}

async function runNpmAuditInRepo(
  gitSnapshot: GitRepositorySnapshot | null
): Promise<NpmAuditSummary | null> {
  if (!gitSnapshot) return null;
  const packageFile = gitSnapshot.files.find((f) => f.path.endsWith("package.json"));
  if (!packageFile) return null;

  const auditDir = await mkdtemp(path.join(os.tmpdir(), "sf-audit-"));

  try {
    await writeFile(path.join(auditDir, "package.json"), packageFile.content, "utf8");
    const lockFile = gitSnapshot.files.find((f) =>
      ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"].some((name) => f.path.endsWith(name))
    );
    if (lockFile) {
      await writeFile(path.join(auditDir, path.basename(lockFile.path)), lockFile.content, "utf8");
    }

    try {
      const { stdout } = await execFileAsync("npm", ["audit", "--json"], {
        cwd: auditDir,
        timeout: 60_000,
        maxBuffer: 4 * 1024 * 1024,
      });
      const parsed = JSON.parse(stdout) as {
        metadata?: { vulnerabilities?: Record<string, number> };
      };
      const vulns = parsed.metadata?.vulnerabilities ?? {};
      return {
        critical: vulns.critical ?? 0,
        high: vulns.high ?? 0,
        moderate: vulns.moderate ?? 0,
        low: vulns.low ?? 0,
        total: Object.values(vulns).reduce((a, b) => a + b, 0),
      };
    } catch (err: unknown) {
      const execErr = err as { stdout?: string };
      if (execErr.stdout) {
        try {
          const parsed = JSON.parse(execErr.stdout) as {
            metadata?: { vulnerabilities?: Record<string, number> };
          };
          const vulns = parsed.metadata?.vulnerabilities ?? {};
          return {
            critical: vulns.critical ?? 0,
            high: vulns.high ?? 0,
            moderate: vulns.moderate ?? 0,
            low: vulns.low ?? 0,
            total: Object.values(vulns).reduce((a, b) => a + b, 0),
          };
        } catch {
          return null;
        }
      }
      return null;
    }
  } finally {
    await rm(auditDir, { recursive: true, force: true });
  }
}

export async function buildAiAssessmentContext(input: {
  name: string;
  baseUrl: string | null;
  repositoryUrl: string | null;
  techStack: string | null;
  description: string | null;
}): Promise<AiAssessmentContext> {
  const [httpSnapshot, gitSnapshot] = await Promise.all([
    input.baseUrl?.trim()
      ? fetchHttpSecuritySnapshot(input.baseUrl).catch(() => null)
      : Promise.resolve(null),
    input.repositoryUrl?.trim()
      ? fetchGitRepositorySnapshot(input.repositoryUrl).catch(() => null)
      : Promise.resolve(null),
  ]);

  const corpus = buildCorpus(gitSnapshot);
  const npmAuditSummary = await runNpmAuditInRepo(gitSnapshot);

  return {
    application: {
      name: input.name,
      baseUrl: input.baseUrl?.trim() || null,
      repositoryUrl: input.repositoryUrl?.trim() || null,
      techStack: input.techStack?.trim() || null,
      description: input.description?.trim() || null,
    },
    httpSnapshot,
    gitSnapshot,
    corpus,
    npmAuditSummary,
  };
}

function assessExpos01(ctx: AiAssessmentContext): HeuristicResult {
  const files = ctx.gitSnapshot?.files ?? [];
  const authGuard =
    /protectedProcedure|adminProcedure|requireAuth|authenticate|jwt\.verify|passport\.authenticate/i.test(
      ctx.corpus
    );
  // Ignore intentional public auth flows (login / password reset).
  const publicSensitive =
    /publicProcedure[\s\S]{0,200}(?:deleteUser|updateUser|adminRouter|resetUserPassword)/i.test(ctx.corpus);
  const evidence = findEvidence(/protectedProcedure|adminProcedure|requireAuth/i, ctx.corpus, files);

  if (publicSensitive) {
    return result(
      "nao_conforme",
      78,
      evidence ?? "Rotas sensíveis aparentam usar publicProcedure sem autenticação.",
      "Endpoints de alteração ou admin devem exigir autenticação."
    );
  }
  if (authGuard) {
    return result(
      "conforme",
      74,
      evidence ?? "Middleware/procedures autenticados detectados no código.",
      "Há indícios de proteção por autenticação em rotas sensíveis."
    );
  }
  return result(
    "parcial",
    58,
    ctx.gitSnapshot ? "Nenhum padrão claro de autenticação em rotas detectado." : "Análise limitada sem repositório.",
    "Revise manualmente se APIs que manipulam dados exigem token ou sessão."
  );
}

function assessExpos02(ctx: AiAssessmentContext): HeuristicResult {
  const files = ctx.gitSnapshot?.files ?? [];
  const docsExposure = /swagger|openapi|api-docs|swagger-ui|redoc/i.test(ctx.corpus);
  const docsProtected =
    /swagger[\s\S]{0,300}(?:auth|admin|protected|basicAuth)/i.test(ctx.corpus) ||
    /NODE_ENV.*production[\s\S]{0,200}(?:disable|false).*swagger/i.test(ctx.corpus);

  if (!docsExposure) {
    return result(
      "conforme",
      70,
      "Nenhuma documentação OpenAPI/Swagger exposta detectada no código.",
      "Superfície de documentação de API não aparenta estar publicada."
    );
  }
  if (docsProtected) {
    return result(
      "conforme",
      72,
      findEvidence(/swagger|openapi|api-docs/i, ctx.corpus, files) ?? "Docs de API com indícios de proteção.",
      "Documentação de API parece restrita ou desabilitada em produção."
    );
  }
  return result(
    "nao_conforme",
    76,
    findEvidence(/swagger|openapi|api-docs/i, ctx.corpus, files) ?? "Swagger/OpenAPI referenciado sem guarda clara.",
    "Documentação de API pode expor superfície de ataque em produção."
  );
}

function assessData02(ctx: AiAssessmentContext): HeuristicResult {
  const files = ctx.gitSnapshot?.files ?? [];
  const sensitiveLog = /console\.(?:log|info|debug)\([^)]*(?:password|token|secret|cpf|ssn)/i.test(
    ctx.corpus
  );
  const logRedaction =
    /redact|mask|sanitize.*log|pino.*redact|winston.*sanitize|redactSensitive|safeLog|logRedact/i.test(
      ctx.corpus
    );

  if (sensitiveLog) {
    return result(
      "nao_conforme",
      80,
      findEvidence(/console\.(?:log|info).*(?:password|token|secret)/i, ctx.corpus, files) ??
        "Possível log de dado sensível detectado.",
      "Senhas, tokens ou PII não devem aparecer em logs."
    );
  }
  if (logRedaction) {
    return result(
      "conforme",
      73,
      findEvidence(/redact|sanitize.*log|pino.*redact|redactSensitive|safeLog/i, ctx.corpus, files) ?? "Mecanismo de redação de logs detectado.",
      "Há indícios de mascaramento ou sanitização antes de registrar logs."
    );
  }
  return result(
    "parcial",
    62,
    "Nenhum vazamento óbvio em logs, mas redação explícita não foi confirmada.",
    "Revise políticas de logging e mascaramento de PII/tokens."
  );
}

function assessSurf01(ctx: AiAssessmentContext): HeuristicResult {
  const files = ctx.gitSnapshot?.files ?? [];
  const debugRoutes = /\/debug|phpinfo|expose.*port|DEBUG\s*=\s*true/i.test(ctx.corpus);
  const bindAll = /app\.listen\([^)]*0\.0\.0\.0|listen\(\s*\{[^}]*host:\s*['"]0\.0\.0\.0['"]/i.test(
    ctx.corpus
  );
  const dockerPorts = (ctx.corpus.match(/ports:\s*\n(?:\s*-\s*["']?\d+:\d+["']?\n?)+/gi) ?? []).length;

  if (debugRoutes || bindAll) {
    return result(
      "nao_conforme",
      77,
      findEvidence(/\/debug|phpinfo|0\.0\.0\.0|DEBUG\s*=\s*true/i, ctx.corpus, files) ??
        "Endpoints ou binds de debug detectados.",
      "Serviços ou rotas de debug expõem superfície desnecessária."
    );
  }
  if (dockerPorts <= 1) {
    return result(
      "conforme",
      72,
      ctx.gitSnapshot
        ? "Nenhuma rota de debug detectada; superfície Docker mínima (≤1 serviço publicado)."
        : "Sem indícios de endpoints de debug no código analisado.",
      "Superfície de ataque aparenta restrita aos serviços necessários."
    );
  }
  if (dockerPorts <= 2) {
    return result(
      "parcial",
      60,
      "Poucos serviços expostos em Docker; validação operacional ainda recomendada.",
      "Confirme que apenas serviços necessários estão acessíveis publicamente."
    );
  }
  return result(
    "parcial",
    65,
    `${dockerPorts} bloco(s) de portas em Docker/compose detectado(s).`,
    "Revise se todas as portas publicadas são estritamente necessárias."
  );
}

function assessSurf02(ctx: AiAssessmentContext): HeuristicResult {
  const audit = ctx.npmAuditSummary;
  if (!audit) {
    const hasDeps = /package\.json|"dependencies"/i.test(ctx.corpus);
    if (!hasDeps) {
      return result(
        "nao_aplicavel",
        55,
        "Nenhum package.json identificado para auditoria de dependências.",
        "Item aplicável apenas a projetos com gerenciador de pacotes Node."
      );
    }
    return result(
      "parcial",
      58,
      "package.json encontrado, mas npm audit não pôde ser executado neste ambiente.",
      "Execute npm audit localmente e trate CVEs críticos/altos."
    );
  }
  if (audit.critical > 0) {
    return result(
      "nao_conforme",
      88,
      `npm audit: ${audit.critical} crítica(s), ${audit.high} alta(s), ${audit.moderate} moderada(s).`,
      "Dependências com CVEs críticos devem ser atualizadas ou mitigadas."
    );
  }
  if (audit.high > 0) {
    return result(
      "parcial",
      78,
      `npm audit: ${audit.high} vulnerabilidade(s) alta(s), ${audit.moderate} moderada(s).`,
      "Priorize correção de vulnerabilidades altas nas dependências."
    );
  }
  return result(
    "conforme",
    82,
    `npm audit: nenhuma crítica/alta (${audit.moderate} moderada(s), ${audit.low} baixa(s)).`,
    "Dependências sem CVEs críticos ou altos conhecidos no momento da análise."
  );
}

function assessGenericLimited(ctx: AiAssessmentContext, item: AiAssessmentItemInput): HeuristicResult {
  const limits: string[] = [];
  if (!ctx.gitSnapshot) limits.push("repositório Git ausente");
  if (!ctx.httpSnapshot) limits.push("URL HTTP não analisada");
  const evidence =
    limits.length > 0
      ? `Análise limitada (${limits.join("; ")}).`
      : "Evidência automática insuficiente para este controle.";
  return result(
    "parcial",
    52,
    evidence,
    `Revise manualmente o controle "${item.title}" (${item.code}).`
  );
}

function asAiSuggestions(suggestions: AutoAssessmentSuggestion[]): AutoAssessmentSuggestion[] {
  return suggestions.map((s) => ({ ...s, source: "ai" as const }));
}

function attachArtifactsToSuggestion(
  suggestion: AutoAssessmentSuggestion,
  ctx: AiAssessmentContext
): AutoAssessmentSuggestion {
  if (suggestion.artifacts?.length) {
    return suggestion;
  }
  return {
    ...suggestion,
    artifacts: enrichSuggestionArtifacts({
      itemCode: suggestion.itemCode,
      evidence: suggestion.evidence,
      rationale: suggestion.rationale,
      gitSnapshot: ctx.gitSnapshot,
      httpSnapshot: ctx.httpSnapshot,
      npmAuditSummary: ctx.npmAuditSummary,
    }),
  };
}

function attachArtifactsToSuggestions(
  suggestions: AutoAssessmentSuggestion[],
  ctx: AiAssessmentContext
): AutoAssessmentSuggestion[] {
  return suggestions.map((s) => attachArtifactsToSuggestion(s, ctx));
}

/** Combina regras 6A + 6B + 6C e preenche todo o checklist (24 itens). */
export function buildFullChecklistAiSuggestions(
  ctx: AiAssessmentContext,
  items: AiAssessmentItemInput[]
): AutoAssessmentSuggestion[] {
  const map = new Map<string, AutoAssessmentSuggestion>();
  const itemRefs = items.map((i) => ({ id: i.id, code: i.essentialCode ?? i.code }));

  const merge = (list: AutoAssessmentSuggestion[]) => {
    for (const s of list) {
      map.set(s.itemCode, { ...s, source: "ai" });
    }
  };

  if (ctx.httpSnapshot) {
    merge(asAiSuggestions(assessHttpSecurityItems(ctx.httpSnapshot, itemRefs)));
  }

  if (ctx.gitSnapshot) {
    merge(asAiSuggestions(assessGitRepositoryItems(ctx.gitSnapshot, itemRefs)));
  }

  merge(assessAiItemsHeuristic(ctx, items));

  for (const item of items) {
    if (!map.has(item.code)) {
      map.set(item.code, {
        itemId: item.id,
        itemCode: item.code,
        ...assessGenericLimited(ctx, item),
        source: "ai",
      });
    }
  }

  return attachArtifactsToSuggestions(Array.from(map.values()), ctx);
}

function assessHeuristicItem(code: AiAssessmentItemCode, ctx: AiAssessmentContext): HeuristicResult {
  switch (code) {
    case "EXPOS-01":
      return assessExpos01(ctx);
    case "EXPOS-02":
      return assessExpos02(ctx);
    case "DATA-02":
      return assessData02(ctx);
    case "SURF-01":
      return assessSurf01(ctx);
    case "SURF-02":
      return assessSurf02(ctx);
    default:
      throw new Error(`Código de item não suportado: ${code}`);
  }
}

export function assessAiItemsHeuristic(
  ctx: AiAssessmentContext,
  items: AiAssessmentItemInput[]
): AutoAssessmentSuggestion[] {
  const codeSet = new Set<string>(AI_ASSESSMENT_ITEM_CODES);
  const suggestions: AutoAssessmentSuggestion[] = [];

  for (const item of items) {
    const automationCode = item.essentialCode ?? item.code;
    if (!codeSet.has(automationCode)) continue;
    const assessed = assessHeuristicItem(automationCode as AiAssessmentItemCode, ctx);
    suggestions.push({
      itemId: item.id,
      itemCode: item.code,
      ...assessed,
      source: "ai",
      artifacts: enrichSuggestionArtifacts({
        itemCode: automationCode,
        evidence: assessed.evidence,
        rationale: assessed.rationale,
        gitSnapshot: ctx.gitSnapshot,
        httpSnapshot: ctx.httpSnapshot,
        npmAuditSummary: ctx.npmAuditSummary,
      }),
    });
  }

  return suggestions;
}

function formatItemForPrompt(item: AiAssessmentItemInput): string {
  if (item.asvsId) {
    const level = item.verificationLevel ? ` (Nível ASVS ${item.verificationLevel})` : "";
    const section = item.sectionName ? ` — ${item.sectionName}` : "";
    return `- ${item.asvsId}${level}${section}\n  Requisito oficial OWASP ASVS: ${item.description}`;
  }
  return `- ${item.code}: ${item.title} — ${item.description}`;
}

function buildLlmPrompt(ctx: AiAssessmentContext, items: AiAssessmentItemInput[]): string {
  const snippets = (ctx.gitSnapshot?.files ?? [])
    .slice(0, 12)
    .map((f) => `### ${f.path}\n${f.content.slice(0, 1200)}`)
    .join("\n\n");

  const headers = ctx.httpSnapshot
    ? Object.entries(ctx.httpSnapshot.headers)
        .slice(0, 20)
        .map(([k, v]) => `${k}: ${v.slice(0, 120)}`)
        .join("\n")
    : "Não disponível";

  const itemList = items.map((i) => formatItemForPrompt(i)).join("\n");

  return [
    "Você é um assistente AppSec avaliando controles de hardening web.",
    "Com base APENAS nas evidências abaixo, sugira conformidade para cada item listado.",
    "Use o campo itemCode exatamente como aparece no identificador do item (ex.: V3.4.1 ou AUTH-01).",
    "Para requisitos ASVS, avalie o texto oficial do requisito OWASP, não apenas o título.",
    "Se não houver evidência suficiente, use parcial ou nao_aplicavel e confidence <= 65.",
    "Responda SOMENTE JSON válido no formato: {\"suggestions\":[{\"itemCode\",\"compliance\",\"confidence\",\"evidence\",\"rationale\"}]}",
    "",
    "## Aplicação",
    `Nome: ${ctx.application.name}`,
    `Stack: ${ctx.application.techStack ?? "não informado"}`,
    `URL: ${ctx.application.baseUrl ?? "não informada"}`,
    `Repositório: ${ctx.application.repositoryUrl ?? "não informado"}`,
    "",
    "## Headers HTTP",
    headers,
    "",
    "## npm audit",
    ctx.npmAuditSummary
      ? JSON.stringify(ctx.npmAuditSummary)
      : "Não executado ou indisponível",
    "",
    "## Itens a avaliar",
    itemList,
    "",
    "## Trechos de código",
    snippets || "Nenhum repositório analisado.",
  ].join("\n");
}

async function assessWithLlm(
  userId: number,
  ctx: AiAssessmentContext,
  items: AiAssessmentItemInput[]
): Promise<AutoAssessmentSuggestion[]> {
  const llm = await getAiAssistantRuntimeConfig(userId);
  if (!llm.apiKey || !llm.enabled) {
    throw new Error("Assistente IA não configurado ou desabilitado");
  }

  const apiKey = llm.apiKey;
  const baseUrl = llm.baseUrl.replace(/\/$/, "");
  const model = llm.model;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Assistente de checklist OWASP. Retorne JSON com array suggestions. compliance deve ser: conforme, parcial, nao_conforme ou nao_aplicavel.",
        },
        { role: "user", content: buildLlmPrompt(ctx, items) },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(formatLlmHttpError(response.status, body));
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Resposta vazia do LLM");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("LLM retornou JSON inválido");
  }

  const validated = llmResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("LLM retornou formato inesperado");
  }

  const itemByCode = new Map(items.map((i) => [i.code, i]));
  const suggestions: AutoAssessmentSuggestion[] = [];

  for (const row of validated.data.suggestions) {
    const item = itemByCode.get(row.itemCode);
    if (!item) continue;
    suggestions.push({
      itemId: item.id,
      itemCode: row.itemCode,
      compliance: row.compliance,
      confidence: Math.round(Math.min(100, Math.max(0, row.confidence))),
      evidence: row.evidence.slice(0, 2000),
      rationale: row.rationale.slice(0, 2000),
      source: "ai",
      artifacts: enrichSuggestionArtifacts({
        itemCode: row.itemCode,
        evidence: row.evidence,
        rationale: row.rationale,
        gitSnapshot: ctx.gitSnapshot,
        httpSnapshot: ctx.httpSnapshot,
        npmAuditSummary: ctx.npmAuditSummary,
      }),
    });
  }

  return suggestions;
}

export function summarizeAiContext(ctx: AiAssessmentContext): string {
  const parts: string[] = [];
  if (ctx.httpSnapshot) {
    parts.push(`HTTP ${ctx.httpSnapshot.finalUrl} (${ctx.httpSnapshot.statusCode})`);
  }
  if (ctx.gitSnapshot) {
    parts.push(`${ctx.gitSnapshot.filesScanned} arquivo(s) no repositório`);
  }
  if (ctx.npmAuditSummary) {
    parts.push(
      `npm audit: ${ctx.npmAuditSummary.critical}c/${ctx.npmAuditSummary.high}h/${ctx.npmAuditSummary.moderate}m`
    );
  }
  return parts.join(" · ") || "Contexto limitado";
}

export async function runAiAgentAssessment(input: {
  userId: number;
  name: string;
  baseUrl: string | null;
  repositoryUrl: string | null;
  techStack: string | null;
  description: string | null;
  items: AiAssessmentItemInput[];
}): Promise<{ context: AiAssessmentContext; result: AiAssessmentResult }> {
  if (!input.baseUrl?.trim() && !input.repositoryUrl?.trim()) {
    throw new Error(
      "Cadastre URL base e/ou repositório Git para o assistente IA contextualizar a análise."
    );
  }

  const context = await buildAiAssessmentContext(input);
  if (!context.httpSnapshot && !context.gitSnapshot) {
    throw new Error(
      "Não foi possível coletar evidências HTTP ou do repositório para o assistente IA."
    );
  }

  const baseSuggestions = buildFullChecklistAiSuggestions(context, input.items);

  const llmConfig = await getAiAssistantRuntimeConfig(input.userId);
  const configuredModelKey =
    llmConfig.source === "database"
      ? `${llmConfig.provider}:${llmConfig.model}`
      : null;

  if (llmConfig.apiKey && llmConfig.enabled) {
    try {
      const llmSuggestions = await assessWithLlm(input.userId, context, input.items);
      if (llmSuggestions.length > 0) {
        const merged = new Map(baseSuggestions.map((s) => [s.itemCode, s]));
        for (const s of llmSuggestions) {
          merged.set(s.itemCode, s);
        }
        return {
          context,
          result: {
            mode: "llm",
            provider: configuredModelKey ?? `${llmConfig.provider}:${llmConfig.model}`,
            contextSummary: summarizeAiContext(context),
            suggestions: attachArtifactsToSuggestions(Array.from(merged.values()), context),
          },
        };
      }
    } catch {
      // fallback heurístico abaixo
    }
  }

  return {
    context,
    result: {
      mode: llmConfig.apiKey && llmConfig.enabled ? "heuristic-fallback" : "heuristic",
      provider: configuredModelKey ?? "heuristic-local",
      contextSummary: summarizeAiContext(context),
      suggestions: baseSuggestions,
    },
  };
}
