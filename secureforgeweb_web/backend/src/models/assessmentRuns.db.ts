import { desc, eq } from "drizzle-orm";
import { getDb } from "./db.js";
import { analysisAssessmentRuns } from "../../drizzle/schema.js";

export type AssessmentRunInput = {
  analysisId: number;
  userId: number;
  scope: "http_headers" | "git_repo" | "ai_agent";
  assessmentMode?: string | null;
  provider?: string | null;
  itemsAssessed?: number;
  contextSummary?: string | null;
};

export async function recordAssessmentRun(input: AssessmentRunInput) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db
    .insert(analysisAssessmentRuns)
    .values({
      analysisId: input.analysisId,
      userId: input.userId,
      scope: input.scope,
      assessmentMode: input.assessmentMode ?? null,
      provider: input.provider ?? null,
      itemsAssessed: input.itemsAssessed ?? 0,
      contextSummary: input.contextSummary ?? null,
      assessedAt: new Date(),
    })
    .returning();

  return row;
}

export async function getAssessmentRunsForAnalyses(analysisIds: number[]) {
  const db = await getDb();
  if (!db || analysisIds.length === 0) return [];

  const { inArray } = await import("drizzle-orm");
  return db
    .select()
    .from(analysisAssessmentRuns)
    .where(inArray(analysisAssessmentRuns.analysisId, analysisIds))
    .orderBy(desc(analysisAssessmentRuns.assessedAt));
}
