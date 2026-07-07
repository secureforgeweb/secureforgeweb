import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../controllers/index.js";
import type { TrpcContext } from "../_core/context.js";

vi.mock("../models/applications.db.js", () => ({
  getApplicationById: vi.fn(),
}));

vi.mock("../models/dashboard.db.js", () => ({
  getApplicationDashboard: vi.fn(),
  getGlobalDashboard: vi.fn(),
  computePostureScore: vi.fn((responses: Array<{ compliance: string }>, total: number) =>
    total > 0
      ? Math.round(
          (responses.filter((r) => r.compliance === "conforme" || r.compliance === "nao_aplicavel")
            .length /
            total) *
            100
        )
      : 0
  ),
}));

import * as applicationsDb from "../models/applications.db.js";
import * as dashboardDb from "../models/dashboard.db.js";

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

const mockDashboard = {
  application: { id: 1, name: "Portal Web", baseUrl: "https://app.test.com", techStack: "React + Node" },
  postureScore: 75,
  checklistProgress: {
    totalItems: 24,
    conforme: 18,
    parcial: 2,
    nao_conforme: 2,
    nao_aplicavel: 2,
    answeredItems: 24,
  },
  totalFindings: 4,
  openFindings: 2,
  resolutionRate: 50,
  findingsBySeverity: [
    { severity: "critical" as const, count: 1 },
    { severity: "high" as const, count: 1 },
    { severity: "medium" as const, count: 2 },
    { severity: "low" as const, count: 0 },
  ],
  findingsByCategory: [{ categoryId: 1, categoryName: "Autenticação", count: 2 }],
  findingsByStatus: [{ status: "aberto", count: 2 }],
  analyses: [
    {
      id: 5,
      title: "Análise Jun/2026",
      status: "concluida",
      startedAt: new Date(),
      completedAt: new Date(),
      postureScore: 75,
    },
  ],
  latestAnalysisId: 5,
};

function makeCtx(user: TrpcContext["user"]): TrpcContext {
  return { user, req: {} as never, res: {} as never };
}

describe("dashboard endpoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("analyses.dashboard retorna métricas da aplicação", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(dashboardDb.getApplicationDashboard).mockResolvedValue(mockDashboard);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.analyses.dashboard({ applicationId: 1 });
    expect(result.postureScore).toBe(75);
    expect(result.openFindings).toBe(2);
    expect(result.resolutionRate).toBe(50);
  });

  it("analyses.dashboard retorna NOT_FOUND para app de outro usuário", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue({ ...mockApp, userId: 99 });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(caller.analyses.dashboard({ applicationId: 1 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("analyses.globalDashboard retorna visão consolidada", async () => {
    vi.mocked(dashboardDb.getGlobalDashboard).mockResolvedValue({
      totalApplications: 1,
      averagePostureScore: 75,
      totalFindings: 4,
      openFindings: 2,
      overallResolutionRate: 50,
      findingsBySeverity: mockDashboard.findingsBySeverity,
      applications: [
        {
          id: 1,
          name: "Portal Web",
          techStack: "React + Node",
          postureScore: 75,
          openFindings: 2,
          totalFindings: 4,
          latestAnalysisId: 5,
        },
      ],
    });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.analyses.globalDashboard();
    expect(result.totalApplications).toBe(1);
    expect(result.averagePostureScore).toBe(75);
  });

  it("computePostureScore calcula percentual conforme + N/A", () => {
    const score = dashboardDb.computePostureScore(
      [
        { compliance: "conforme" },
        { compliance: "conforme" },
        { compliance: "nao_aplicavel" },
        { compliance: "nao_conforme" },
      ],
      4
    );
    expect(score).toBe(75);
  });

  it("procedures exigem autenticação", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.analyses.dashboard({ applicationId: 1 })).rejects.toThrow();
    await expect(caller.analyses.globalDashboard()).rejects.toThrow();
  });
});

describe("computePostureScore unit", () => {
  it("retorna 0 quando não há itens", () => {
    expect(dashboardDb.computePostureScore([], 0)).toBe(0);
  });

  it("retorna 100 quando todos conformes", () => {
    expect(
      dashboardDb.computePostureScore([{ compliance: "conforme" }, { compliance: "conforme" }], 2)
    ).toBe(100);
  });
});
