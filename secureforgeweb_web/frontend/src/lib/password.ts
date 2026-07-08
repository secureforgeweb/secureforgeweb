import type { MessageKey } from "@/i18n/messages";

export const PASSWORD_CRITERIA_DEFS = [
  { key: "minLength", labelKey: "password.minLength" as MessageKey, test: (p: string) => p.length >= 8 },
  { key: "hasLower", labelKey: "password.hasLower" as MessageKey, test: (p: string) => /[a-z]/.test(p) },
  { key: "hasUpper", labelKey: "password.hasUpper" as MessageKey, test: (p: string) => /[A-Z]/.test(p) },
  { key: "hasNumber", labelKey: "password.hasNumber" as MessageKey, test: (p: string) => /[0-9]/.test(p) },
  { key: "hasSpecial", labelKey: "password.hasSpecial" as MessageKey, test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const;

/** @deprecated Use checkPasswordCriteria with t() */
export const PASSWORD_CRITERIA = PASSWORD_CRITERIA_DEFS.map((c) => ({
  ...c,
  label: c.labelKey,
}));

export function checkPasswordCriteria(
  password: string,
  t?: (key: MessageKey) => string
) {
  return PASSWORD_CRITERIA_DEFS.map((c) => ({
    key: c.key,
    label: t ? t(c.labelKey) : c.labelKey,
    met: password.length > 0 && c.test(password),
  }));
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_CRITERIA_DEFS.every((c) => c.test(password));
}
