import { eq } from "drizzle-orm";
import { getDb } from "../models/db.js";
import {
  checklists,
  checklistCategories,
  checklistItems,
  type Checklist,
} from "../../drizzle/schema.js";
import {
  ASVS5_ESSENTIAL_AUTOMATION_MAP,
  ASVS5_FLAT_JSON_URL,
  ASVS_GITHUB_RELEASES_URL,
  ASVS_SOURCE_VERSION,
  inferSeverityFromLevel,
  resolveAutomationProfile,
} from "../../shared/asvsAutomationMap.js";
import { fetchAsvsPtRequirementsMap, mergePtIntoRequirement, buildChapterNamePtMap } from "./asvsPtCatalog.js";

export type AsvsRequirement = {
  chapter_id: string;
  chapter_name: string;
  section_id: string;
  section_name: string;
  req_id: string;
  req_description: string;
  L: string;
};

export type AsvsFlatDocument = {
  requirements: AsvsRequirement[];
};

export type AsvsImportProfile = "asvs_l1" | "asvs_full";

export type AsvsImportResult = {
  profile: AsvsImportProfile;
  checklistId: number;
  itemCount: number;
  categoryCount: number;
  sourceVersion: string;
  created: boolean;
};

const CHAPTER_COLORS = [
  "#22d3ee",
  "#a855f7",
  "#f97316",
  "#ef4444",
  "#eab308",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
  "#64748b",
  "#3b82f6",
  "#10b981",
  "#f43f5e",
  "#8b5cf6",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
  "#0ea5e9",
];

const PROFILE_CONFIG: Record<
  AsvsImportProfile,
  { name: string; namePt: string; externalId: string; maxLevel: number }
> = {
  asvs_l1: {
    name: "OWASP ASVS 5.0 — Level 1",
    namePt: "OWASP ASVS 5.0 — Nível 1",
    externalId: "asvs-5.0.0-l1",
    maxLevel: 1,
  },
  asvs_full: {
    name: "OWASP ASVS 5.0 — Complete",
    namePt: "OWASP ASVS 5.0 — Completo",
    externalId: "asvs-5.0.0-full",
    maxLevel: 3,
  },
};

function filterRequirements(requirements: AsvsRequirement[], maxLevel: number): AsvsRequirement[] {
  return requirements.filter((req) => {
    const level = Number.parseInt(req.L, 10);
    return Number.isFinite(level) && level <= maxLevel;
  });
}

function truncateTitle(description: string, maxLen = 255): string {
  const trimmed = description.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const cut = trimmed.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export async function fetchAsvsFlatDocument(url = ASVS5_FLAT_JSON_URL): Promise<AsvsFlatDocument> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar ASVS (${response.status}): ${url}`);
  }
  return (await response.json()) as AsvsFlatDocument;
}

export async function fetchLatestAsvsReleaseVersion(): Promise<string | null> {
  try {
    const response = await fetch(ASVS_GITHUB_RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { tag_name?: string };
    return data.tag_name?.replace(/^v/, "") ?? null;
  } catch {
    return null;
  }
}

export async function importAsvsChecklist(
  profile: AsvsImportProfile,
  options: {
    document?: AsvsFlatDocument;
    ptMap?: Map<string, import("./asvsPtCatalog.js").AsvsPtEntry>;
    sourceVersion?: string;
    force?: boolean;
  } = {}
): Promise<AsvsImportResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const config = PROFILE_CONFIG[profile];
  const sourceVersion = options.sourceVersion ?? ASVS_SOURCE_VERSION;
  const document = options.document ?? (await fetchAsvsFlatDocument());
  const ptMap = options.ptMap ?? (await fetchAsvsPtRequirementsMap());
  const chapterNamePt = buildChapterNamePtMap(ptMap);
  const requirements = filterRequirements(document.requirements ?? [], config.maxLevel);

  const [existing] = await db
    .select()
    .from(checklists)
    .where(eq(checklists.externalId, config.externalId))
    .limit(1);

  if (existing && !options.force && existing.sourceVersion === sourceVersion) {
    return {
      profile,
      checklistId: existing.id,
      itemCount: existing.itemCount,
      categoryCount: 0,
      sourceVersion,
      created: false,
    };
  }

  let checklistId: number;
  if (existing) {
    checklistId = existing.id;
    await db.delete(checklistItems).where(eq(checklistItems.checklistId, checklistId));
    await db.delete(checklistCategories).where(eq(checklistCategories.checklistId, checklistId));
    await db
      .update(checklists)
      .set({
        name: config.name,
        namePt: config.namePt,
        version: sourceVersion,
        profile,
        source: "owasp_asvs",
        sourceVersion,
        isActive: true,
        syncedAt: new Date(),
      })
      .where(eq(checklists.id, checklistId));
  } else {
    const [inserted] = await db
      .insert(checklists)
      .values({
        name: config.name,
        namePt: config.namePt,
        version: sourceVersion,
        profile,
        source: "owasp_asvs",
        sourceVersion,
        externalId: config.externalId,
        isActive: true,
        isDefault: false,
      })
      .returning();
    checklistId = inserted.id;
  }

  const chapters = new Map<string, { name: string; namePt: string | null; sortOrder: number }>();
  for (const req of requirements) {
    if (!chapters.has(req.chapter_id)) {
      const ptChapter = chapterNamePt.get(req.chapter_id) ?? null;
      chapters.set(req.chapter_id, {
        name: req.chapter_name,
        namePt: ptChapter,
        sortOrder: Number.parseInt(req.chapter_id.replace(/\D/g, ""), 10) || chapters.size + 1,
      });
    }
  }

  const categoryIdByChapter = new Map<string, number>();
  let colorIndex = 0;
  for (const [chapterId, chapter] of Array.from(chapters.entries()).sort(
    (a, b) => a[1].sortOrder - b[1].sortOrder
  )) {
    const [category] = await db
      .insert(checklistCategories)
      .values({
        checklistId,
        name: `${chapterId} — ${chapter.name}`,
        namePt: chapter.namePt ? `${chapterId} — ${chapter.namePt}` : null,
        description: `OWASP ASVS 5.0 ${chapterId}`,
        descriptionPt: chapter.namePt ? `OWASP ASVS 5.0 ${chapterId}` : null,
        color: CHAPTER_COLORS[colorIndex % CHAPTER_COLORS.length],
        sortOrder: chapter.sortOrder,
        chapterId,
      })
      .returning();
    categoryIdByChapter.set(chapterId, category.id);
    colorIndex++;
  }

  let sortOrder = 1;
  for (const req of requirements) {
    const categoryId = categoryIdByChapter.get(req.chapter_id);
    if (!categoryId) continue;

    const level = Number.parseInt(req.L, 10) || 2;
    const essentialCode = ASVS5_ESSENTIAL_AUTOMATION_MAP[req.req_id] ?? null;
    const automationProfile = resolveAutomationProfile(essentialCode);
    const ptFields = mergePtIntoRequirement(req, ptMap);

    await db.insert(checklistItems).values({
      checklistId,
      categoryId,
      code: req.req_id,
      title: truncateTitle(req.req_description),
      description: req.req_description,
      titlePt: ptFields.descriptionPt ? truncateTitle(ptFields.descriptionPt) : null,
      descriptionPt: ptFields.descriptionPt,
      owaspRef: `ASVS 5.0 ${req.req_id}`,
      asvsId: req.req_id,
      verificationLevel: level,
      sectionName: req.section_name,
      sectionNamePt: ptFields.sectionNamePt,
      automationProfile,
      essentialCode,
      externalSource: "owasp_asvs",
      suggestedSeverity: inferSeverityFromLevel(level),
      sortOrder: sortOrder++,
    });
  }

  const itemCount = requirements.length;
  await db
    .update(checklists)
    .set({ itemCount, syncedAt: new Date() })
    .where(eq(checklists.id, checklistId));

  return {
    profile,
    checklistId,
    itemCount,
    categoryCount: categoryIdByChapter.size,
    sourceVersion,
    created: !existing,
  };
}

export async function importAllAsvsChecklists(
  options: { force?: boolean; sourceVersion?: string } = {}
): Promise<AsvsImportResult[]> {
  const document = await fetchAsvsFlatDocument();
  const ptMap = await fetchAsvsPtRequirementsMap();
  const results: AsvsImportResult[] = [];
  for (const profile of ["asvs_l1", "asvs_full"] as AsvsImportProfile[]) {
    results.push(
      await importAsvsChecklist(profile, {
        document,
        ptMap,
        force: options.force,
        sourceVersion: options.sourceVersion,
      })
    );
  }
  return results;
}

export async function syncAsvsCatalog(options: { force?: boolean } = {}): Promise<{
  currentVersion: string;
  latestReleaseTag: string | null;
  results: AsvsImportResult[];
}> {
  const latestReleaseTag = await fetchLatestAsvsReleaseVersion();
  const results = await importAllAsvsChecklists({
    force: options.force ?? Boolean(latestReleaseTag && latestReleaseTag !== ASVS_SOURCE_VERSION),
    sourceVersion: ASVS_SOURCE_VERSION,
  });
  return {
    currentVersion: ASVS_SOURCE_VERSION,
    latestReleaseTag,
    results,
  };
}
