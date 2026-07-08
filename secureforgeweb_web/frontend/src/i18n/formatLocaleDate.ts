import type { ChecklistLocale } from "@shared/checklistLocale";

export function getDateLocale(locale: ChecklistLocale): string {
  return locale === "pt" ? "pt-BR" : "en-US";
}

export function formatLocaleDate(
  locale: ChecklistLocale,
  value: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(getDateLocale(locale), options);
}

export function formatLocaleDateTime(
  locale: ChecklistLocale,
  value: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(getDateLocale(locale), options);
}
