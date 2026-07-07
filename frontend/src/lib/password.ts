export const PASSWORD_CRITERIA = [
  { key: "minLength", label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { key: "hasLower", label: "Letra minúscula (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { key: "hasUpper", label: "Letra maiúscula (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { key: "hasNumber", label: "Número (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { key: "hasSpecial", label: "Caractere especial", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const;

export function checkPasswordCriteria(password: string) {
  return PASSWORD_CRITERIA.map((c) => ({
    ...c,
    met: password.length > 0 && c.test(password),
  }));
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_CRITERIA.every((c) => c.test(password));
}
