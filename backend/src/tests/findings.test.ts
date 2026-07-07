import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../controllers/index.js";
import type { TrpcContext } from "../_core/context.js";

vi.mock("../models/applications.db.js", () => ({
  createApplication: vi.fn(),
  getApplicationsByUser: vi.fn(),
  getApplicationById: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
  countApplicationsByUser: vi.fn(),
}));

vi.mock("../models/analyses.db.js", () => ({
  createAnalysis: vi.fn(),
  getAnalysisById: vi.fn(),
  getAnalysesByApplication: vi.fn(),
  getAnalysisWizardState: vi.fn(),
  saveAnalysisResponses: vi.fn(),
  completeAnalysis: vi.fn(),
}));

vi.mock("../models/findings.db.js", () => ({
  createFinding: vi.fn(),
  getFindingById: vi.fn(),
  getFindingsByApplication: vi.fn(),
  getFindingHistory: vi.fn(),
  updateFinding: vi.fn(),
  updateFindingStatus: vi.fn(),
  generateFindingsFromAnalysis: vi.fn(),
  countFindingsByApplication: vi.fn(),
  priorityFromSeverity: vi.fn((s: string) =>
    s === "critical" ? "imediata" : s === "high" ? "curto_prazo" : s === "low" ? "baixa" : "medio_prazo"
  ),
}));

import * as applicationsDb from "../models/applications.db.js";
import * as analysesDb from "../models/analyses.db.js";
import * as findingsDb from "../models/findings.db.js";

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

const mockAnalysis = {
  id: 5,
  applicationId: 1,
  userId: 10,
  checklistId: 1,
  title: "Análise 15/06/2026",
  status: "em_andamento" as const,
  startedAt: new Date(),
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockFinding = {
  id: 20,
  analysisId: 5,
  itemId: 101,
  userId: 10,
  title: "AUTH-01 — Política de senha",
  description: "Não conforme",
  severity: "high" as const,
  priority: "curto_prazo" as const,
  status: "aberto" as const,
  evidence: "Sem política",
  notes: null,
  recommendationTitle: "Implementar política",
  recommendationDescription: "Desc",
  recommendationAction: "Exigir 8+ chars",
  recommendationReference: "OWASP",
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  applicationId: 1,
  analysisTitle: "Análise 15/06/2026",
  itemCode: "AUTH-01",
  itemTitle: "Política de senha",
  categoryId: 1,
  categoryName: "Autenticação",
};

function makeCtx(user: TrpcContext["user"]): TrpcContext {
  return { user, req: {} as never, res: {} as never };
}

describe("findings router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create registra achado para análise do usuário", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(findingsDb.createFinding).mockResolvedValue(mockFinding);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.findings.create({
      analysisId: 5,
      itemId: 101,
      title: "AUTH-01 — Política de senha",
      description: "Não conforme",
      severity: "high",
      evidence: "Sem política",
    });
    expect(result.id).toBe(20);
    expect(findingsDb.createFinding).toHaveBeenCalledWith(
      expect.objectContaining({ analysisId: 5, userId: 10, severity: "high" }),
      10
    );
  });

  it("create retorna NOT_FOUND para análise de outro usuário", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue({ ...mockAnalysis, userId: 99 });
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue({ ...mockApp, userId: 99 });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(
      caller.findings.create({ analysisId: 5, title: "Achado manual" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("generateFromAnalysis gera achados a partir de respostas não conformes", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(findingsDb.generateFindingsFromAnalysis).mockResolvedValue({
      created: [mockFinding],
      skipped: 0,
    });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.findings.generateFromAnalysis({ analysisId: 5 });
    expect(result.created).toHaveLength(1);
    expect(findingsDb.generateFindingsFromAnalysis).toHaveBeenCalledWith(5, 10);
  });

  it("listByApplication retorna achados com filtros", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(findingsDb.getFindingsByApplication).mockResolvedValue([
      {
        id: 20,
        analysisId: 5,
        itemId: 101,
        userId: 10,
        title: "AUTH-01 — Política de senha",
        description: "Não conforme",
        severity: "high",
        priority: "curto_prazo",
        status: "aberto",
        evidence: null,
        notes: null,
        recommendationTitle: "Implementar política",
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        analysisTitle: "Análise 15/06/2026",
        itemCode: "AUTH-01",
        categoryId: 1,
        categoryName: "Autenticação",
      },
    ]);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.findings.listByApplication({
      applicationId: 1,
      severity: "high",
      status: "aberto",
    });
    expect(result).toHaveLength(1);
    expect(findingsDb.getFindingsByApplication).toHaveBeenCalledWith(1, {
      severity: "high",
      status: "aberto",
      categoryId: undefined,
    });
  });

  it("getById retorna NOT_FOUND para achado de outro usuário (IDOR)", async () => {
    vi.mocked(findingsDb.getFindingById).mockResolvedValue({ ...mockFinding, userId: 99 });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(caller.findings.getById({ id: 20 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("updateStatus altera status e registra histórico", async () => {
    vi.mocked(findingsDb.getFindingById).mockResolvedValue(mockFinding);
    vi.mocked(findingsDb.updateFindingStatus).mockResolvedValue({
      ...mockFinding,
      status: "em_correcao",
    });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.findings.updateStatus({
      id: 20,
      status: "em_correcao",
      comment: "Correção iniciada",
    });
    expect(result.status).toBe("em_correcao");
    expect(findingsDb.updateFindingStatus).toHaveBeenCalledWith(
      20,
      10,
      "em_correcao",
      "Correção iniciada"
    );
  });

  it("getHistory retorna histórico do achado", async () => {
    vi.mocked(findingsDb.getFindingById).mockResolvedValue(mockFinding);
    vi.mocked(findingsDb.getFindingHistory).mockResolvedValue([
      {
        id: 1,
        findingId: 20,
        userId: 10,
        action: "created",
        fromValue: null,
        toValue: "aberto",
        comment: "Achado registrado",
        createdAt: new Date(),
        userName: "Test User",
      },
    ]);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.findings.getHistory({ id: 20 });
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe("created");
  });

  it("stats retorna total de achados da aplicação", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(findingsDb.countFindingsByApplication).mockResolvedValue(3);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.findings.stats({ applicationId: 1 });
    expect(result.total).toBe(3);
  });

  it("procedures exigem autenticação", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.findings.listByApplication({ applicationId: 1 })).rejects.toThrow();
  });
});
