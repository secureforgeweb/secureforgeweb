import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { getDb } from "./db.js";
import {
  findings,
  findingHistory,
  analyses,
  checklistItems,
  checklistCategories,
  checklistResponses,
  defaultRecommendations,
  users,
  InsertFinding,
  Finding,
} from "../../drizzle/schema.js";
import { getDefaultRecommendationsByItemIds } from "./analyses.db.js";
import { listChecklistItems } from "./checklist.db.js";
import { createNotification } from "./db.js";

export type SeverityValue = "critical" | "high" | "medium" | "low";
export type PriorityValue = "imediata" | "curto_prazo" | "medio_prazo" | "baixa";
export type FindingStatusValue = "aberto" | "em_correcao" | "resolvido" | "aceito_risco";

export function priorityFromSeverity(severity: SeverityValue): PriorityValue {
  const map: Record<SeverityValue, PriorityValue> = {
    critical: "imediata",
    high: "curto_prazo",
    medium: "medio_prazo",
    low: "baixa",
  };
  return map[severity];
}

async function notifyCriticalFinding(userId: number, findingId: number, title: string) {
  await createNotification({
    userId,
    type: "risk_changed",
    title: "Achado crítico registrado",
    message: title,
    findingId,
  });
}

export async function addFindingHistory(entry: {
  findingId: number;
  userId: number;
  action: "status_changed" | "notes_updated" | "severity_changed" | "created";
  fromValue?: string | null;
  toValue?: string | null;
  comment?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(findingHistory).values({
    findingId: entry.findingId,
    userId: entry.userId,
    action: entry.action,
    fromValue: entry.fromValue ?? null,
    toValue: entry.toValue ?? null,
    comment: entry.comment ?? null,
  });
}

export async function createFinding(
  data: Omit<InsertFinding, "priority"> & { priority?: PriorityValue },
  userId: number
): Promise<Finding> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const severity = data.severity ?? "medium";
  const [row] = await db
    .insert(findings)
    .values({
      ...data,
      severity,
      priority: data.priority ?? priorityFromSeverity(severity),
    })
    .returning();

  await addFindingHistory({
    findingId: row.id,
    userId,
    action: "created",
    toValue: row.status,
    comment: "Achado registrado",
  });

  if (row.severity === "critical") {
    await notifyCriticalFinding(userId, row.id, row.title);
  }

  return row;
}

export async function getFindingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const [row] = await db
    .select({
      id: findings.id,
      analysisId: findings.analysisId,
      itemId: findings.itemId,
      userId: findings.userId,
      title: findings.title,
      description: findings.description,
      severity: findings.severity,
      priority: findings.priority,
      status: findings.status,
      evidence: findings.evidence,
      notes: findings.notes,
      recommendationTitle: findings.recommendationTitle,
      recommendationDescription: findings.recommendationDescription,
      recommendationAction: findings.recommendationAction,
      recommendationReference: findings.recommendationReference,
      resolvedAt: findings.resolvedAt,
      createdAt: findings.createdAt,
      updatedAt: findings.updatedAt,
      applicationId: analyses.applicationId,
      analysisTitle: analyses.title,
      itemCode: checklistItems.code,
      itemTitle: checklistItems.title,
      categoryId: checklistCategories.id,
      categoryName: checklistCategories.name,
    })
    .from(findings)
    .innerJoin(analyses, eq(findings.analysisId, analyses.id))
    .leftJoin(checklistItems, eq(findings.itemId, checklistItems.id))
    .leftJoin(checklistCategories, eq(checklistItems.categoryId, checklistCategories.id))
    .where(eq(findings.id, id))
    .limit(1);

  return row;
}

export async function getFindingsByApplication(
  applicationId: number,
  filters?: {
    severity?: SeverityValue;
    status?: FindingStatusValue;
    categoryId?: number;
  }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(analyses.applicationId, applicationId)];

  if (filters?.severity) {
    conditions.push(eq(findings.severity, filters.severity));
  }
  if (filters?.status) {
    conditions.push(eq(findings.status, filters.status));
  }
  if (filters?.categoryId) {
    conditions.push(eq(checklistItems.categoryId, filters.categoryId));
  }

  return db
    .select({
      id: findings.id,
      analysisId: findings.analysisId,
      itemId: findings.itemId,
      userId: findings.userId,
      title: findings.title,
      description: findings.description,
      severity: findings.severity,
      priority: findings.priority,
      status: findings.status,
      evidence: findings.evidence,
      notes: findings.notes,
      recommendationTitle: findings.recommendationTitle,
      resolvedAt: findings.resolvedAt,
      createdAt: findings.createdAt,
      updatedAt: findings.updatedAt,
      analysisTitle: analyses.title,
      itemCode: checklistItems.code,
      categoryId: checklistCategories.id,
      categoryName: checklistCategories.name,
    })
    .from(findings)
    .innerJoin(analyses, eq(findings.analysisId, analyses.id))
    .leftJoin(checklistItems, eq(findings.itemId, checklistItems.id))
    .leftJoin(checklistCategories, eq(checklistItems.categoryId, checklistCategories.id))
    .where(and(...conditions))
    .orderBy(desc(findings.createdAt));
}

export async function countFindingsByApplication(applicationId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: findings.id })
    .from(findings)
    .innerJoin(analyses, eq(findings.analysisId, analyses.id))
    .where(eq(analyses.applicationId, applicationId));
  return rows.length;
}

export async function getFindingHistory(findingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: findingHistory.id,
      findingId: findingHistory.findingId,
      userId: findingHistory.userId,
      action: findingHistory.action,
      fromValue: findingHistory.fromValue,
      toValue: findingHistory.toValue,
      comment: findingHistory.comment,
      createdAt: findingHistory.createdAt,
      userName: users.name,
    })
    .from(findingHistory)
    .leftJoin(users, eq(findingHistory.userId, users.id))
    .where(eq(findingHistory.findingId, findingId))
    .orderBy(desc(findingHistory.createdAt));
}

export async function updateFinding(
  id: number,
  userId: number,
  data: {
    title?: string;
    description?: string | null;
    severity?: SeverityValue;
    evidence?: string | null;
    notes?: string | null;
  }
): Promise<Finding | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getFindingById(id);
  if (!existing || existing.userId !== userId) return undefined;

  const updates: Partial<Finding> & { updatedAt: Date } = { updatedAt: new Date() };
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.evidence !== undefined) updates.evidence = data.evidence;
  if (data.notes !== undefined) updates.notes = data.notes;

  if (data.severity !== undefined && data.severity !== existing.severity) {
    updates.severity = data.severity;
    updates.priority = priorityFromSeverity(data.severity);
    await addFindingHistory({
      findingId: id,
      userId,
      action: "severity_changed",
      fromValue: existing.severity,
      toValue: data.severity,
    });
  }

  if (data.notes !== undefined && data.notes !== existing.notes) {
    await addFindingHistory({
      findingId: id,
      userId,
      action: "notes_updated",
      comment: data.notes,
    });
  }

  const [row] = await db
    .update(findings)
    .set(updates)
    .where(and(eq(findings.id, id), eq(findings.userId, userId)))
    .returning();

  return row;
}

export async function updateFindingStatus(
  id: number,
  userId: number,
  status: FindingStatusValue,
  comment?: string | null
): Promise<Finding | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getFindingById(id);
  if (!existing || existing.userId !== userId) return undefined;
  if (existing.status === status) return existing as unknown as Finding;

  const resolvedAt =
    status === "resolvido" ? new Date() : status === "aberto" ? null : existing.resolvedAt;

  const [row] = await db
    .update(findings)
    .set({ status, resolvedAt, updatedAt: new Date() })
    .where(and(eq(findings.id, id), eq(findings.userId, userId)))
    .returning();

  await addFindingHistory({
    findingId: id,
    userId,
    action: "status_changed",
    fromValue: existing.status,
    toValue: status,
    comment: comment ?? null,
  });

  return row;
}

export async function generateFindingsFromAnalysis(
  analysisId: number,
  userId: number
): Promise<{ created: Finding[]; skipped: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [analysis] = await db.select().from(analyses).where(eq(analyses.id, analysisId)).limit(1);
  if (!analysis) throw new Error("Análise não encontrada");

  const [responses, items, existingFindings] = await Promise.all([
    db
      .select()
      .from(checklistResponses)
      .where(eq(checklistResponses.analysisId, analysisId)),
    listChecklistItems(analysis.checklistId),
    db
      .select({ itemId: findings.itemId })
      .from(findings)
      .where(and(eq(findings.analysisId, analysisId), sql`${findings.itemId} IS NOT NULL`)),
  ]);

  const existingItemIds = new Set(
    existingFindings.map((f) => f.itemId).filter((id): id is number => id != null)
  );
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const nonCompliant = responses.filter(
    (r) => r.compliance === "parcial" || r.compliance === "nao_conforme"
  );

  const itemIds = nonCompliant.map((r) => r.itemId).filter((id) => !existingItemIds.has(id));
  const recommendations = await getDefaultRecommendationsByItemIds(itemIds);
  const recMap = new Map(recommendations.map((r) => [r.itemId, r]));

  const created: Finding[] = [];
  let skipped = 0;

  for (const response of nonCompliant) {
    if (existingItemIds.has(response.itemId)) {
      skipped++;
      continue;
    }

    const item = itemMap.get(response.itemId);
    if (!item) continue;

    const rec = recMap.get(response.itemId);
    const severity = item.suggestedSeverity as SeverityValue;
    const complianceLabel =
      response.compliance === "nao_conforme" ? "Não conforme" : "Parcialmente conforme";

    const finding = await createFinding(
      {
        analysisId,
        itemId: response.itemId,
        userId,
        title: `${item.code} — ${item.title}`,
        description: `${complianceLabel}: ${item.description}`,
        severity,
        evidence: response.notes,
        recommendationTitle: rec?.title ?? null,
        recommendationDescription: rec?.description ?? null,
        recommendationAction: rec?.action ?? null,
        recommendationReference: rec?.reference ?? null,
      },
      userId
    );

    created.push(finding);
    existingItemIds.add(response.itemId);
  }

  return { created, skipped };
}

export async function deleteFindingsByAnalysisIds(analysisIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db || analysisIds.length === 0) return;

  const findingRows = await db
    .select({ id: findings.id })
    .from(findings)
    .where(inArray(findings.analysisId, analysisIds));

  const findingIds = findingRows.map((r) => r.id);
  if (findingIds.length === 0) return;

  await db.delete(findingHistory).where(inArray(findingHistory.findingId, findingIds));
  await db.delete(findings).where(inArray(findings.id, findingIds));
}
