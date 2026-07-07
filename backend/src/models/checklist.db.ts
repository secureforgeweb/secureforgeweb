import { eq, asc } from "drizzle-orm";
import { getDb } from "./db.js";
import {
  checklists,
  checklistCategories,
  checklistItems,
  defaultRecommendations,
  ChecklistCategory,
  ChecklistItem,
} from "../../drizzle/schema.js";

export type ChecklistItemWithCategory = ChecklistItem & {
  categoryName: string;
  categoryColor: string | null;
};

export async function getActiveChecklist() {
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

export async function listChecklistCategories(): Promise<ChecklistCategory[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(checklistCategories)
    .orderBy(asc(checklistCategories.sortOrder), asc(checklistCategories.id));
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
      owaspRef: checklistItems.owaspRef,
      suggestedSeverity: checklistItems.suggestedSeverity,
      sortOrder: checklistItems.sortOrder,
      createdAt: checklistItems.createdAt,
      categoryName: checklistCategories.name,
      categoryColor: checklistCategories.color,
    })
    .from(checklistItems)
    .innerJoin(checklistCategories, eq(checklistItems.categoryId, checklistCategories.id))
    .where(eq(checklistItems.checklistId, checklistId))
    .orderBy(asc(checklistCategories.sortOrder), asc(checklistItems.sortOrder), asc(checklistItems.id));
  return rows;
}

export async function getChecklistCatalog() {
  const checklist = await getActiveChecklist();
  if (!checklist) {
    return { checklist: null, categories: [], items: [], totalItems: 0 };
  }
  const [categories, items] = await Promise.all([
    listChecklistCategories(),
    listChecklistItems(checklist.id),
  ]);
  return {
    checklist,
    categories,
    items,
    totalItems: items.length,
  };
}

export async function countChecklistItems(): Promise<number> {
  const checklist = await getActiveChecklist();
  if (!checklist) return 0;
  const items = await listChecklistItems(checklist.id);
  return items.length;
}

export async function updateChecklistItemById(
  id: number,
  data: {
    title?: string;
    description?: string;
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
