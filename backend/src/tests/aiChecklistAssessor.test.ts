import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  AI_ASSESSMENT_ITEM_CODES,
  AI_ORCHESTRATED_ITEM_CODES,
  assessAiItemsHeuristic,
  buildAiAssessmentContext,
  buildFullChecklistAiSuggestions,
  type AiAssessmentContext,
} from "../services/aiChecklistAssessor.js";

vi.mock("../services/checklistAssessor.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/checklistAssessor.js")>();
  return {
    ...actual,
    fetchHttpSecuritySnapshot: vi.fn(),
  };
});

vi.mock("../services/gitRepoAssessor.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/gitRepoAssessor.js")>();
  return {
    ...actual,
    fetchGitRepositorySnapshot: vi.fn(),
  };
});

import { fetchHttpSecuritySnapshot } from "../services/checklistAssessor.js";
import { fetchGitRepositorySnapshot } from "../services/gitRepoAssessor.js";

const mockItems = AI_ASSESSMENT_ITEM_CODES.map((code, idx) => ({
  id: idx + 1,
  code,
  title: `Item ${code}`,
  description: `Descrição ${code}`,
}));

const allOrchestratedItems = AI_ORCHESTRATED_ITEM_CODES.map((code, idx) => ({
  id: idx + 1,
  code,
  title: `Item ${code}`,
  description: `Descrição ${code}`,
}));

const secureContext: AiAssessmentContext = {
  application: {
    name: "App Test",
    baseUrl: "https://app.test.com",
    repositoryUrl: "https://github.com/example/app.git",
    techStack: "Node + React",
    description: "App de teste",
  },
  httpSnapshot: {
    requestedUrl: "https://app.test.com",
    finalUrl: "https://app.test.com",
    statusCode: 200,
    headers: { "content-security-policy": "default-src 'self'" },
  },
  gitSnapshot: {
    repositoryUrl: "https://github.com/example/app.git",
    cloneUrl: "https://github.com/example/app.git",
    filesScanned: 3,
    gitignoreContent: ".env\n",
    files: [
      {
        path: "backend/src/router.ts",
        content: `
          export const appRouter = router({
            secret: protectedProcedure.query(() => ({})),
            admin: adminProcedure.mutation(() => ({})),
          });
        `,
      },
      {
        path: "backend/src/logger.ts",
        content: `const logger = pino({ redact: ['password', 'token'] });`,
      },
      {
        path: "package.json",
        content: JSON.stringify({ name: "app", dependencies: { express: "^4.21.0" } }),
      },
    ],
  },
  corpus: "",
  npmAuditSummary: { critical: 0, high: 0, moderate: 1, low: 2, total: 3 },
};

secureContext.corpus = secureContext.gitSnapshot!.files
  .map((f) => `${f.path}\n${f.content}`)
  .join("\n");

describe("aiChecklistAssessor — orquestração checklist completo", () => {
  it("buildFullChecklistAiSuggestions preenche os 24 itens", () => {
    const suggestions = buildFullChecklistAiSuggestions(secureContext, allOrchestratedItems);
    expect(suggestions).toHaveLength(AI_ORCHESTRATED_ITEM_CODES.length);
    expect(suggestions.every((s) => s.source === "ai")).toBe(true);
    for (const code of AI_ORCHESTRATED_ITEM_CODES) {
      expect(suggestions.some((s) => s.itemCode === code)).toBe(true);
    }
  });

  it("sem repositório, itens Git recebem fallback genérico", () => {
    const httpOnlyCtx: AiAssessmentContext = {
      ...secureContext,
      gitSnapshot: null,
      corpus: "",
      npmAuditSummary: null,
    };
    const suggestions = buildFullChecklistAiSuggestions(httpOnlyCtx, allOrchestratedItems);
    const auth01 = suggestions.find((s) => s.itemCode === "AUTH-01");
    expect(auth01?.compliance).toBe("parcial");
    expect(auth01?.evidence).toContain("repositório Git ausente");
  });
});

describe("aiChecklistAssessor — heurísticas Fase 6C", () => {
  it("retorna apenas códigos suportados na Fase 6C", () => {
    const suggestions = assessAiItemsHeuristic(secureContext, mockItems);
    expect(suggestions).toHaveLength(AI_ASSESSMENT_ITEM_CODES.length);
    for (const s of suggestions) {
      expect(AI_ASSESSMENT_ITEM_CODES).toContain(s.itemCode);
      expect(s.source).toBe("ai");
    }
  });

  it("EXPOS-01 conforme quando protectedProcedure detectado", () => {
    const suggestions = assessAiItemsHeuristic(secureContext, mockItems);
    const expos01 = suggestions.find((s) => s.itemCode === "EXPOS-01");
    expect(expos01?.compliance).toBe("conforme");
    expect(expos01?.confidence).toBeGreaterThan(70);
  });

  it("DATA-02 conforme com redação de logs", () => {
    const suggestions = assessAiItemsHeuristic(secureContext, mockItems);
    const data02 = suggestions.find((s) => s.itemCode === "DATA-02");
    expect(data02?.compliance).toBe("conforme");
  });

  it("SURF-02 conforme sem CVEs críticos/altos no npm audit", () => {
    const suggestions = assessAiItemsHeuristic(secureContext, mockItems);
    const surf02 = suggestions.find((s) => s.itemCode === "SURF-02");
    expect(surf02?.compliance).toBe("conforme");
    expect(surf02?.evidence).toContain("npm audit");
  });

  it("EXPOS-02 nao_conforme quando swagger exposto sem proteção", () => {
    const ctx: AiAssessmentContext = {
      ...secureContext,
      corpus: `${secureContext.corpus}\nswaggerUi.setup(app, swaggerDocument);`,
      gitSnapshot: secureContext.gitSnapshot
        ? {
            ...secureContext.gitSnapshot,
            files: [
              ...secureContext.gitSnapshot.files,
              {
                path: "backend/src/swagger.ts",
                content: "app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));",
              },
            ],
          }
        : null,
    };
    const suggestions = assessAiItemsHeuristic(ctx, mockItems);
    const expos02 = suggestions.find((s) => s.itemCode === "EXPOS-02");
    expect(expos02?.compliance).toBe("nao_conforme");
  });
});

describe("aiChecklistAssessor — buildAiAssessmentContext", () => {
  beforeEach(() => {
    vi.mocked(fetchHttpSecuritySnapshot).mockResolvedValue(secureContext.httpSnapshot!);
    vi.mocked(fetchGitRepositorySnapshot).mockResolvedValue(secureContext.gitSnapshot!);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("combina evidências HTTP e Git quando disponíveis", async () => {
    const ctx = await buildAiAssessmentContext({
      name: "App",
      baseUrl: "https://app.test.com",
      repositoryUrl: "https://github.com/example/app.git",
      techStack: null,
      description: null,
    });
    expect(ctx.httpSnapshot).not.toBeNull();
    expect(ctx.gitSnapshot).not.toBeNull();
    expect(ctx.corpus.length).toBeGreaterThan(0);
  });
});
