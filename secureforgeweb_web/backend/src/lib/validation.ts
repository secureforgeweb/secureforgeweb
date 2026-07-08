import Joi from "joi";
import { apiError, type ApiErrorKey } from "../../shared/apiErrors.js";
import type { ChecklistLocale } from "../../shared/checklistLocale.js";

export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  special: /[^a-zA-Z0-9]/,
} as const;

export function checkPasswordCriteria(password: string) {
  return {
    minLength: password.length >= PASSWORD_RULES.minLength,
    maxLength: password.length <= PASSWORD_RULES.maxLength,
    lowercase: PASSWORD_RULES.lowercase.test(password),
    uppercase: PASSWORD_RULES.uppercase.test(password),
    digit: PASSWORD_RULES.digit.test(password),
    special: PASSWORD_RULES.special.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const c = checkPasswordCriteria(password);
  return c.minLength && c.maxLength && c.lowercase && c.uppercase && c.digit && c.special;
}

function msg(locale: ChecklistLocale, key: ApiErrorKey, params?: Record<string, string | number>) {
  return apiError(key, locale, params);
}

export function getRegisterSchema(locale: ChecklistLocale) {
  return Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      "string.min": msg(locale, "validation.nameMin"),
      "string.max": msg(locale, "validation.nameMax100"),
      "any.required": msg(locale, "validation.nameRequired"),
    }),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.email": msg(locale, "validation.emailInvalid"),
        "any.required": msg(locale, "validation.emailRequired"),
      }),
    password: Joi.string()
      .min(PASSWORD_RULES.minLength)
      .max(PASSWORD_RULES.maxLength)
      .pattern(PASSWORD_RULES.lowercase)
      .pattern(PASSWORD_RULES.uppercase)
      .pattern(PASSWORD_RULES.digit)
      .pattern(PASSWORD_RULES.special)
      .required()
      .messages({
        "string.min": msg(locale, "validation.passwordMin", { min: PASSWORD_RULES.minLength }),
        "string.max": msg(locale, "validation.passwordMax", { max: PASSWORD_RULES.maxLength }),
        "string.pattern.base": msg(locale, "validation.passwordPattern"),
        "any.required": msg(locale, "validation.passwordRequired"),
      }),
  });
}

export function getLoginSchema(locale: ChecklistLocale) {
  return Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required().messages({
      "string.email": msg(locale, "validation.emailInvalid"),
      "any.required": msg(locale, "validation.emailRequired"),
    }),
    password: Joi.string().required().messages({
      "any.required": msg(locale, "validation.passwordRequired"),
    }),
  });
}

export function getApplicationSchema(locale: ChecklistLocale) {
  return Joi.object({
    name: Joi.string().min(2).max(255).required().messages({
      "string.min": msg(locale, "validation.nameMin"),
      "string.max": msg(locale, "validation.nameMax255"),
      "any.required": msg(locale, "validation.nameRequired"),
    }),
    baseUrl: Joi.string().uri({ allowRelative: false }).max(500).allow("", null).optional().messages({
      "string.uri": msg(locale, "validation.baseUrlInvalid"),
      "string.max": msg(locale, "validation.baseUrlMax"),
    }),
    repositoryUrl: Joi.string().max(500).allow("", null).optional().messages({
      "string.max": msg(locale, "validation.repoUrlMax"),
    }),
    description: Joi.string().max(5000).allow("", null).optional(),
    techStack: Joi.string().max(255).allow("", null).optional(),
  })
    .custom((value, helpers) => {
      const baseUrl = typeof value.baseUrl === "string" ? value.baseUrl.trim() : "";
      const repositoryUrl =
        typeof value.repositoryUrl === "string" ? value.repositoryUrl.trim() : "";
      if (!baseUrl && !repositoryUrl) {
        return helpers.error("application.urlsRequired");
      }
      return value;
    })
    .messages({
      "application.urlsRequired": msg(locale, "validation.applicationUrlsRequired"),
    });
}

export function getUpdateApplicationSchema(locale: ChecklistLocale) {
  return Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    baseUrl: Joi.string().uri({ allowRelative: false }).max(500).allow("", null).optional(),
    repositoryUrl: Joi.string().max(500).allow("", null).optional(),
    description: Joi.string().max(5000).allow("", null).optional(),
    techStack: Joi.string().max(255).allow("", null).optional(),
  }).min(1);
}

const COMPLIANCE_VALUES = ["conforme", "parcial", "nao_conforme", "nao_aplicavel"] as const;

export function getSaveResponsesSchema(locale: ChecklistLocale) {
  return Joi.object({
    responses: Joi.array()
      .items(
        Joi.object({
          itemId: Joi.number().integer().positive().required(),
          compliance: Joi.string()
            .valid(...COMPLIANCE_VALUES)
            .required()
            .messages({ "any.only": msg(locale, "validation.complianceInvalid") }),
          notes: Joi.string().max(2000).allow("", null).optional(),
        })
      )
      .min(1)
      .required(),
  });
}

export function getAnalysisSchema(locale: ChecklistLocale) {
  return Joi.object({
    applicationId: Joi.number().integer().positive().required(),
    title: Joi.string().min(2).max(255).optional(),
    checklistId: Joi.number().integer().positive().optional(),
  });
}

const SEVERITY_VALUES = ["critical", "high", "medium", "low"] as const;
const PRIORITY_VALUES = ["imediata", "curto_prazo", "medio_prazo", "baixa"] as const;
const FINDING_STATUS_VALUES = ["aberto", "em_correcao", "resolvido", "aceito_risco"] as const;

export function getFindingSchema(locale: ChecklistLocale) {
  return Joi.object({
    analysisId: Joi.number().integer().positive().required(),
    itemId: Joi.number().integer().positive().optional().allow(null),
    title: Joi.string().min(3).max(255).required().messages({
      "string.min": msg(locale, "validation.titleMin"),
      "any.required": msg(locale, "validation.titleRequired"),
    }),
    description: Joi.string().max(5000).allow("", null).optional(),
    severity: Joi.string().valid(...SEVERITY_VALUES).optional(),
    priority: Joi.string().valid(...PRIORITY_VALUES).optional(),
    evidence: Joi.string().max(5000).allow("", null).optional(),
  });
}

export function getUpdateFindingSchema(locale: ChecklistLocale) {
  return Joi.object({
    title: Joi.string().min(3).max(255).optional(),
    description: Joi.string().max(5000).allow("", null).optional(),
    severity: Joi.string().valid(...SEVERITY_VALUES).optional(),
    evidence: Joi.string().max(5000).allow("", null).optional(),
    notes: Joi.string().max(5000).allow("", null).optional(),
  }).min(1);
}

export function getUpdateFindingStatusSchema(locale: ChecklistLocale) {
  return Joi.object({
    status: Joi.string()
      .valid(...FINDING_STATUS_VALUES)
      .required()
      .messages({ "any.only": msg(locale, "validation.statusInvalid") }),
    comment: Joi.string().max(2000).allow("", null).optional(),
  });
}

export function getListFindingsSchema(locale: ChecklistLocale) {
  return Joi.object({
    applicationId: Joi.number().integer().positive().required(),
    severity: Joi.string().valid(...SEVERITY_VALUES).optional(),
    status: Joi.string().valid(...FINDING_STATUS_VALUES).optional(),
    categoryId: Joi.number().integer().positive().optional(),
  });
}

export function getIncidentSchema(locale: ChecklistLocale) {
  return Joi.object({
    title: Joi.string().min(3).max(255).required().messages({
      "string.min": msg(locale, "validation.titleMin"),
      "string.max": msg(locale, "validation.titleMax"),
      "any.required": msg(locale, "validation.titleRequired"),
    }),
    description: Joi.string().min(10).max(5000).required().messages({
      "string.min": msg(locale, "validation.descriptionMin"),
      "string.max": msg(locale, "validation.descriptionMax"),
      "any.required": msg(locale, "validation.descriptionRequired"),
    }),
  });
}

export function validateJoi<T>(schema: Joi.Schema, data: unknown): T {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message).join("; ");
    throw new Error(messages);
  }
  return value as T;
}

// Legacy PT schema exports for existing tests
export const registerSchema = getRegisterSchema("pt");
export const loginSchema = getLoginSchema("pt");
export const createApplicationSchema = getApplicationSchema("pt");
export const updateApplicationSchema = getUpdateApplicationSchema("pt");
export const saveResponsesSchema = getSaveResponsesSchema("pt");
export const createAnalysisSchema = getAnalysisSchema("pt");
export const createFindingSchema = getFindingSchema("pt");
export const updateFindingSchema = getUpdateFindingSchema("pt");
export const updateFindingStatusSchema = getUpdateFindingStatusSchema("pt");
export const listFindingsSchema = getListFindingsSchema("pt");
export const createIncidentSchema = getIncidentSchema("pt");
