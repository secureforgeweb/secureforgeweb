import { TRPCError } from "@trpc/server";
import { apiError, type ApiErrorKey } from "../../shared/apiErrors.js";
import type { ChecklistLocale } from "../../shared/checklistLocale.js";

export function throwApiError(
  code: TRPCError["code"],
  locale: ChecklistLocale,
  key: ApiErrorKey,
  params?: Record<string, string | number>
): never {
  throw new TRPCError({ code, message: apiError(key, locale, params) });
}

/** True when a message looks like a controlled, user-facing string (not a stack dump). */
function isLikelyClientFacingMessage(message: string): boolean {
  if (message.length > 400) return false;
  return !/\n\s+at\s+|ECONNREFUSED|ENOENT|EACCES|postgres|drizzle|AggregateError|TypeError:|ReferenceError:/i.test(
    message
  );
}

/**
 * ERROR-02: never forward raw internal err.message to the client.
 * Prefer TRPCError / short localized validation messages; otherwise a safe fallback key.
 */
export function toClientErrorMessage(
  err: unknown,
  locale: ChecklistLocale,
  fallbackKey: ApiErrorKey
): string {
  if (err instanceof TRPCError) return err.message;
  if (err instanceof Error && isLikelyClientFacingMessage(err.message)) {
    return err.message;
  }
  return apiError(fallbackKey, locale);
}
