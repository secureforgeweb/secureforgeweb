import type { ChecklistLocale } from "./checklistLocale.js";
import { isChecklistLocale } from "./checklistLocale.js";

export const LOCALE_HEADER = "x-locale";

export function parseRequestLocale(
  headerValue: string | string[] | undefined
): ChecklistLocale {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return isChecklistLocale(raw) ? raw : "pt";
}
