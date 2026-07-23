import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../controllers/index.js";
import type { TrpcContext } from "../_core/context.js";

vi.mock("../models/applications.db.js", () => ({
  getApplicationById: vi.fn(),
}));

vi.mock("../models/dashboard.db.js", () => ({
  getPostureReportData: vi.fn(),
}));

vi.mock("../services/pdf.js", () => ({
  generatePosturePdfBuffer: vi.fn().mockResolvedValue(Buffer.from("PDF_POSTURE_CONTENT")),
}));

import * as applicationsDb from "../models/applications.db.js";
import * as dashboardDb from "../models/dashboard.db.js";
import { generatePosturePdfBuffer } from "../services/pdf.js";

const mockUser = {
  id: 10,
  openId: "user-open-id",
  name: "Test User",
  email: "user@test.com",
  passwordHash: null,
  loginMethod: "local",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  isActive: true,
  mustChangePassword: false,
};

const mockApp = {
  id: 1,
  userId: 10,
  name: "Portal Web",
  baseUrl: "https://app.test.com",
  description: "App de teste",
  techStack: "React + Node",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockReport = {
  dashboard: {
    application: { id: 1, name: "Portal Web", baseUrl: "https://app.test.com", techStack: "React + Node" },
    postureScore: 75,
    checklistProgress: null,
    totalFindings: 2,
    openFindings: 1,
    resolutionRate: 50,
    findingsBySeverity: [
      { severity: "high" as const, count: 1 },
      { severity: "medium" as const, count: 1 },
      { severity: "critical" as const, count: 0 },
      { severity: "low" as const, count: 0 },
    ],
    findingsByCategory: [],
    findingsByStatus: [],
    analyses: [],
    latestAnalysisId: 5,
  },
  findings: [
    {
      id: 1,
      title: "AUTH-01 — Política de senha",
      description: "Não conforme",
      severity: "high",
      priority: "curto_prazo",
      status: "aberto",
      recommendationTitle: "Implementar política",
      recommendationAction: "Exigir 8+ chars",
      itemCode: "AUTH-01",
      categoryName: "Autenticação",
    },
  ],
  analysisTitle: "Análise Jun/2026",
  analysisCompletedAt: new Date(),
};

function makeCtx(user: TrpcContext["user"]): TrpcContext {
  return { user, req: {} as never, res: {} as never, locale: "pt" as const };
}

describe("reports.exportPdf", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exporta PDF de postura da aplicação", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(dashboardDb.getPostureReportData).mockResolvedValue(mockReport);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.reports.exportPdf({ applicationId: 1 });
    expect(result.mimeType).toBe("application/pdf");
    expect(result.base64).toBeDefined();
    expect(result.filename).toContain("secureforgeweb-portal-web");
    expect(result.findingCount).toBe(1);
    expect(result.postureScore).toBe(75);
    expect(generatePosturePdfBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationName: "Portal Web",
        userName: "Test User",
        postureScore: 75,
      })
    );
  });

  it("aceita analysisId opcional", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(dashboardDb.getPostureReportData).mockResolvedValue(mockReport);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await caller.reports.exportPdf({ applicationId: 1, analysisId: 5 });
    expect(dashboardDb.getPostureReportData).toHaveBeenCalledWith(1, 5);
  });

  it("retorna NOT_FOUND para aplicação de outro usuário", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue({ ...mockApp, userId: 99 });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(caller.reports.exportPdf({ applicationId: 1 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("requer autenticação", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.reports.exportPdf({ applicationId: 1 })).rejects.toThrow();
  });
});
