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
