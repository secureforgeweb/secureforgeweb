import type { ComplianceValue } from "../models/analyses.db.js";
import type { AssessmentEvidenceArtifact } from "./assessmentEvidence.js";
import {
  buildHttpHeadersArtifact,
  buildHttpScanSummaryArtifact,
  mergeArtifacts,
} from "./assessmentEvidence.js";
import https from "node:https";
import http from "node:http";

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
  let requestedUrl = normalizeAssessmentUrl(baseUrl);
  let primary: HttpSecuritySnapshot;
  try {
    primary = await fetchOnce(requestedUrl);
  } catch (err) {
    // Local demo often switches to HTTPS (mkcert) while the app is still registered as http://
    try {
      const u = new URL(requestedUrl);
      const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
      if (u.protocol === "http:" && isLocal) {
        u.protocol = "https:";
        requestedUrl = u.toString();
        primary = await fetchOnce(requestedUrl);
      } else {
        throw err;
      }
    } catch {
      throw err;
    }
  }

  // When the app UI is on Vite (:5173), security headers live on the API (:3000).
  // Probe /api/health on the sibling API port and merge header evidence for HEADER-*.
  const mergedHeaders = { ...primary.headers };
  try {
    const u = new URL(primary.finalUrl || requestedUrl);
    const isVitePort = u.port === "5173" || u.port === "5174" || u.port === "4173";
    if (isVitePort) {
      const apiUrl = new URL(u.toString());
      apiUrl.protocol = "https:";
      apiUrl.port = process.env.PORT?.trim() || "3000";
      apiUrl.pathname = "/api/health";
      apiUrl.search = "";
      apiUrl.hash = "";
      try {
        const apiSnap = await fetchOnce(apiUrl.toString());
        for (const [k, v] of Object.entries(apiSnap.headers)) {
          if (!mergedHeaders[k]?.trim() && v?.trim()) mergedHeaders[k] = v;
        }
        for (const name of [
          "content-security-policy",
          "strict-transport-security",
          "x-frame-options",
          "x-content-type-options",
        ]) {
          if (apiSnap.headers[name]?.trim()) mergedHeaders[name] = apiSnap.headers[name];
        }
      } catch {
        // If HTTPS API probe fails, try HTTP (mixed local setups).
        apiUrl.protocol = "http:";
        const apiSnap = await fetchOnce(apiUrl.toString());
        for (const name of [
          "content-security-policy",
          "strict-transport-security",
          "x-frame-options",
          "x-content-type-options",
        ]) {
          if (apiSnap.headers[name]?.trim()) mergedHeaders[name] = apiSnap.headers[name];
        }
      }
    }
  } catch {
    // Keep primary snapshot if API probe fails.
  }

  return { ...primary, headers: mergedHeaders };
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

/** Prefer 127.0.0.1 over localhost to avoid IPv6 (::1) resolution issues on Windows. */
function preferIpv4Localhost(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "localhost") {
      u.hostname = "127.0.0.1";
      return u.toString();
    }
  } catch {
    // keep original
  }
  return url;
}

function fetchOnceWithNodeHttp(requestedUrl: string, timeoutMs: number): Promise<HttpSecuritySnapshot> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(preferIpv4Localhost(requestedUrl));
    } catch {
      reject(new Error("URL base inválida"));
      return;
    }

    const lib = parsed.protocol === "https:" ? https : http;
    const originalHost = new URL(requestedUrl).hostname;
    const req = lib.request(
      parsed,
      {
        method: "GET",
        headers: {
          "User-Agent": ASSESSOR_USER_AGENT,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          Host: new URL(requestedUrl).host,
        },
        timeout: timeoutMs,
        rejectUnauthorized: false,
        // SNI: cert is issued for localhost even when we connect via 127.0.0.1
        servername: originalHost === "127.0.0.1" ? "localhost" : originalHost,
      },
      (res) => {
        // Follow one redirect (common for trailing slash / http→https).
        const location = res.headers.location;
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          typeof location === "string" &&
          location.length > 0
        ) {
          res.resume();
          const next = new URL(location, parsed).toString();
          fetchOnceWithNodeHttp(next, timeoutMs).then(resolve, reject);
          return;
        }

        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (typeof value === "string") headers[key.toLowerCase()] = value;
          else if (Array.isArray(value) && value[0]) headers[key.toLowerCase()] = value.join(", ");
        }

        res.resume();
        resolve({
          requestedUrl,
          finalUrl: parsed.toString(),
          statusCode: res.statusCode ?? 0,
          headers,
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Tempo esgotado ao consultar a URL da aplicação"));
    });
    req.on("error", (err) => {
      reject(new Error(`Não foi possível acessar a URL: ${err.message}`));
    });
    req.end();
  });
}

async function fetchOnce(requestedUrl: string): Promise<HttpSecuritySnapshot> {
  const host = (() => {
    try {
      return new URL(requestedUrl).hostname;
    } catch {
      return "";
    }
  })();

  // Local HTTPS (mkcert): Node's global fetch rejects self-signed certs, and
  // `undici` may be unavailable under pnpm — use node:https with trust disabled.
  if (requestedUrl.startsWith("https:") && isLocalHostname(host)) {
    return fetchOnceWithNodeHttp(requestedUrl, FETCH_TIMEOUT_MS);
  }

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
    if (isLocalHostname(host)) {
      return fetchOnceWithNodeHttp(requestedUrl, FETCH_TIMEOUT_MS);
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
      const requestedHttps = (() => {
        try {
          return new URL(snapshot.requestedUrl).protocol === "https:";
        } catch {
          return false;
        }
      })();
      if (isHttps || requestedHttps) {
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
