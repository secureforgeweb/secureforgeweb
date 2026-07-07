import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db.js";
import { userAiAssistantConfigs, type UserAiAssistantConfig } from "../../drizzle/schema.js";
import type { AiProviderId } from "../services/aiAssistantConfig.js";

export type UserAiAssistantConfigInput = {
  provider: AiProviderId;
  apiKey: string;
  model: string;
  baseUrl: string;
  enabled: boolean;
};

export async function getUserAiAssistantConfigByUserId(
  userId: number
): Promise<UserAiAssistantConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db
    .select()
    .from(userAiAssistantConfigs)
    .where(eq(userAiAssistantConfigs.userId, userId))
    .limit(1);
  return row;
}

export async function getUserAiAssistantConfigsByUserIds(
  userIds: number[]
): Promise<Map<number, UserAiAssistantConfig>> {
  const db = await getDb();
  const map = new Map<number, UserAiAssistantConfig>();
  if (!db || userIds.length === 0) return map;

  const rows = await db
    .select()
    .from(userAiAssistantConfigs)
    .where(inArray(userAiAssistantConfigs.userId, userIds));

  for (const row of rows) {
    map.set(row.userId, row);
  }
  return map;
}

export async function upsertUserAiAssistantConfig(
  userId: number,
  data: UserAiAssistantConfigInput
): Promise<UserAiAssistantConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserAiAssistantConfigByUserId(userId);
  if (existing) {
    const [row] = await db
      .update(userAiAssistantConfigs)
      .set({
        provider: data.provider,
        apiKey: data.apiKey,
        model: data.model,
        baseUrl: data.baseUrl,
        enabled: data.enabled,
        updatedAt: new Date(),
      })
      .where(eq(userAiAssistantConfigs.userId, userId))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(userAiAssistantConfigs)
    .values({
      userId,
      provider: data.provider,
      apiKey: data.apiKey,
      model: data.model,
      baseUrl: data.baseUrl,
      enabled: data.enabled,
    })
    .returning();
  return row;
}
