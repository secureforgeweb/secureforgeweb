/**
 * Redação de dados sensíveis em logs (DATA-02).
 * Evita gravar senhas, tokens e URLs de reset completas.
 */
const SENSITIVE_KEY =
  /pass(word)?|token|secret|authorization|api[_-]?key|cookie|cpf|ssn|jwt/i;

export function redactSensitive(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    return value
      .replace(/(https?:\/\/[^\s]+(?:token|reset-password)[^\s]*)/gi, "[REDACTED_URL]")
      .replace(/([?&](?:token|key|secret)=)[^&\s]+/gi, "$1[REDACTED]")
      .replace(/\b[A-Za-z0-9_-]{24,}\b/g, (m) => (m.length > 40 ? "[REDACTED_TOKEN]" : m));
  }
  if (typeof value === "object") {
    try {
      const clone: Record<string, unknown> = { ...(value as Record<string, unknown>) };
      for (const key of Object.keys(clone)) {
        if (SENSITIVE_KEY.test(key)) clone[key] = "[REDACTED]";
        else if (typeof clone[key] === "string") clone[key] = redactSensitive(clone[key]);
      }
      return JSON.stringify(clone);
    } catch {
      return "[unserializable]";
    }
  }
  return String(value);
}

/** Logger seguro: aplica redactSensitive em todos os argumentos. */
export function safeLog(level: "log" | "warn" | "error", prefix: string, ...parts: unknown[]): void {
  const rendered = parts.map((p) => redactSensitive(p));
  console[level](prefix, ...rendered);
}
