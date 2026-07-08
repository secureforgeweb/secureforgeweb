import { HTTP_ASSESSMENT_ITEM_CODES } from "../src/services/checklistAssessor.js";
import { GIT_ASSESSMENT_ITEM_CODES } from "../src/services/gitRepoAssessor.js";
import { AI_ASSESSMENT_ITEM_CODES } from "../src/services/aiChecklistAssessor.js";

/** OWASP ASVS 5.0 req_id → código Essential (automação existente). */
export const ASVS5_ESSENTIAL_AUTOMATION_MAP: Record<string, string> = {
  "V6.2.1": "AUTH-01",
  "V11.4.2": "AUTH-02",
  "V6.3.1": "AUTH-03",
  "V7.1.1": "AUTH-04",
  "V8.2.1": "AUTHZ-01",
  "V8.2.2": "AUTHZ-02",
  "V8.2.3": "AUTHZ-03",
  "V1.2.1": "INPUT-01",
  "V1.2.4": "INPUT-02",
  "V1.2.3": "INPUT-03",
  "V13.3.1": "SECRET-01",
  "V13.3.2": "SECRET-02",
  "V3.4.3": "HEADER-01",
  "V3.4.1": "HEADER-02",
  "V3.4.6": "HEADER-03",
  "V3.4.4": "HEADER-04",
  "V4.2.1": "EXPOS-01",
  "V14.2.1": "EXPOS-02",
  "V16.5.1": "ERROR-01",
  "V16.5.2": "ERROR-02",
  "V12.2.1": "DATA-01",
  "V17.1.1": "DATA-02",
  "V15.2.4": "SURF-02",
  "V1.1.1": "SURF-01",
};

export const ASVS5_FLAT_JSON_URL =
  "https://github.com/OWASP/ASVS/raw/v5.0.0/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.flat.json";

/** Quando a OWASP publicar flat.json pt-BR oficial, apontar aqui. */
export const ASVS5_FLAT_JSON_URL_PT =
  "https://github.com/OWASP/ASVS/raw/v5.0.0/5.0/docs_pt-br/OWASP_Application_Security_Verification_Standard_5.0.0_pt-br.flat.json";

/** Tradução pt-BR comunitária (PR OWASP #3362) — markdown até existir flat.json. */
export const ASVS5_PT_MARKDOWN_INDEX_URL =
  "https://api.github.com/repos/vhnogueira9/ASVS/contents/5.0/pt?ref=traducao-ptbr";

export const ASVS_SOURCE_VERSION = "5.0.0";

export const ASVS_GITHUB_RELEASES_URL = "https://api.github.com/repos/OWASP/ASVS/releases/latest";

export type AutomationProfile = "http" | "git" | "ai" | "manual";

export function resolveAutomationProfile(
  essentialCode: string | null | undefined
): AutomationProfile | null {
  if (!essentialCode) return null;
  if ((HTTP_ASSESSMENT_ITEM_CODES as readonly string[]).includes(essentialCode)) return "http";
  if ((GIT_ASSESSMENT_ITEM_CODES as readonly string[]).includes(essentialCode)) return "git";
  if ((AI_ASSESSMENT_ITEM_CODES as readonly string[]).includes(essentialCode)) return "ai";
  return "manual";
}

export function inferSeverityFromLevel(level: number): "critical" | "high" | "medium" | "low" {
  if (level <= 1) return "high";
  if (level === 2) return "medium";
  return "low";
}
