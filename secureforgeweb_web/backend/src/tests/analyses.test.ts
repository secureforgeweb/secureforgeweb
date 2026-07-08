import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../controllers/index.js";
import type { TrpcContext } from "../_core/context.js";

vi.mock("../models/applications.db.js", () => ({
  createApplication: vi.fn(),
  getApplicationsByUser: vi.fn(),
  getAllApplicationsWithOwner: vi.fn(),
  getApplicationById: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
  countApplicationsByUser: vi.fn(),
}));

vi.mock("../models/analyses.db.js", () => ({
  createAnalysis: vi.fn(),
  getAnalysisById: vi.fn(),
  getAnalysesByApplication: vi.fn(),
  getAnalysesEnrichedByApplication: vi.fn(),
  getAllAnalysesForAdmin: vi.fn(),
  getAnalysisWizardState: vi.fn(),
  saveAnalysisResponses: vi.fn(),
  completeAnalysis: vi.fn(),
}));

vi.mock("../models/assessmentRuns.db.js", () => ({
  recordAssessmentRun: vi.fn(),
}));

vi.mock("../models/analysisItemEvidence.db.js", () => ({
  upsertAnalysisItemEvidence: vi.fn(),
  getItemEvidenceByAnalysis: vi.fn(),
}));

vi.mock("../services/checklistAssessor.js", () => ({
  HTTP_ASSESSMENT_ITEM_CODES: ["HEADER-01", "HEADER-02", "HEADER-03", "HEADER-04", "DATA-01"],
  runHttpHeaderAssessment: vi.fn(),
}));

vi.mock("../services/gitRepoAssessor.js", () => ({
  GIT_ASSESSMENT_ITEM_CODES: [
    "AUTH-01", "AUTH-02", "AUTH-03", "AUTH-04",
    "AUTHZ-01", "AUTHZ-02", "AUTHZ-03",
    "INPUT-01", "INPUT-02", "INPUT-03",
    "SECRET-01", "SECRET-02", "ERROR-01", "ERROR-02",
  ],
  runGitRepositoryAssessment: vi.fn(),
}));

vi.mock("../services/aiChecklistAssessor.js", () => ({
  AI_ORCHESTRATED_ITEM_CODES: [
    "HEADER-01", "HEADER-02", "HEADER-03", "HEADER-04", "DATA-01",
    "AUTH-01", "AUTH-02", "AUTH-03", "AUTH-04",
    "AUTHZ-01", "AUTHZ-02", "AUTHZ-03",
    "INPUT-01", "INPUT-02", "INPUT-03",
    "SECRET-01", "SECRET-02", "ERROR-01", "ERROR-02",
    "EXPOS-01", "EXPOS-02", "DATA-02", "SURF-01", "SURF-02",
  ],
  runAiAgentAssessment: vi.fn(),
}));

import * as applicationsDb from "../models/applications.db.js";
import * as analysesDb from "../models/analyses.db.js";
import * as checklistAssessor from "../services/checklistAssessor.js";
import * as gitRepoAssessor from "../services/gitRepoAssessor.js";
import * as aiChecklistAssessor from "../services/aiChecklistAssessor.js";
import * as analysisItemEvidenceDb from "../models/analysisItemEvidence.db.js";

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
  repositoryUrl: "https://github.com/example/app.git",
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

const mockWizardState = {
  analysis: mockAnalysis,
  categories: [
    {
      id: 1,
      name: "Autenticação",
      description: null,
      color: "#22d3ee",
      sortOrder: 1,
      createdAt: new Date(),
      items: [
        {
          id: 101,
          checklistId: 1,
          categoryId: 1,
          code: "AUTH-01",
          title: "Política de senha",
          description: "Desc",
          owaspRef: "ASVS 2.1",
          suggestedSeverity: "high" as const,
          sortOrder: 1,
          createdAt: new Date(),
          categoryName: "Autenticação",
          categoryColor: "#22d3ee",
        },
      ],
      answeredInCategory: 0,
      totalInCategory: 1,
    },
  ],
  items: [
    {
      id: 101,
      checklistId: 1,
      categoryId: 1,
      code: "AUTH-01",
      title: "Política de senha",
      description: "Desc",
      owaspRef: "ASVS 2.1",
      suggestedSeverity: "high" as const,
      sortOrder: 1,
      createdAt: new Date(),
      categoryName: "Autenticação",
      categoryColor: "#22d3ee",
    },
  ],
  responses: {},
  itemEvidence: [],
  progress: { totalItems: 1, answeredItems: 0, percentComplete: 0 },
};

function makeCtx(user: TrpcContext["user"]): TrpcContext {
  return { user, req: {} as never, res: {} as never, locale: "pt" as const };
}

describe("analyses router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create inicia análise para aplicação do usuário", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(analysesDb.createAnalysis).mockResolvedValue(mockAnalysis);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.analyses.create({ applicationId: 1 });
    expect(result.id).toBe(5);
    expect(analysesDb.createAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: 1, userId: 10 })
    );
  });

  it("create retorna NOT_FOUND para aplicação de outro usuário", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue({ ...mockApp, userId: 99 });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(caller.analyses.create({ applicationId: 1 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("getWizard retorna estado do wizard", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(analysesDb.getAnalysisWizardState).mockResolvedValue(mockWizardState);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.analyses.getWizard({ id: 5 });
    expect(result.progress.totalItems).toBe(1);
  });

  it("saveResponses persiste respostas e retorna achados sugeridos", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(analysesDb.saveAnalysisResponses).mockResolvedValue({
      savedCount: 1,
      suggestedFindings: [
        {
          itemId: 101,
          itemCode: "AUTH-01",
          itemTitle: "Política de senha",
          categoryName: "Autenticação",
          compliance: "nao_conforme",
          suggestedSeverity: "high",
          recommendation: null,
        },
      ],
      progress: { totalItems: 1, answeredItems: 1, percentComplete: 100 },
      status: "em_andamento",
    });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.analyses.saveResponses({
      analysisId: 5,
      responses: [{ itemId: 101, compliance: "nao_conforme", notes: "Sem política" }],
    });
    expect(result.savedCount).toBe(1);
    expect(result.suggestedFindings).toHaveLength(1);
    expect(result.suggestedFindings[0].itemCode).toBe("AUTH-01");
  });

  it("saveResponses rejeita conformidade inválida", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(
      caller.analyses.saveResponses({
        analysisId: 5,
        responses: [{ itemId: 101, compliance: "invalido" as never }],
      })
    ).rejects.toThrow();
  });

  it("complete exige todos os itens respondidos", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(analysesDb.getAnalysisWizardState).mockResolvedValue(mockWizardState);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(caller.analyses.complete({ id: 5 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("complete marca análise como concluída", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(analysesDb.getAnalysisWizardState).mockResolvedValue({
      ...mockWizardState,
      progress: { totalItems: 1, answeredItems: 1, percentComplete: 100 },
    });
    vi.mocked(analysesDb.completeAnalysis).mockResolvedValue({
      ...mockAnalysis,
      status: "concluida",
      completedAt: new Date(),
    });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.analyses.complete({ id: 5 });
    expect(result.success).toBe(true);
    expect(analysesDb.completeAnalysis).toHaveBeenCalledWith(5, 10);
  });

  it("listByApplication retorna análises da aplicação", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(analysesDb.getAnalysesEnrichedByApplication).mockResolvedValue([
      {
        ...mockAnalysis,
        executorName: "Test User",
        executorEmail: "user@test.com",
        assessmentRuns: [],
      },
    ]);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.analyses.listByApplication({ applicationId: 1 });
    expect(result).toHaveLength(1);
  });

  it("runAutoAssessment retorna sugestões HTTP", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(analysesDb.getAnalysisWizardState).mockResolvedValue({
      ...mockWizardState,
      items: [
        ...mockWizardState.items,
        { ...mockWizardState.items[0], id: 201, code: "HEADER-01", categoryName: "Headers de segurança" },
      ],
    });
    vi.mocked(checklistAssessor.runHttpHeaderAssessment).mockResolvedValue({
      snapshot: {
        requestedUrl: "https://app.test.com",
        finalUrl: "https://app.test.com",
        statusCode: 200,
        headers: {},
      },
      suggestions: [
        {
          itemId: 201,
          itemCode: "HEADER-01",
          compliance: "nao_conforme",
          confidence: 90,
          evidence: "CSP ausente",
          rationale: "Sem CSP",
          source: "auto",
        },
      ],
    });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.analyses.runAutoAssessment({ analysisId: 5, scope: "http_headers" });
    expect(result.suggestions).toHaveLength(1);
    expect(result.assessedUrl).toBe("https://app.test.com");
    expect(analysisItemEvidenceDb.upsertAnalysisItemEvidence).toHaveBeenCalledWith(
      5,
      "http_headers",
      result.suggestions
    );
  });

  it("runAutoAssessment exige URL base cadastrada", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue({ ...mockApp, baseUrl: null });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(
      caller.analyses.runAutoAssessment({ analysisId: 5, scope: "http_headers" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("runAutoAssessment git_repo retorna sugestões de código", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(analysesDb.getAnalysisWizardState).mockResolvedValue(mockWizardState);
    vi.mocked(gitRepoAssessor.runGitRepositoryAssessment).mockResolvedValue({
      snapshot: {
        repositoryUrl: "https://github.com/example/app.git",
        cloneUrl: "https://github.com/example/app.git",
        filesScanned: 42,
        files: [],
        gitignoreContent: ".env",
      },
      suggestions: [
        {
          itemId: 101,
          itemCode: "AUTH-02",
          compliance: "conforme",
          confidence: 90,
          evidence: "bcrypt.hash",
          rationale: "Hash detectado",
          source: "auto",
        },
      ],
    });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.analyses.runAutoAssessment({ analysisId: 5, scope: "git_repo" });
    expect(result.filesScanned).toBe(42);
    expect(result.suggestions[0].itemCode).toBe("AUTH-02");
  });

  it("runAutoAssessment git_repo exige repositório cadastrado", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue({ ...mockApp, repositoryUrl: null });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(
      caller.analyses.runAutoAssessment({ analysisId: 5, scope: "git_repo" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("runAutoAssessment ai_agent retorna sugestões IA", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(analysesDb.getAnalysisWizardState).mockResolvedValue({
      ...mockWizardState,
      items: [
        ...mockWizardState.items,
        {
          ...mockWizardState.items[0],
          id: 301,
          code: "EXPOS-01",
          title: "APIs autenticadas",
          description: "Endpoints sensíveis exigem auth",
          categoryName: "Exposição de endpoints",
        },
      ],
    });
    vi.mocked(aiChecklistAssessor.runAiAgentAssessment).mockResolvedValue({
      context: {
        application: {
          name: mockApp.name,
          baseUrl: mockApp.baseUrl,
          repositoryUrl: mockApp.repositoryUrl,
          techStack: mockApp.techStack,
          description: mockApp.description,
        },
        httpSnapshot: null,
        gitSnapshot: null,
        corpus: "",
        npmAuditSummary: null,
      },
      result: {
        mode: "heuristic",
        provider: "heuristic-local",
        contextSummary: "42 arquivo(s) no repositório",
        suggestions: [
          {
            itemId: 301,
            itemCode: "EXPOS-01",
            compliance: "conforme",
            confidence: 74,
            evidence: "protectedProcedure detectado",
            rationale: "Rotas protegidas",
            source: "ai",
          },
        ],
      },
    });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.analyses.runAutoAssessment({ analysisId: 5, scope: "ai_agent" });
    expect(result.assessmentMode).toBe("heuristic");
    expect(result.suggestions[0].source).toBe("ai");
  });

  it("runAutoAssessment ai_agent exige URL ou repositório", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue({
      ...mockApp,
      baseUrl: null,
      repositoryUrl: null,
    });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(
      caller.analyses.runAutoAssessment({ analysisId: 5, scope: "ai_agent" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("runAutoAssessment filtra itens por itemIds", async () => {
    vi.mocked(analysesDb.getAnalysisById).mockResolvedValue(mockAnalysis);
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(analysesDb.getAnalysisWizardState).mockResolvedValue({
      ...mockWizardState,
      items: [
        { ...mockWizardState.items[0], id: 401, code: "INPUT-01" },
        { ...mockWizardState.items[0], id: 402, code: "INPUT-02" },
      ],
    });
    vi.mocked(gitRepoAssessor.runGitRepositoryAssessment).mockResolvedValue({
      snapshot: {
        repositoryUrl: "https://github.com/example/app.git",
        cloneUrl: "https://github.com/example/app.git",
        filesScanned: 10,
        files: [],
        gitignoreContent: ".env",
      },
      suggestions: [
        {
          itemId: 401,
          itemCode: "INPUT-01",
          compliance: "conforme",
          confidence: 80,
          evidence: "zod schema",
          rationale: "Validação server-side",
          source: "auto",
        },
      ],
    });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await caller.analyses.runAutoAssessment({
      analysisId: 5,
      scope: "git_repo",
      itemIds: [401],
    });
    expect(gitRepoAssessor.runGitRepositoryAssessment).toHaveBeenCalledWith(
      mockApp.repositoryUrl,
      [{ id: 401, code: "INPUT-01" }]
    );
  });

  it("procedures exigem autenticação", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.analyses.getWizard({ id: 5 })).rejects.toThrow();
  });
});
