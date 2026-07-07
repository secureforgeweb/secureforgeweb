import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db.js";
import {
  applications,
  InsertApplication,
  Application,
} from "../../drizzle/schema.js";
import { deleteAnalysesByApplication } from "./analyses.db.js";

export async function createApplication(data: InsertApplication): Promise<Application> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(applications).values(data).returning();
  return row;
}

export async function getApplicationsByUser(userId: number): Promise<Application[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.updatedAt));
}

export type ApplicationWithOwner = Application & {
  ownerName: string | null;
  ownerEmail: string | null;
};

export async function getAllApplicationsWithOwner(): Promise<ApplicationWithOwner[]> {
  const db = await getDb();
  if (!db) return [];

  const { users } = await import("../../drizzle/schema.js");
  const rows = await db
    .select({
      application: applications,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(applications)
    .innerJoin(users, eq(applications.userId, users.id))
    .orderBy(desc(applications.updatedAt));

  return rows.map((row) => ({
    ...row.application,
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
  }));
}

export async function getApplicationById(id: number): Promise<Application | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return row;
}

export async function updateApplication(
  id: number,
  userId: number,
  data: Partial<Pick<Application, "name" | "baseUrl" | "repositoryUrl" | "description" | "techStack">>
): Promise<Application | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db
    .update(applications)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning();
  return row;
}

export async function deleteApplication(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await deleteAnalysesByApplication(id);
  const result = await db
    .delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning({ id: applications.id });
  return result.length > 0;
}

export async function countApplicationsByUser(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.userId, userId));
  return rows.length;
}
