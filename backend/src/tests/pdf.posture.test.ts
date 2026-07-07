import { describe, expect, it } from "vitest";
import { generatePosturePdfBuffer } from "../services/pdf.js";

describe("generatePosturePdfBuffer", () => {
  it("gera PDF válido com tema claro padronizado", async () => {
    const buffer = await generatePosturePdfBuffer({
      applicationName: "Portal Acadêmico Lab",
      applicationUrl: "https://app.test.com",
      techStack: "React + Node",
      userName: "Demo Usuário",
      userEmail: "demo@test.com",
      analysisTitle: "Análise Jun/2026",
      analysisCompletedAt: new Date("2026-06-16"),
      postureScore: 72,
      totalFindings: 2,
      openFindings: 1,
      resolutionRate: 50,
      findingsBySeverity: [
        { severity: "high", count: 1 },
        { severity: "medium", count: 1 },
        { severity: "critical", count: 0 },
        { severity: "low", count: 0 },
      ],
      findings: [
        {
          id: 1,
          title: "AUTH-02 — Senhas em texto plano",
          description: "Senhas armazenadas sem hash",
          severity: "high",
          priority: "imediata",
          status: "aberto",
          recommendationTitle: "Hash de senhas",
          recommendationAction: "Adotar bcrypt ou Argon2 para armazenamento de credenciais.",
          itemCode: "AUTH-02",
          categoryName: "Autenticação",
        },
      ],
    });

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(500);
  });
});
