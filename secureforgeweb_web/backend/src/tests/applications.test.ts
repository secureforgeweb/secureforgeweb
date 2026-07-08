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

vi.mock("../models/checklist.db.js", () => ({
  getChecklistCatalog: vi.fn(),
}));

import * as applicationsDb from "../models/applications.db.js";

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

const mockOtherUser = { ...mockUser, id: 99, openId: "other-user" };

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

function makeCtx(user: TrpcContext["user"]): TrpcContext {
  return { user, req: {} as never, res: {} as never, locale: "pt" as const };
}

describe("applications router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create registra aplicação do usuário autenticado", async () => {
    vi.mocked(applicationsDb.createApplication).mockResolvedValue(mockApp);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.applications.create({
      name: "Portal Web",
      baseUrl: "https://app.test.com",
      description: "App de teste",
      techStack: "React + Node",
    });
    expect(result.name).toBe("Portal Web");
    expect(applicationsDb.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 10, name: "Portal Web" })
    );
  });

  it("create rejeita nome curto", async () => {
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(caller.applications.create({ name: "A" })).rejects.toThrow(TRPCError);
  });

  it("create exige URL base ou repositório Git", async () => {
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(
      caller.applications.create({ name: "Portal Web", description: "Sem URLs" })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("URL base ou o repositório Git"),
    });
    expect(applicationsDb.createApplication).not.toHaveBeenCalled();
  });

  it("create aceita apenas repositório Git", async () => {
    vi.mocked(applicationsDb.createApplication).mockResolvedValue({
      ...mockApp,
      baseUrl: null,
      repositoryUrl: "https://github.com/example/app.git",
    });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await caller.applications.create({
      name: "Portal Web",
      repositoryUrl: "https://github.com/example/app.git",
    });
    expect(applicationsDb.createApplication).toHaveBeenCalled();
  });

  it("list retorna aplicações do usuário", async () => {
    vi.mocked(applicationsDb.getApplicationsByUser).mockResolvedValue([mockApp]);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.applications.list();
    expect(result).toHaveLength(1);
    expect(applicationsDb.getApplicationsByUser).toHaveBeenCalledWith(10);
  });

  it("getById retorna aplicação do dono", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.applications.getById({ id: 1 });
    expect(result.id).toBe(1);
  });

  it("getById retorna NOT_FOUND para aplicação de outro usuário", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue({ ...mockApp, userId: 99 });
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(caller.applications.getById({ id: 1 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("delete remove aplicação do dono", async () => {
    vi.mocked(applicationsDb.getApplicationById).mockResolvedValue(mockApp);
    vi.mocked(applicationsDb.deleteApplication).mockResolvedValue(true);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.applications.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("stats retorna total de aplicações", async () => {
    vi.mocked(applicationsDb.countApplicationsByUser).mockResolvedValue(3);
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.applications.stats();
    expect(result.total).toBe(3);
  });

  it("procedures exigem autenticação", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.applications.list()).rejects.toThrow();
  });
});
