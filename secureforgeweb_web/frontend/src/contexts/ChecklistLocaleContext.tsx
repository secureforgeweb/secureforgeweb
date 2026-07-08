import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  CHECKLIST_LOCALE_STORAGE_KEY,
  type ChecklistLocale,
  isChecklistLocale,
} from "@shared/checklistLocale";
import { translate, type MessageKey } from "@/i18n/messages";

type ChecklistLocaleContextType = {
  locale: ChecklistLocale;
  setLocale: (locale: ChecklistLocale) => void;
  toggleLocale: () => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
};

const ChecklistLocaleContext = createContext<ChecklistLocaleContextType | undefined>(undefined);

export function ChecklistLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<ChecklistLocale>(() => {
    const stored = localStorage.getItem(CHECKLIST_LOCALE_STORAGE_KEY);
    return isChecklistLocale(stored) ? stored : "pt";
  });

  useEffect(() => {
    localStorage.setItem(CHECKLIST_LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
  }, [locale]);

  const setLocale = (next: ChecklistLocale) => setLocaleState(next);
  const toggleLocale = () => setLocaleState((prev) => (prev === "pt" ? "en" : "pt"));
  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale]
  );

  return (
    <ChecklistLocaleContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </ChecklistLocaleContext.Provider>
  );
}

export function useChecklistLocale() {
  const context = useContext(ChecklistLocaleContext);
  if (!context) {
    throw new Error("useChecklistLocale must be used within ChecklistLocaleProvider");
  }
  return context;
}

/** Alias for UI + checklist locale (same context). */
export const useLocale = useChecklistLocale;
