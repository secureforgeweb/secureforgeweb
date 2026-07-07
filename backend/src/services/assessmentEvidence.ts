import type { HttpSecuritySnapshot } from "./checklistAssessor.js";
import type { GitRepositorySnapshot } from "./gitRepoAssessor.js";

export type AssessmentEvidenceArtifact = {
  kind: "code" | "http_headers" | "scan_summary" | "text";
  title: string;
  content: string;
  language?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
};

const SECURITY_HEADER_NAMES = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
] as const;

export const ITEM_CODE_EVIDENCE_PATTERNS: Record<string, RegExp> = {
  "AUTH-01": /isPasswordValid|PASSWORD_RULES|password.*min\(8\)|checkPasswordCriteria/i,
  "AUTH-02": /bcrypt\.hash|bcryptjs\.hash|argon2|scrypt/i,
  "AUTH-03": /rateLimit|rate-limit|express-rate-limit|slowDown/i,
  "AUTH-04": /maxAge|expiresIn|session.*expir|jwt.*exp/i,
  "AUTHZ-01": /adminProcedure|protectedProcedure|requireRole|checkPermission/i,
  "AUTHZ-02": /role\s*===\s*['"][^'"]+['"]/i,
  "AUTHZ-03": /adminProcedure|role\s*===\s*['"]admin['"]/i,
  "INPUT-01": /validateJoi|Joi\.object|z\.object|zod/i,
  "INPUT-02": /drizzle|prisma|knex|\.prepare\(/i,
  "INPUT-03": /helmet|sanitize|DOMPurify|escapeHtml/i,
  "SECRET-01": /process\.env\.[A-Z0-9_]+/i,
  "SECRET-02": /\.env\b/i,
  "ERROR-01": /errorHandler|NODE_ENV.*production/i,
  "ERROR-02": /BAD_REQUEST|UNAUTHORIZED|toast\.error/i,
  "HEADER-01": /content-security-policy/i,
  "HEADER-02": /strict-transport-security/i,
  "HEADER-03": /x-frame-options|frame-ancestors/i,
  "HEADER-04": /x-content-type-options/i,
  "DATA-01": /https:\/\//i,
  "DATA-02": /redact|sanitize.*log|pino.*redact/i,
  "SURF-01": /\/debug|phpinfo|0\.0\.0\.0/i,
  "SURF-02": /npm audit|vulnerabilit/i,
};

function inferLanguage(filePath: string): string | undefined {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    go: "go",
    java: "java",
    rb: "ruby",
    php: "php",
    rs: "rust",
  };
  return ext ? map[ext] : undefined;
}

export function findCodeArtifact(
  pattern: RegExp,
  files: Array<{ path: string; content: string }>,
  title = "Trecho de código detectado",
  contextLines = 6
): { evidence: string | null; artifact: AssessmentEvidenceArtifact | null } {
  for (const file of files) {
    const match = file.content.match(pattern);
    if (!match || match.index === undefined) continue;

    const lines = file.content.split(/\r?\n/);
    let charCount = 0;
    let matchLine = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = charCount + lines[i].length + 1;
      if (match.index < lineEnd) {
        matchLine = i;
        break;
      }
      charCount = lineEnd;
    }

    const startLine = Math.max(0, matchLine - contextLines);
    const endLine = Math.min(lines.length - 1, matchLine + contextLines);
    const snippet = lines.slice(startLine, endLine + 1);
    const numbered = snippet
      .map((line, idx) => {
        const lineNo = startLine + idx + 1;
        const marker = lineNo - 1 === matchLine ? ">" : " ";
        return `${marker} ${String(lineNo).padStart(4)} │ ${line}`;
      })
      .join("\n");

    return {
      evidence: `${file.path}:${matchLine + 1}`,
      artifact: {
        kind: "code",
        title,
        content: numbered,
        language: inferLanguage(file.path),
        filePath: file.path,
        lineStart: startLine + 1,
        lineEnd: endLine + 1,
      },
    };
  }
  return { evidence: null, artifact: null };
}

export function buildHttpScanSummaryArtifact(snapshot: HttpSecuritySnapshot): AssessmentEvidenceArtifact {
  const protocol = new URL(snapshot.finalUrl).protocol;
  return {
    kind: "scan_summary",
    title: "Resumo da varredura HTTP",
    content: [
      `URL solicitada: ${snapshot.requestedUrl}`,
      `URL final:      ${snapshot.finalUrl}`,
      `Status HTTP:    ${snapshot.statusCode}`,
      `Protocolo:      ${protocol}`,
      `Headers lidos:  ${Object.keys(snapshot.headers).length}`,
    ].join("\n"),
  };
}

export function buildHttpHeadersArtifact(
  snapshot: HttpSecuritySnapshot,
  highlight: string[] = [...SECURITY_HEADER_NAMES]
): AssessmentEvidenceArtifact {
  const rows = highlight.map((name) => {
    const value = snapshot.headers[name.toLowerCase()];
    const status = value?.trim() ? "presente" : "ausente";
    const display = value?.trim() ? value.slice(0, 120) + (value.length > 120 ? "…" : "") : "—";
    return `${name.padEnd(32)} [${status}]\n  ${display}`;
  });

  return {
    kind: "http_headers",
    title: `Headers de segurança — ${snapshot.finalUrl}`,
    content: rows.join("\n\n"),
  };
}

export function buildGitScanSummaryArtifact(snapshot: GitRepositorySnapshot): AssessmentEvidenceArtifact {
  const samplePaths = snapshot.files
    .slice(0, 12)
    .map((f) => `  • ${f.path}`)
    .join("\n");
  const more =
    snapshot.files.length > 12 ? `\n  … e mais ${snapshot.files.length - 12} arquivo(s)` : "";

  return {
    kind: "scan_summary",
    title: "Resumo da varredura Git",
    content: [
      `Repositório: ${snapshot.repositoryUrl}`,
      `Arquivos analisados: ${snapshot.filesScanned}`,
      "",
      "Amostra de arquivos:",
      samplePaths + more,
      "",
      snapshot.gitignoreContent
        ? ".gitignore encontrado (trecho):"
        : ".gitignore não encontrado na raiz.",
      snapshot.gitignoreContent ? snapshot.gitignoreContent.slice(0, 400) : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function buildTextArtifact(title: string, content: string): AssessmentEvidenceArtifact {
  return { kind: "text", title, content };
}

export function mergeArtifacts(
  ...groups: Array<AssessmentEvidenceArtifact[] | undefined>
): AssessmentEvidenceArtifact[] {
  const seen = new Set<string>();
  const out: AssessmentEvidenceArtifact[] = [];
  for (const group of groups) {
    if (!group) continue;
    for (const artifact of group) {
      const key = `${artifact.kind}:${artifact.title}:${artifact.content.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(artifact);
    }
  }
  return out;
}

export function enrichSuggestionArtifacts(input: {
  itemCode: string;
  evidence: string;
  rationale: string;
  artifacts?: AssessmentEvidenceArtifact[];
  gitSnapshot?: GitRepositorySnapshot | null;
  httpSnapshot?: HttpSecuritySnapshot | null;
  npmAuditSummary?: { critical: number; high: number; moderate: number; low: number } | null;
}): AssessmentEvidenceArtifact[] {
  const artifacts = [...(input.artifacts ?? [])];

  const pattern = ITEM_CODE_EVIDENCE_PATTERNS[input.itemCode];
  if (input.gitSnapshot?.files.length && pattern) {
    const { artifact } = findCodeArtifact(
      pattern,
      input.gitSnapshot.files,
      `Evidência de código — ${input.itemCode}`
    );
    if (artifact) artifacts.push(artifact);
  }

  if (input.httpSnapshot && input.itemCode.startsWith("HEADER-")) {
    artifacts.push(buildHttpScanSummaryArtifact(input.httpSnapshot));
    artifacts.push(buildHttpHeadersArtifact(input.httpSnapshot));
  }

  if (input.itemCode === "DATA-01" && input.httpSnapshot) {
    artifacts.push(buildHttpScanSummaryArtifact(input.httpSnapshot));
  }

  if (input.itemCode === "SURF-02" && input.npmAuditSummary) {
    const a = input.npmAuditSummary;
    artifacts.push(
      buildTextArtifact(
        "Resultado npm audit",
        [
          `Críticas:  ${a.critical}`,
          `Altas:     ${a.high}`,
          `Moderadas: ${a.moderate}`,
          `Baixas:    ${a.low}`,
        ].join("\n")
      )
    );
  }

  if (artifacts.length === 0) {
    artifacts.push(
      buildTextArtifact("Análise automática", `${input.evidence}\n\n${input.rationale}`)
    );
  }

  return mergeArtifacts(artifacts);
}
