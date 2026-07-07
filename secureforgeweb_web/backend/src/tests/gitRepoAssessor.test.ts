import { describe, expect, it } from "vitest";
import {
  assessGitRepositoryItems,
  collectRepositorySnapshot,
  normalizeGitRepositoryUrl,
  GIT_ASSESSMENT_ITEM_CODES,
  type GitRepositorySnapshot,
} from "../services/gitRepoAssessor.js";
import path from "node:path";

const mockItems = GIT_ASSESSMENT_ITEM_CODES.map((code, idx) => ({ id: idx + 1, code }));

const secureForgeLikeSnapshot: GitRepositorySnapshot = {
  repositoryUrl: "https://github.com/example/secureforgeweb.git",
  cloneUrl: "https://github.com/example/secureforgeweb.git",
  filesScanned: 4,
  gitignoreContent: ".env\nnode_modules\n",
  files: [
    {
      path: "backend/src/lib/validation.ts",
      content: `
        export const PASSWORD_RULES = { minLength: 8 };
        export function isPasswordValid(password) { return true; }
      `,
    },
    {
      path: "backend/src/controllers/app.router.ts",
      content: `
        import bcrypt from "bcryptjs";
        const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
          if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
          return next({ ctx });
        });
        validateJoi(registerSchema, input);
        await bcrypt.hash(input.newPassword, 12);
        rateLimit({ windowMs: 60000 });
      `,
    },
    {
      path: "backend/src/_core/index.ts",
      content: `import helmet from "helmet"; process.env.JWT_SECRET;`,
    },
    {
      path: "backend/src/models/analyses.db.ts",
      content: `import { eq } from "drizzle-orm"; db.select().from(analyses).where(eq(analyses.id, id));`,
    },
  ],
};

describe("gitRepoAssessor — normalizeGitRepositoryUrl", () => {
  it("normaliza URL GitHub HTTPS", () => {
    expect(normalizeGitRepositoryUrl("https://github.com/secureforgeweb/secureforgeweb")).toBe(
      "https://github.com/secureforgeweb/secureforgeweb.git"
    );
  });

  it("normaliza owner/repo curto", () => {
    expect(normalizeGitRepositoryUrl("secureforgeweb/secureforgeweb")).toBe(
      "https://github.com/secureforgeweb/secureforgeweb.git"
    );
  });

  it("preserva URL SSH", () => {
    expect(normalizeGitRepositoryUrl("git@github.com:org/repo")).toBe("git@github.com:org/repo.git");
  });

  it("corrige URL duplicada colada no campo", () => {
    const malformed =
      "https://github.com/project256/sistema-cadastro-usuarioshttps://github.com/project256/sistema-cadastro-usuarios.git";
    expect(normalizeGitRepositoryUrl(malformed)).toBe(
      "https://github.com/project256/sistema-cadastro-usuarios.git"
    );
  });
});

describe("gitRepoAssessor — assessGitRepositoryItems", () => {
  it("detecta bcrypt, Joi, RBAC e ORM em repositório típico", () => {
    const suggestions = assessGitRepositoryItems(secureForgeLikeSnapshot, mockItems);
    const byCode = Object.fromEntries(suggestions.map((s) => [s.itemCode, s]));

    expect(byCode["AUTH-01"]?.compliance).toBe("conforme");
    expect(byCode["AUTH-02"]?.compliance).toBe("conforme");
    expect(byCode["AUTHZ-01"]?.compliance).toBe("conforme");
    expect(byCode["INPUT-01"]?.compliance).toBe("conforme");
    expect(byCode["INPUT-02"]?.compliance).toBe("conforme");
    expect(byCode["SECRET-01"]?.compliance).toBe("conforme");
    expect(byCode["SECRET-02"]?.compliance).toBe("conforme");
  });

  it("retorna apenas códigos suportados na Fase 6B", () => {
    const suggestions = assessGitRepositoryItems(secureForgeLikeSnapshot, [
      ...mockItems,
      { id: 99, code: "HEADER-01" },
    ]);
    expect(suggestions).toHaveLength(GIT_ASSESSMENT_ITEM_CODES.length);
  });
});

describe("gitRepoAssessor — collectRepositorySnapshot", () => {
  it("varre arquivos fonte locais (fixture)", async () => {
    const repoRoot = path.resolve("backend/src/services");
    const snapshot = await collectRepositorySnapshot(repoRoot, "file://local");
    expect(snapshot.filesScanned).toBeGreaterThan(0);
    expect(snapshot.files.some((f) => f.path.endsWith("gitRepoAssessor.ts"))).toBe(true);
  });
});
