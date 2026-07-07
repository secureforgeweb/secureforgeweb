import type { ComplianceValue } from "../models/analyses.db.js";
import type { AssessmentEvidenceArtifact } from "./assessmentEvidence.js";
import {
  buildHttpHeadersArtifact,
  buildHttpScanSummaryArtifact,
  mergeArtifacts,
} from "./assessmentEvidence.js";

export type { AssessmentEvidenceArtifact };

/** Itens avaliáveis via HTTP na Fase 6A (headers + HTTPS). */
export const HTTP_ASSESSMENT_ITEM_CODES = [
  "HEADER-01",
  "HEADER-02",
  "HEADER-03",
  "HEADER-04",
  "DATA-01",
] as const;

export type HttpAssessmentItemCode = (typeof HTTP_ASSESSMENT_ITEM_CODES)[number];

export type AutoAssessmentSuggestion = {
  itemId: number;
  itemCode: string;
  compliance: ComplianceValue;
  confidence: number;
  evidence: string;
  rationale: string;
  source: "auto" | "ai";
  artifacts?: AssessmentEvidenceArtifact[];
};

export type HttpSecuritySnapshot = {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  headers: Record<string, string>;
};

const ASSESSOR_USER_AGENT = "SecureForge-Web-Assessor/1.0";
const FETCH_TIMEOUT_MS = 12_000;

function headerValue(headers: Record<string, string>, name: string): string | undefined {
  return headers[name.toLowerCase()];
}

export function normalizeAssessmentUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("URL base não informada");
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("URL base inválida");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("A URL deve usar HTTP ou HTTPS");
  }
  return url.toString();
}

export async function fetchHttpSecuritySnapshot(baseUrl: string): Promise<HttpSecuritySnapshot> {
  const requestedUrl = normalizeAssessmentUrl(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(requestedUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": ASSESSOR_USER_AGENT,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    return {
      requestedUrl,
      finalUrl: response.url || requestedUrl,
      statusCode: response.status,
      headers,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Tempo esgotado ao consultar a URL da aplicação");
    }
    throw new Error(
      err instanceof Error
        ? `Não foi possível acessar a URL: ${err.message}`
        : "Não foi possível acessar a URL da aplicação"
    );
  } finally {
    clearTimeout(timeout);
  }
}

type HttpAssessmentResult = Omit<AutoAssessmentSuggestion, "itemId" | "itemCode">;

function withHttpArtifacts(
  code: HttpAssessmentItemCode,
  snapshot: HttpSecuritySnapshot,
  base: Omit<HttpAssessmentResult, "artifacts">
): HttpAssessmentResult {
  const highlight =
    code === "HEADER-01"
      ? ["content-security-policy"]
      : code === "HEADER-02"
        ? ["strict-transport-security"]
        : code === "HEADER-03"
          ? ["x-frame-options", "content-security-policy"]
          : code === "HEADER-04"
            ? ["x-content-type-options"]
            : code === "DATA-01"
              ? []
              : [];

  const artifacts = mergeArtifacts(
    [buildHttpScanSummaryArtifact(snapshot)],
    highlight.length ? [buildHttpHeadersArtifact(snapshot, highlight)] : undefined
  );

  return { ...base, artifacts };
}

function assessSingleItem(
  code: HttpAssessmentItemCode,
  snapshot: HttpSecuritySnapshot
): HttpAssessmentResult {
  const finalProtocol = new URL(snapshot.finalUrl).protocol;
  const isHttps = finalProtocol === "https:";

  switch (code) {
    case "DATA-01": {
      if (isHttps) {
        return withHttpArtifacts(code, snapshot, {
          compliance: "conforme",
          confidence: 98,
          evidence: `Resposta final via HTTPS (${snapshot.finalUrl}, HTTP ${snapshot.statusCode}).`,
          rationale: "A aplicação respondeu em conexão HTTPS.",
          source: "auto",
        });
      }
      return withHttpArtifacts(code, snapshot, {
        compliance: "nao_conforme",
        confidence: 98,
        evidence: `Resposta final via HTTP (${snapshot.finalUrl}, HTTP ${snapshot.statusCode}).`,
        rationale: "Dados sensíveis devem trafegar exclusivamente via HTTPS.",
        source: "auto",
      });
    }
    case "HEADER-01": {
      const csp = headerValue(snapshot.headers, "content-security-policy");
      if (csp?.trim()) {
        return withHttpArtifacts(code, snapshot, {
          compliance: "conforme",
          confidence: 92,
          evidence: `Content-Security-Policy: ${csp.slice(0, 240)}${csp.length > 240 ? "…" : ""}`,
          rationale: "Header CSP presente na resposta HTTP.",
          source: "auto",
        });
      }
      return withHttpArtifacts(code, snapshot, {
        compliance: "nao_conforme",
        confidence: 90,
        evidence: `Header Content-Security-Policy ausente (${snapshot.finalUrl}).`,
        rationale: "Nenhum CSP foi detectado na resposta analisada.",
        source: "auto",
      });
    }
    case "HEADER-02": {
      const hsts = headerValue(snapshot.headers, "strict-transport-security");
      if (!isHttps) {
        return withHttpArtifacts(code, snapshot, {
          compliance: "nao_conforme",
          confidence: 95,
          evidence: `Conexão final em HTTP (${snapshot.finalUrl}). HSTS exige HTTPS.`,
          rationale: "Strict-Transport-Security não se aplica sem HTTPS ativo.",
          source: "auto",
        });
      }
      if (hsts?.trim()) {
        return withHttpArtifacts(code, snapshot, {
          compliance: "conforme",
          confidence: 92,
          evidence: `Strict-Transport-Security: ${hsts}`,
          rationale: "Header HSTS detectado na resposta HTTPS.",
          source: "auto",
        });
      }
      return withHttpArtifacts(code, snapshot, {
        compliance: "nao_conforme",
        confidence: 90,
        evidence: `Strict-Transport-Security ausente em ${snapshot.finalUrl}.`,
        rationale: "Resposta HTTPS sem header HSTS.",
        source: "auto",
      });
    }
    case "HEADER-03": {
      const xfo = headerValue(snapshot.headers, "x-frame-options");
      const csp = headerValue(snapshot.headers, "content-security-policy") ?? "";
      const hasFrameAncestors = /frame-ancestors/i.test(csp);
      if (xfo?.trim() || hasFrameAncestors) {
        const parts = [
          xfo?.trim() ? `X-Frame-Options: ${xfo}` : null,
          hasFrameAncestors ? "CSP contém frame-ancestors" : null,
        ].filter(Boolean);
        return withHttpArtifacts(code, snapshot, {
          compliance: "conforme",
          confidence: 90,
          evidence: parts.join(" · "),
          rationale: "Proteção anti-clickjacking detectada (X-Frame-Options ou CSP frame-ancestors).",
          source: "auto",
        });
      }
      return withHttpArtifacts(code, snapshot, {
        compliance: "nao_conforme",
        confidence: 88,
        evidence: `X-Frame-Options e frame-ancestors ausentes (${snapshot.finalUrl}).`,
        rationale: "Nenhuma proteção contra clickjacking foi encontrada nos headers.",
        source: "auto",
      });
    }
    case "HEADER-04": {
      const nosniff = headerValue(snapshot.headers, "x-content-type-options");
      if (nosniff?.toLowerCase().includes("nosniff")) {
        return withHttpArtifacts(code, snapshot, {
          compliance: "conforme",
          confidence: 92,
          evidence: `X-Content-Type-Options: ${nosniff}`,
          rationale: "Header nosniff presente.",
          source: "auto",
        });
      }
      return withHttpArtifacts(code, snapshot, {
        compliance: "nao_conforme",
        confidence: 90,
        evidence: `X-Content-Type-Options ausente ou inválido (${snapshot.finalUrl}).`,
        rationale: "MIME sniffing não está bloqueado via header nosniff.",
        source: "auto",
      });
    }
    default:
      throw new Error(`Código de item não suportado: ${code}`);
  }
}

export function assessHttpSecurityItems(
  snapshot: HttpSecuritySnapshot,
  items: Array<{ id: number; code: string }>
): AutoAssessmentSuggestion[] {
  const codeSet = new Set<string>(HTTP_ASSESSMENT_ITEM_CODES);
  const suggestions: AutoAssessmentSuggestion[] = [];

  for (const item of items) {
    if (!codeSet.has(item.code)) continue;
    const result = assessSingleItem(item.code as HttpAssessmentItemCode, snapshot);
    suggestions.push({
      itemId: item.id,
      itemCode: item.code,
      ...result,
    });
  }

  return suggestions;
}

export async function runHttpHeaderAssessment(
  baseUrl: string,
  items: Array<{ id: number; code: string }>
): Promise<{ snapshot: HttpSecuritySnapshot; suggestions: AutoAssessmentSuggestion[] }> {
  const snapshot = await fetchHttpSecuritySnapshot(baseUrl);
  const suggestions = assessHttpSecurityItems(snapshot, items);
  return { snapshot, suggestions };
}
