import {
  ASVS5_FLAT_JSON_URL_PT,
  ASVS5_PT_MARKDOWN_INDEX_URL,
} from "../../shared/asvsAutomationMap.js";

export type AsvsPtFlatRequirement = {
  chapter_id: string;
  chapter_name: string;
  section_id: string;
  section_name: string;
  req_id: string;
  req_description: string;
  L: string;
};

export type AsvsPtFlatDocument = {
  requirements: AsvsPtFlatRequirement[];
};

export type AsvsRequirementRef = Pick<
  AsvsPtFlatRequirement,
  "req_id" | "chapter_name" | "section_name" | "req_description"
>;

export type AsvsPtEntry = {
  req_id: string;
  req_description: string;
  chapter_name?: string;
  section_name?: string;
};

const PT_MD_FILE_RE = /^0x\d+-V\d+-.+\.md$/i;
const CHAPTER_HEADER_RE = /^#\s+(V\d+)\s+(.+)$/;
const SECTION_HEADER_RE = /^##\s+(.+)$/;
const TABLE_ROW_RE = /\|\s*\*\*(\d+(?:\.\d+)+)\*\*\s*\|\s*([^|]+?)\s*\|\s*\d+\s*\|/;

function normalizeReqId(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith("V") ? trimmed : `V${trimmed}`;
}

export function parseAsvsPtMarkdown(content: string): AsvsPtEntry[] {
  let chapterName: string | undefined;
  let currentSection = "";
  const entries: AsvsPtEntry[] = [];

  for (const line of content.split("\n")) {
    const chapterMatch = line.match(CHAPTER_HEADER_RE);
    if (chapterMatch && !chapterName) {
      chapterName = chapterMatch[2]?.trim();
    }

    const sectionMatch = line.match(SECTION_HEADER_RE);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    const rowMatch = line.match(TABLE_ROW_RE);
    if (!rowMatch) continue;

    entries.push({
      req_id: normalizeReqId(rowMatch[1]),
      req_description: rowMatch[2].trim(),
      chapter_name: chapterName,
      section_name: currentSection || undefined,
    });
  }

  return entries;
}

async function fetchPtFlatDocument(): Promise<AsvsPtFlatDocument | null> {
  if (!ASVS5_FLAT_JSON_URL_PT) return null;
  try {
    const response = await fetch(ASVS5_FLAT_JSON_URL_PT);
    if (!response.ok) return null;
    return (await response.json()) as AsvsPtFlatDocument;
  } catch {
    return null;
  }
}

async function fetchPtFromMarkdown(): Promise<Map<string, AsvsPtEntry>> {
  const map = new Map<string, AsvsPtEntry>();

  const indexResponse = await fetch(ASVS5_PT_MARKDOWN_INDEX_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "secureforgeweb-asvs-import",
    },
  });
  if (!indexResponse.ok) {
    throw new Error(`Falha ao listar traduções pt-BR ASVS (${indexResponse.status})`);
  }

  const files = (await indexResponse.json()) as Array<{ name: string; download_url: string }>;
  for (const file of files) {
    if (!PT_MD_FILE_RE.test(file.name)) continue;

    const mdResponse = await fetch(file.download_url);
    if (!mdResponse.ok) continue;

    const parsed = parseAsvsPtMarkdown(await mdResponse.text());
    for (const entry of parsed) {
      map.set(entry.req_id, entry);
    }
  }

  return map;
}

export async function fetchAsvsPtRequirementsMap(): Promise<Map<string, AsvsPtEntry>> {
  const flatDoc = await fetchPtFlatDocument();
  if (flatDoc?.requirements?.length) {
    const map = new Map<string, AsvsPtEntry>();
    for (const req of flatDoc.requirements) {
      map.set(req.req_id, {
        req_id: req.req_id,
        req_description: req.req_description,
        chapter_name: req.chapter_name,
        section_name: req.section_name,
      });
    }
    return map;
  }

  return fetchPtFromMarkdown();
}

export function buildChapterNamePtMap(ptMap: Map<string, AsvsPtEntry>): Map<string, string> {
  const chapters = new Map<string, string>();
  for (const entry of Array.from(ptMap.values())) {
    const chapterId = entry.req_id.match(/^(V\d+)/)?.[1];
    if (chapterId && entry.chapter_name && !chapters.has(chapterId)) {
      chapters.set(chapterId, entry.chapter_name);
    }
  }
  return chapters;
}

export function mergePtIntoRequirement(
  req: AsvsRequirementRef,
  ptMap: Map<string, AsvsPtEntry>
): { titlePt: string | null; descriptionPt: string | null; sectionNamePt: string | null } {
  const pt = ptMap.get(req.req_id);
  if (!pt) {
    return { titlePt: null, descriptionPt: null, sectionNamePt: null };
  }
  return {
    titlePt: pt.req_description.slice(0, 255),
    descriptionPt: pt.req_description,
    sectionNamePt: pt.section_name ?? null,
  };
}
