import { eq, asc, and } from "drizzle-orm";
import { getDb } from "./db.js";
import {
  checklists,
  checklistCategories,
  checklistItems,
  defaultRecommendations,
  Checklist,
  ChecklistCategory,
  ChecklistItem,
} from "../../drizzle/schema.js";

export type ChecklistItemWithCategory = ChecklistItem & {
  categoryName: string;
  categoryColor: string | null;
  categoryNamePt: string | null;
  chapterId: string | null;
};

export async function getDefaultChecklist(): Promise<Checklist | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [defaultRow] = await db
    .select()
    .from(checklists)
    .where(and(eq(checklists.isDefault, true), eq(checklists.isActive, true)))
    .orderBy(asc(checklists.id))
    .limit(1);
  if (defaultRow) return defaultRow;
  return getActiveChecklist();
}

export async function getActiveChecklist(): Promise<Checklist | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db
    .select()
    .from(checklists)
    .where(eq(checklists.isActive, true))
    .orderBy(asc(checklists.id))
    .limit(1);
  return row;
}

export async function getChecklistById(id: number): Promise<Checklist | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select().from(checklists).where(eq(checklists.id, id)).limit(1);
  return row;
}

export async function listAvailableChecklists(): Promise<Checklist[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(checklists)
    .where(eq(checklists.isActive, true))
    .orderBy(asc(checklists.profile), asc(checklists.id));
}

export async function listChecklistCategories(checklistId?: number): Promise<ChecklistCategory[]> {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(checklistCategories);
  if (checklistId != null) {
    return query
      .where(eq(checklistCategories.checklistId, checklistId))
      .orderBy(asc(checklistCategories.sortOrder), asc(checklistCategories.id));
  }
  return query.orderBy(asc(checklistCategories.sortOrder), asc(checklistCategories.id));
}

export async function listChecklistItems(checklistId: number): Promise<ChecklistItemWithCategory[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: checklistItems.id,
      checklistId: checklistItems.checklistId,
      categoryId: checklistItems.categoryId,
      code: checklistItems.code,
      title: checklistItems.title,
      description: checklistItems.description,
      titlePt: checklistItems.titlePt,
      descriptionPt: checklistItems.descriptionPt,
      owaspRef: checklistItems.owaspRef,
      asvsId: checklistItems.asvsId,
      verificationLevel: checklistItems.verificationLevel,
      sectionName: checklistItems.sectionName,
      sectionNamePt: checklistItems.sectionNamePt,
      automationProfile: checklistItems.automationProfile,
      essentialCode: checklistItems.essentialCode,
      externalSource: checklistItems.externalSource,
      suggestedSeverity: checklistItems.suggestedSeverity,
      sortOrder: checklistItems.sortOrder,
      createdAt: checklistItems.createdAt,
      categoryName: checklistCategories.name,
      categoryColor: checklistCategories.color,
      categoryNamePt: checklistCategories.namePt,
      chapterId: checklistCategories.chapterId,
    })
    .from(checklistItems)
    .innerJoin(checklistCategories, eq(checklistItems.categoryId, checklistCategories.id))
    .where(eq(checklistItems.checklistId, checklistId))
    .orderBy(asc(checklistCategories.sortOrder), asc(checklistItems.sortOrder), asc(checklistItems.id));
  return rows;
}

export async function getChecklistCatalog(checklistId?: number) {
  const checklist = checklistId
    ? await getChecklistById(checklistId)
    : await getDefaultChecklist();
  if (!checklist) {
    return { checklist: null, categories: [], items: [], totalItems: 0 };
  }
  const [categories, items] = await Promise.all([
    listChecklistCategories(checklist.id),
    listChecklistItems(checklist.id),
  ]);
  return {
    checklist,
    categories,
    items,
    totalItems: items.length,
  };
}

export async function countChecklistItems(checklistId?: number): Promise<number> {
  const checklist = checklistId ? await getChecklistById(checklistId) : await getDefaultChecklist();
  if (!checklist) return 0;
  const items = await listChecklistItems(checklist.id);
  return items.length;
}

export async function updateChecklistItemById(
  id: number,
  data: {
    title?: string;
    description?: string;
    titlePt?: string;
    descriptionPt?: string;
    suggestedSeverity?: "critical" | "high" | "medium" | "low";
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db
    .update(checklistItems)
    .set(data)
    .where(eq(checklistItems.id, id))
    .returning();
  return row;
}

export { defaultRecommendations };
