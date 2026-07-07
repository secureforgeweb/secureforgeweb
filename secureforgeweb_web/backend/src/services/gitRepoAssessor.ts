import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { AutoAssessmentSuggestion } from "./checklistAssessor.js";
import type { ComplianceValue } from "../models/analyses.db.js";
import {
  buildGitScanSummaryArtifact,
  buildTextArtifact,
  findCodeArtifact,
  ITEM_CODE_EVIDENCE_PATTERNS,
  mergeArtifacts,
  type AssessmentEvidenceArtifact,
} from "./assessmentEvidence.js";

const execFileAsync = promisify(execFile);

/** Itens avaliáveis via análise estática de repositório (Fase 6B). */
export const GIT_ASSESSMENT_ITEM_CODES = [
  "AUTH-01",
  "AUTH-02",
  "AUTH-03",
  "AUTH-04",
  "AUTHZ-01",
  "AUTHZ-02",
  "AUTHZ-03",
  "INPUT-01",
  "INPUT-02",
  "INPUT-03",
  "SECRET-01",
  "SECRET-02",
  "ERROR-01",
  "ERROR-02",
] as const;

export type GitAssessmentItemCode = (typeof GIT_ASSESSMENT_ITEM_CODES)[number];

export type RepoSourceFile = {
  path: string;
  content: string;
};

export type GitRepositorySnapshot = {
  repositoryUrl: string;
  cloneUrl: string;
  filesScanned: number;
  files: RepoSourceFile[];
  gitignoreContent: string | null;
};

const CLONE_TIMEOUT_MS = 90_000;
const MAX_FILES = 250;
const MAX_FILE_BYTES = 120_000;
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  "vendor",
  "target",
  "__pycache__",
]);
const SOURCE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".java",
  ".rb",
  ".php",
  ".rs",
  ".env.example",
]);

type AssessmentResult = Omit<AutoAssessmentSuggestion, "itemId" | "itemCode">;

type ScanContext = {
  files: RepoSourceFile[];
  corpus: string;
  gitignoreContent: string | null;
};

/** Remove URLs coladas em duplicata (ex.: ...usuarioshttps://github.com/...). */
export function sanitizeGitRepositoryUrlInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const segments = trimmed
    .split(/(?=https?:\/\/)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length > 1) {
    const withGit = segments.find((s) => /\.git(\/)?$/i.test(s));
    return (withGit ?? segments[segments.length - 1]).trim();
  }

  return trimmed;
}

export function normalizeGitRepositoryUrl(raw: string): string {
  const trimmed = sanitizeGitRepositoryUrlInput(raw);
  if (!trimmed) {
    throw new Error("URL do repositório não informada");
  }

  if (trimmed.startsWith("git@")) {
    return trimmed.endsWith(".git") ? trimmed : `${trimmed}.git`;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    if (/^[\w.-]+\/[\w.-]+(\/)?$/.test(trimmed)) {
      return normalizeGitRepositoryUrl(`https://github.com/${trimmed.replace(/\/$/, "")}`);
    }
    throw new Error("URL do repositório inválida");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Use URL HTTPS ou SSH (git@...) do repositório Git");
  }

  url.pathname = url.pathname
    .replace(/\/tree\/[^/]+(\/.*)?$/i, (_m, rest: string | undefined) => rest ?? "")
    .replace(/\/blob\/[^/]+(\/.*)?$/i, (_m, rest: string | undefined) => rest ?? "");

  let repoPath = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!repoPath) {
    throw new Error("Informe owner/repositório na URL do Git");
  }
  if (!repoPath.endsWith(".git")) {
    repoPath += ".git";
  }

  url.pathname = `/${repoPath}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function walkSourceFiles(
  dir: string,
  base: string,
  files: RepoSourceFile[],
  budget: { count: number }
): Promise<void> {
  if (budget.count >= MAX_FILES) return;

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (budget.count >= MAX_FILES) break;
    if (entry.name === ".git") continue;
    if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await walkSourceFiles(fullPath, base, files, budget);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    const allowed = SOURCE_EXT.has(ext) || entry.name === ".env.example";
    if (!allowed) continue;

    const info = await stat(fullPath);
    if (info.size > MAX_FILE_BYTES) continue;

    const content = await readFile(fullPath, "utf8");
    files.push({
      path: path.relative(base, fullPath).replace(/\\/g, "/"),
      content,
    });
    budget.count++;
  }
}

export async function collectRepositorySnapshot(
  cloneDir: string,
  cloneUrl: string
): Promise<Omit<GitRepositorySnapshot, "repositoryUrl">> {
  const files: RepoSourceFile[] = [];
  await walkSourceFiles(cloneDir, cloneDir, files, { count: 0 });

  let gitignoreContent: string | null = null;
  try {
    gitignoreContent = await readFile(path.join(cloneDir, ".gitignore"), "utf8");
  } catch {
    gitignoreContent = null;
  }

  return {
    cloneUrl,
    filesScanned: files.length,
    files,
    gitignoreContent,
  };
}

export async function cloneGitRepository(
  repositoryUrl: string
): Promise<{ cloneDir: string; cloneUrl: string }> {
  const cloneUrl = normalizeGitRepositoryUrl(repositoryUrl);
  const cloneDir = await mkdtemp(path.join(os.tmpdir(), "sfw-git-"));

  try {
    await execFileAsync("git", ["clone", "--depth", "1", "--quiet", cloneUrl, cloneDir], {
      timeout: CLONE_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { cloneDir, cloneUrl };
  } catch (err) {
    await rm(cloneDir, { recursive: true, force: true });
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    if (/not found|404|repository.*not found/i.test(msg)) {
      throw new Error(
        `Repositório não encontrado ou inacessível (${cloneUrl}). Verifique se a URL está correta, se o repositório é público e se não há texto duplicado no campo.`
      );
    }
    throw new Error(`Falha ao clonar repositório (${cloneUrl}): ${msg}`);
  }
}

export async function fetchGitRepositorySnapshot(repositoryUrl: string): Promise<GitRepositorySnapshot> {
  const { cloneDir, cloneUrl } = await cloneGitRepository(repositoryUrl);
  try {
    const partial = await collectRepositorySnapshot(cloneDir, cloneUrl);
    return {
      repositoryUrl,
      ...partial,
    };
  } finally {
    await rm(cloneDir, { recursive: true, force: true });
  }
}

function buildScanContext(snapshot: GitRepositorySnapshot): ScanContext {
  return {
    files: snapshot.files,
    corpus: snapshot.files.map((f) => `// ${f.path}\n${f.content}`).join("\n\n"),
    gitignoreContent: snapshot.gitignoreContent,
  };
}

function findEvidence(pattern: RegExp, ctx: ScanContext, title?: string): string | null {
  return findCodeArtifact(pattern, ctx.files, title).evidence;
}

function countMatches(pattern: RegExp, ctx: ScanContext): number {
  return (ctx.corpus.match(new RegExp(pattern.source, "g")) ?? []).length;
}

function result(
  compliance: ComplianceValue,
  confidence: number,
  evidence: string,
  rationale: string,
  artifacts?: AssessmentEvidenceArtifact[]
): AssessmentResult {
  return { compliance, confidence, evidence, rationale, source: "auto", artifacts };
}

function enrichGitAssessment(
  snapshot: GitRepositorySnapshot,
  itemCode: string,
  assessed: AssessmentResult
): AssessmentResult {
  const ctx = buildScanContext(snapshot);
  const pattern = ITEM_CODE_EVIDENCE_PATTERNS[itemCode];
  const { artifact } = pattern
    ? findCodeArtifact(pattern, ctx.files, `Evidência de código — ${itemCode}`)
    : { artifact: null };

  const artifacts = mergeArtifacts(
    [buildGitScanSummaryArtifact(snapshot)],
    artifact ? [artifact] : [buildTextArtifact("Resultado da análise estática", assessed.evidence)]
  );

  return { ...assessed, artifacts };
}

function assessGitItem(code: GitAssessmentItemCode, ctx: ScanContext): AssessmentResult {
  switch (code) {
    case "AUTH-01": {
      const strong =
        /isPasswordValid|checkPasswordCriteria|PASSWORD_RULES|password.*min\(8\)|hasUpper|hasLower|hasSpecial/i.test(
          ctx.corpus
        );
      const weakOnly = /password.*min\(\d\)|length\s*>=\s*8/i.test(ctx.corpus);
      const evidence = findEvidence(/isPasswordValid|PASSWORD_RULES|password.*min\(8\)/i, ctx);
      if (strong) {
        return result(
          "conforme",
          88,
          evidence ?? "Política de senha com complexidade detectada no código.",
          "Encontrados critérios de senha forte (comprimento + complexidade)."
        );
      }
      if (weakOnly) {
        return result(
          "parcial",
          72,
          evidence ?? "Validação mínima de senha detectada.",
          "Há validação de senha, mas sem todos os critérios de complexidade."
        );
      }
      return result(
        "nao_conforme",
        70,
        "Nenhum padrão de política de senha (Joi/Zod/regras) encontrado nos arquivos analisados.",
        "Não foi detectada exigência de complexidade de senha no código."
      );
    }
    case "AUTH-02": {
      const bcrypt = /bcrypt\.hash|bcryptjs\.hash|argon2|scrypt/i.test(ctx.corpus);
      const evidence = findEvidence(/bcrypt\.hash|bcryptjs\.hash|argon2/i, ctx);
      if (bcrypt) {
        return result(
          "conforme",
          90,
          evidence ?? "Uso de hash forte (bcrypt/argon2) detectado.",
          "Senhas parecem ser armazenadas com algoritmo de hash adequado."
        );
      }
      const plain = /password\s*===|password\s*==|plain.?text.?password/i.test(ctx.corpus);
      if (plain) {
        return result(
          "nao_conforme",
          85,
          findEvidence(/password\s*===|plain.?text/i, ctx) ?? "Comparação de senha em texto plano detectada.",
          "Possível armazenamento ou comparação de senha sem hash."
        );
      }
      return result(
        "nao_conforme",
        68,
        "Nenhum uso de bcrypt/argon2/scrypt encontrado nos arquivos analisados.",
        "Hash de senha forte não identificado no repositório."
      );
    }
    case "AUTH-03": {
      const rateLimit = /rateLimit|rate-limit|express-rate-limit|slowDown|limiter/i.test(ctx.corpus);
      const evidence = findEvidence(/rateLimit|rate-limit|express-rate-limit/i, ctx);
      if (rateLimit) {
        return result(
          "conforme",
          84,
          evidence ?? "Rate limiting detectado no código.",
          "Há indícios de proteção contra força bruta / rate limiting."
        );
      }
      return result(
        "nao_conforme",
        72,
        "Nenhum middleware de rate limiting encontrado.",
        "Não foram detectados limites de tentativas em endpoints de autenticação."
      );
    }
    case "AUTH-04": {
      const session =
        /maxAge|expiresIn|session.*expir|cookie.*maxAge|jwt.*exp|token.*ttl/i.test(ctx.corpus);
      const evidence = findEvidence(/maxAge|expiresIn|session.*expir/i, ctx);
      if (session) {
        return result(
          "conforme",
          80,
          evidence ?? "Configuração de expiração de sessão/token detectada.",
          "Encontrada configuração de expiração de sessão ou token."
        );
      }
      return result(
        "nao_conforme",
        65,
        "Nenhuma configuração explícita de expiração de sessão encontrada.",
        "Timeout de sessão ou expiração de token não identificados."
      );
    }
    case "AUTHZ-01": {
      const rbac =
        /adminProcedure|protectedProcedure|role\s*===|requireRole|authorize|checkPermission|RBAC|user\.role/i.test(
          ctx.corpus
        );
      const evidence = findEvidence(/adminProcedure|protectedProcedure|role\s*===|requireRole/i, ctx);
      if (rbac) {
        return result(
          "conforme",
          82,
          evidence ?? "Verificações de papel/permissão detectadas.",
          "O código contém verificações de autorização (RBAC ou equivalente)."
        );
      }
      return result(
        "nao_conforme",
        70,
        "Nenhum padrão RBAC/autorização por perfil encontrado.",
        "Não foram detectadas verificações de papel em rotas ou recursos."
      );
    }
    case "AUTHZ-02": {
      const roles = countMatches(/role\s*===\s*['"][^'"]+['"]|enum.*role|user\.role/i, ctx);
      if (roles >= 2) {
        return result(
          "parcial",
          68,
          `Múltiplas verificações de papel detectadas (${roles} ocorrências).`,
          "Há distinção de papéis, mas o menor privilégio exige revisão manual."
        );
      }
      if (roles === 1) {
        return result(
          "parcial",
          62,
          findEvidence(/role\s*===/i, ctx) ?? "Papel único detectado.",
          "Poucas verificações de privilégio — revisar manualmente."
        );
      }
      return result(
        "nao_conforme",
        60,
        "Nenhuma distinção de papéis/permissões encontrada.",
        "Princípio do menor privilégio não pôde ser confirmado automaticamente."
      );
    }
    case "AUTHZ-03": {
      const adminProtected =
        /adminProcedure|\/admin.*protected|role\s*===\s*['"]admin['"]|FORBIDDEN.*admin/i.test(ctx.corpus);
      const evidence = findEvidence(/adminProcedure|role\s*===\s*['"]admin['"]/i, ctx);
      if (adminProtected) {
        return result(
          "conforme",
          86,
          evidence ?? "Rotas/admin protegidos por papel detectados.",
          "Painel ou rotas administrativas parecem exigir autorização."
        );
      }
      const hasAdminRoute = /\/admin|path.*admin/i.test(ctx.corpus);
      if (hasAdminRoute) {
        return result(
          "parcial",
          70,
          "Rotas /admin referenciadas, mas proteção explícita não confirmada.",
          "Revisar manualmente se todas as rotas admin exigem autenticação + papel."
        );
      }
      return result(
        "nao_aplicavel",
        55,
        "Nenhuma rota administrativa identificada no código analisado.",
        "Item pode não se aplicar a esta aplicação ou rotas admin estão em outro serviço."
      );
    }
    case "INPUT-01": {
      const validation = /validateJoi|Joi\.object|z\.object|zod|yup\.object|class-validator/i.test(ctx.corpus);
      const evidence = findEvidence(/validateJoi|Joi\.object|z\.object/i, ctx);
      if (validation) {
        return result(
          "conforme",
          85,
          evidence ?? "Validação server-side com schema detectada.",
          "Inputs parecem ser validados no servidor (Joi/Zod ou similar)."
        );
      }
      return result(
        "nao_conforme",
        72,
        "Nenhuma biblioteca de validação server-side (Joi/Zod) encontrada.",
        "Validação apenas no cliente ou ausente no backend."
      );
    }
    case "INPUT-02": {
      const orm = /drizzle|prisma|knex|typeorm|sequelize|sql\.`|\.prepare\(/i.test(ctx.corpus);
      const sqlConcat = /\$\{.*\}.*SELECT|SELECT.*\+.*req\.|query\s*=\s*['"].*\+/i.test(ctx.corpus);
      const evidence = findEvidence(/drizzle|prisma|knex|\.prepare\(/i, ctx);
      if (orm && !sqlConcat) {
        return result(
          "conforme",
          83,
          evidence ?? "ORM/query parametrizada detectada.",
          "Consultas parecem usar ORM ou prepared statements."
        );
      }
      if (sqlConcat) {
        return result(
          "nao_conforme",
          88,
          findEvidence(/SELECT.*\+|query\s*=\s*['"].*\+/i, ctx) ?? "Possível concatenação SQL detectada.",
          "Risco de SQL Injection por concatenação de strings."
        );
      }
      return result(
        "parcial",
        60,
        "ORM não identificado claramente — revisar queries manualmente.",
        "Não foi possível confirmar parametrização em todas as consultas."
      );
    }
    case "INPUT-03": {
      const xss = /helmet|sanitize|escapeHtml|DOMPurify|xss|encodeURIComponent/i.test(ctx.corpus);
      const evidence = findEvidence(/helmet|sanitize|DOMPurify/i, ctx);
      if (xss) {
        return result(
          "parcial",
          75,
          evidence ?? "Controles anti-XSS parciais detectados.",
          "Há indícios de sanitização/headers; confirmar cobertura em todas as saídas HTML."
        );
      }
      return result(
        "nao_conforme",
        68,
        "Nenhum controle anti-XSS (helmet/sanitize) encontrado.",
        "Sanitização ou escape de saída não identificados."
      );
    }
    case "SECRET-01": {
      const envUse = /process\.env|dotenv|config\(\)|ENV\./i.test(ctx.corpus);
      const hardcoded = /(?:api[_-]?key|secret|password)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(ctx.corpus);
      const evidence = findEvidence(/process\.env\.[A-Z0-9_]+/i, ctx);
      if (envUse && !hardcoded) {
        return result(
          "conforme",
          80,
          evidence ?? "Uso de variáveis de ambiente para configuração.",
          "Segredos parecem ser carregados via ambiente, sem literals óbvios."
        );
      }
      if (hardcoded) {
        return result(
          "nao_conforme",
          85,
          findEvidence(/(?:api[_-]?key|secret|password)\s*[:=]\s*['"]/i, ctx) ?? "Literal sensível no código.",
          "Possível segredo hardcoded detectado — mover para variáveis de ambiente."
        );
      }
      return result(
        "parcial",
        58,
        "Padrão process.env não encontrado claramente.",
        "Revisar manualmente onde JWT secrets e credenciais são definidos."
      );
    }
    case "SECRET-02": {
      const gitignore = ctx.gitignoreContent ?? "";
      const ignoresEnv = /\.env\b|\.env\./i.test(gitignore);
      const secretInRepo = /(?:api[_-]?key|password|secret)\s*=\s*[^\s#]+/i.test(
        ctx.files
          .filter((f) => !f.path.endsWith(".env.example") && !f.path.includes("test"))
          .map((f) => f.content)
          .join("\n")
      );
      if (ignoresEnv && !secretInRepo) {
        return result(
          "conforme",
          78,
          ".gitignore referencia .env e nenhum segredo óbvio foi encontrado nos fontes.",
          "Boas práticas básicas de exclusão de segredos no repositório."
        );
      }
      if (secretInRepo) {
        return result(
          "nao_conforme",
          82,
          "Possível segredo commitado detectado em arquivos de código.",
          "Execute varredura de segredos e rotacione credenciais expostas."
        );
      }
      return result(
        "parcial",
        65,
        ignoresEnv ? ".gitignore cobre .env, mas revisão manual ainda recomendada." : ".gitignore não referencia .env.",
        "Auditoria de segredos no histórico Git requer validação humana."
      );
    }
    case "ERROR-01": {
      const prodSafe =
        /NODE_ENV.*production|stack.*(?:hide|disable)|errorHandler|formatError|Generic.*error/i.test(ctx.corpus);
      const stackLeak = /stack:\s*err\.stack|res\.(?:send|json)\(.*stack/i.test(ctx.corpus);
      const evidence = findEvidence(/NODE_ENV.*production|errorHandler/i, ctx);
      if (prodSafe && !stackLeak) {
        return result(
          "conforme",
          76,
          evidence ?? "Tratamento de erro orientado a produção detectado.",
          "Indícios de ocultação de stack trace em produção."
        );
      }
      if (stackLeak) {
        return result(
          "nao_conforme",
          84,
          findEvidence(/stack:\s*err\.stack|res\.json\(.*stack/i, ctx) ?? "Stack trace exposto na resposta.",
          "Stack trace ou detalhes internos podem vazar ao cliente."
        );
      }
      return result(
        "parcial",
        62,
        "Handler de erro genérico não identificado claramente.",
        "Revisar respostas de erro em ambiente de produção."
      );
    }
    case "ERROR-02": {
      const generic = /message:\s*['"][^'"]+['"]|BAD_REQUEST|UNAUTHORIZED|toast\.error/i.test(ctx.corpus);
      const leak = /err\.message|error\.stack|sqlMessage/i.test(ctx.corpus);
      if (generic && !leak) {
        return result(
          "conforme",
          72,
          "Mensagens de erro estruturadas/genéricas detectadas.",
          "Respostas parecem usar mensagens controladas."
        );
      }
      return result(
        "parcial",
        60,
        "Revisar se mensagens expõem detalhes de banco ou stack.",
        "Validação manual recomendada para vazamento em mensagens de erro."
      );
    }
    default:
      throw new Error(`Código de item não suportado: ${code}`);
  }
}

export function assessGitRepositoryItems(
  snapshot: GitRepositorySnapshot,
  items: Array<{ id: number; code: string }>
): AutoAssessmentSuggestion[] {
  const codeSet = new Set<string>(GIT_ASSESSMENT_ITEM_CODES);
  const ctx = buildScanContext(snapshot);
  const suggestions: AutoAssessmentSuggestion[] = [];

  for (const item of items) {
    if (!codeSet.has(item.code)) continue;
    const assessed = assessGitItem(item.code as GitAssessmentItemCode, ctx);
    const enriched = enrichGitAssessment(snapshot, item.code, assessed);
    suggestions.push({
      itemId: item.id,
      itemCode: item.code,
      ...enriched,
    });
  }

  return suggestions;
}

export async function runGitRepositoryAssessment(
  repositoryUrl: string,
  items: Array<{ id: number; code: string }>
): Promise<{ snapshot: GitRepositorySnapshot; suggestions: AutoAssessmentSuggestion[] }> {
  const snapshot = await fetchGitRepositorySnapshot(repositoryUrl);
  if (snapshot.filesScanned === 0) {
    throw new Error("Nenhum arquivo de código reconhecido encontrado no repositório clonado");
  }
  const suggestions = assessGitRepositoryItems(snapshot, items);
  return { snapshot, suggestions };
}
