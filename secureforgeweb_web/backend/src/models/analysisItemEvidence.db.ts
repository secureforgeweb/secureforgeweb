import { eq } from "drizzle-orm";
import { analysisItemEvidence } from "../../drizzle/schema.js";
import type { AutoAssessmentSuggestion } from "../services/checklistAssessor.js";
import { getDb } from "./db.js";

export type AssessmentScope = "http_headers" | "git_repo" | "ai_agent";

export type StoredItemEvidence = {
  itemId: number;
  scope: AssessmentScope;
  source: "auto" | "ai";
  compliance: string;
  confidence: number;
  evidence: string;
  rationale: string;
  artifacts: unknown[];
  assessedAt: Date;
};

export async function upsertAnalysisItemEvidence(
  analysisId: number,
  scope: AssessmentScope,
  suggestions: AutoAssessmentSuggestion[]
) {
  const db = await getDb();
  if (!db || suggestions.length === 0) return;

  const assessedAt = new Date();

  for (const suggestion of suggestions) {
    await db
      .insert(analysisItemEvidence)
      .values({
        analysisId,
        itemId: suggestion.itemId,
        scope,
        source: suggestion.source,
        compliance: suggestion.compliance,
        confidence: suggestion.confidence,
        evidence: suggestion.evidence,
        rationale: suggestion.rationale,
        artifacts: suggestion.artifacts ?? [],
        assessedAt,
      })
      .onConflictDoUpdate({
        target: [
          analysisItemEvidence.analysisId,
          analysisItemEvidence.itemId,
          analysisItemEvidence.scope,
        ],
        set: {
          source: suggestion.source,
          compliance: suggestion.compliance,
          confidence: suggestion.confidence,
          evidence: suggestion.evidence,
          rationale: suggestion.rationale,
          artifacts: suggestion.artifacts ?? [],
          assessedAt,
        },
      });
  }
}

export async function getItemEvidenceByAnalysis(analysisId: number): Promise<StoredItemEvidence[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(analysisItemEvidence)
    .where(eq(analysisItemEvidence.analysisId, analysisId));

  return rows.map((row) => ({
    itemId: row.itemId,
    scope: row.scope as AssessmentScope,
    source: row.source as "auto" | "ai",
    compliance: row.compliance,
    confidence: row.confidence,
    evidence: row.evidence,
    rationale: row.rationale,
    artifacts: (row.artifacts as unknown[]) ?? [],
    assessedAt: row.assessedAt,
  }));
}
