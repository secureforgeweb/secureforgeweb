export type ChecklistLocale = "en" | "pt";

export const CHECKLIST_LOCALE_STORAGE_KEY = "secureforgeweb-checklist-locale";

export function isChecklistLocale(value: string | null | undefined): value is ChecklistLocale {
  return value === "en" || value === "pt";
}

export function pickLocalizedText(
  locale: ChecklistLocale,
  primary: string,
  translated: string | null | undefined
): string {
  if (locale === "pt") {
    return translated?.trim() || primary;
  }
  return primary;
}

export type LocalizedChecklistItem = {
  title: string;
  description: string;
  titlePt?: string | null;
  descriptionPt?: string | null;
  externalSource?: string | null;
};

export function resolveItemTitle(item: LocalizedChecklistItem, locale: ChecklistLocale): string {
  return pickLocalizedText(locale, item.title, item.titlePt);
}

export function resolveItemDescription(item: LocalizedChecklistItem, locale: ChecklistLocale): string {
  return pickLocalizedText(locale, item.description, item.descriptionPt);
}

export type LocalizedChecklistCategory = {
  name: string;
  description?: string | null;
  namePt?: string | null;
  descriptionPt?: string | null;
};

export function resolveCategoryName(category: LocalizedChecklistCategory, locale: ChecklistLocale): string {
  return pickLocalizedText(locale, category.name, category.namePt);
}
