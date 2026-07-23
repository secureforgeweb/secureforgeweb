import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  assessHttpSecurityItems,
  fetchHttpSecuritySnapshot,
  normalizeAssessmentUrl,
  HTTP_ASSESSMENT_ITEM_CODES,
} from "../services/checklistAssessor.js";

const mockItems = [
  { id: 1, code: "HEADER-01" },
  { id: 2, code: "HEADER-02" },
  { id: 3, code: "HEADER-03" },
  { id: 4, code: "HEADER-04" },
  { id: 5, code: "DATA-01" },
];

describe("checklistAssessor — normalizeAssessmentUrl", () => {
  it("adiciona https quando protocolo ausente", () => {
    expect(normalizeAssessmentUrl("example.com")).toBe("https://example.com/");
  });

  it("rejeita URL vazia", () => {
    expect(() => normalizeAssessmentUrl("   ")).toThrow("URL base não informada");
  });
});

describe("checklistAssessor — assessHttpSecurityItems", () => {
  it("marca HEADER-01 conforme quando CSP presente", () => {
    const snapshot = {
      requestedUrl: "https://app.test/",
      finalUrl: "https://app.test/",
      statusCode: 200,
      headers: {
        "content-security-policy": "default-src 'self'",
      },
    };
    const result = assessHttpSecurityItems(snapshot, mockItems);
    const csp = result.find((r) => r.itemCode === "HEADER-01");
    expect(csp?.compliance).toBe("conforme");
    expect(csp?.confidence).toBeGreaterThanOrEqual(90);
  });

  it("marca HEADER-01 não conforme quando CSP ausente", () => {
    const snapshot = {
      requestedUrl: "https://app.test/",
      finalUrl: "https://app.test/",
      statusCode: 200,
      headers: {},
    };
    const result = assessHttpSecurityItems(snapshot, mockItems);
    expect(result.find((r) => r.itemCode === "HEADER-01")?.compliance).toBe("nao_conforme");
  });

  it("marca DATA-01 conforme em HTTPS", () => {
    const snapshot = {
      requestedUrl: "https://app.test/",
      finalUrl: "https://app.test/",
      statusCode: 200,
      headers: {},
    };
    const result = assessHttpSecurityItems(snapshot, mockItems);
    expect(result.find((r) => r.itemCode === "DATA-01")?.compliance).toBe("conforme");
  });

  it("marca DATA-01 não conforme em HTTP", () => {
    const snapshot = {
      requestedUrl: "http://app.test/",
      finalUrl: "http://app.test/",
      statusCode: 200,
      headers: {},
    };
    const result = assessHttpSecurityItems(snapshot, mockItems);
    expect(result.find((r) => r.itemCode === "DATA-01")?.compliance).toBe("nao_conforme");
  });

  it("HEADER-03 conforme com X-Frame-Options", () => {
    const snapshot = {
      requestedUrl: "https://app.test/",
      finalUrl: "https://app.test/",
      statusCode: 200,
      headers: { "x-frame-options": "DENY" },
    };
    const result = assessHttpSecurityItems(snapshot, mockItems);
    expect(result.find((r) => r.itemCode === "HEADER-03")?.compliance).toBe("conforme");
  });

  it("retorna apenas códigos suportados na Fase 6A", () => {
    const snapshot = {
      requestedUrl: "https://app.test/",
      finalUrl: "https://app.test/",
      statusCode: 200,
      headers: {},
    };
    const result = assessHttpSecurityItems(snapshot, [
      ...mockItems,
      { id: 99, code: "AUTH-01" },
    ]);
    expect(result).toHaveLength(HTTP_ASSESSMENT_ITEM_CODES.length);
    expect(result.every((r) => HTTP_ASSESSMENT_ITEM_CODES.includes(r.itemCode as never))).toBe(true);
  });
});

describe("checklistAssessor — fetchHttpSecuritySnapshot", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("<html></html>", {
          status: 200,
          headers: {
            "content-security-policy": "default-src 'self'",
            "strict-transport-security": "max-age=31536000",
            "x-frame-options": "DENY",
            "x-content-type-options": "nosniff",
          },
        })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("consulta URL e normaliza headers", async () => {
    const snapshot = await fetchHttpSecuritySnapshot("https://secure.test");
    expect(snapshot.statusCode).toBe(200);
    expect(snapshot.headers["content-security-policy"]).toBe("default-src 'self'");
    expect(assessHttpSecurityItems(snapshot, mockItems).every((s) => s.compliance === "conforme")).toBe(
      true
    );
  });

  it("quando URL é Vite (:5173), mescla headers de segurança da API (:3000)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes(":3000")) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
              "content-security-policy": "default-src 'self'",
              "strict-transport-security": "max-age=31536000",
              "x-frame-options": "SAMEORIGIN",
              "x-content-type-options": "nosniff",
            },
          });
        }
        return new Response("<html>vite</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      })
    );

    const snapshot = await fetchHttpSecuritySnapshot("https://localhost:5173");
    expect(snapshot.headers["content-security-policy"]).toBe("default-src 'self'");
    expect(snapshot.headers["strict-transport-security"]).toContain("max-age");
    expect(snapshot.headers["x-content-type-options"]).toBe("nosniff");
    const assessed = assessHttpSecurityItems(snapshot, mockItems);
    expect(assessed.find((s) => s.itemCode === "HEADER-01")?.compliance).toBe("conforme");
    expect(assessed.find((s) => s.itemCode === "DATA-01")?.compliance).toBe("conforme");
  });
});
