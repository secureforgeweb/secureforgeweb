import Joi from "joi";

// ─── Password Rules (exportadas para reuso no frontend) ────────────────────
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  special: /[^a-zA-Z0-9]/,
} as const;

/**
 * Verifica quais critérios de senha estão satisfeitos.
 * Retornado como objeto para uso no frontend (checklist visual).
 */
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

/**
 * Retorna true se todos os critérios de senha forem atendidos.
 */
export function isPasswordValid(password: string): boolean {
  const c = checkPasswordCriteria(password);
  return c.minLength && c.maxLength && c.lowercase && c.uppercase && c.digit && c.special;
}

// ─── Auth Schemas ──────────────────────────────────────────────────────────
export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Nome deve ter pelo menos 2 caracteres",
    "string.max": "Nome deve ter no máximo 100 caracteres",
    "any.required": "Nome é obrigatório",
  }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Email inválido",
      "any.required": "Email é obrigatório",
    }),
  password: Joi.string()
    .min(PASSWORD_RULES.minLength)
    .max(PASSWORD_RULES.maxLength)
    .pattern(PASSWORD_RULES.lowercase, "lowercase")
    .pattern(PASSWORD_RULES.uppercase, "uppercase")
    .pattern(PASSWORD_RULES.digit, "digit")
    .pattern(PASSWORD_RULES.special, "special")
    .required()
    .messages({
      "string.min": `Senha deve ter pelo menos ${PASSWORD_RULES.minLength} caracteres`,
      "string.max": `Senha deve ter no máximo ${PASSWORD_RULES.maxLength} caracteres`,
      "string.pattern.name": "Senha deve conter pelo menos: {{#name}}",
      "any.required": "Senha é obrigatória",
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required().messages({
    "string.email": "Email inválido",
    "any.required": "Email é obrigatório",
  }),
  password: Joi.string().required().messages({
    "any.required": "Senha é obrigatória",
  }),
});

// ─── Application Schemas ───────────────────────────────────────────────────
export const createApplicationSchema = Joi.object({
  name: Joi.string().min(2).max(255).required().messages({
    "string.min": "Nome deve ter pelo menos 2 caracteres",
    "string.max": "Nome deve ter no máximo 255 caracteres",
    "any.required": "Nome é obrigatório",
  }),
  baseUrl: Joi.string().uri({ allowRelative: false }).max(500).allow("", null).optional().messages({
    "string.uri": "URL base inválida (use http:// ou https://)",
    "string.max": "URL deve ter no máximo 500 caracteres",
  }),
  repositoryUrl: Joi.string().max(500).allow("", null).optional().messages({
    "string.max": "URL do repositório deve ter no máximo 500 caracteres",
  }),
  description: Joi.string().max(5000).allow("", null).optional(),
  techStack: Joi.string().max(255).allow("", null).optional(),
}).custom((value, helpers) => {
  const baseUrl = typeof value.baseUrl === "string" ? value.baseUrl.trim() : "";
  const repositoryUrl =
    typeof value.repositoryUrl === "string" ? value.repositoryUrl.trim() : "";
  if (!baseUrl && !repositoryUrl) {
    return helpers.error("application.urlsRequired");
  }
  return value;
}).messages({
  "application.urlsRequired":
    "Informe a URL base ou o repositório Git — pelo menos um é necessário para análises automáticas.",
});

export const updateApplicationSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  baseUrl: Joi.string().uri({ allowRelative: false }).max(500).allow("", null).optional(),
  repositoryUrl: Joi.string().max(500).allow("", null).optional(),
  description: Joi.string().max(5000).allow("", null).optional(),
  techStack: Joi.string().max(255).allow("", null).optional(),
}).min(1);

// ─── Analysis Schemas ──────────────────────────────────────────────────────
const COMPLIANCE_VALUES = ["conforme", "parcial", "nao_conforme", "nao_aplicavel"] as const;

export const saveResponsesSchema = Joi.object({
  responses: Joi.array()
    .items(
      Joi.object({
        itemId: Joi.number().integer().positive().required(),
        compliance: Joi.string()
          .valid(...COMPLIANCE_VALUES)
          .required()
          .messages({ "any.only": "Conformidade inválida" }),
        notes: Joi.string().max(2000).allow("", null).optional(),
      })
    )
    .min(1)
    .required(),
});

export const createAnalysisSchema = Joi.object({
  applicationId: Joi.number().integer().positive().required(),
  title: Joi.string().min(2).max(255).optional(),
});

// ─── Finding Schemas ─────────────────────────────────────────────────────────
const SEVERITY_VALUES = ["critical", "high", "medium", "low"] as const;
const PRIORITY_VALUES = ["imediata", "curto_prazo", "medio_prazo", "baixa"] as const;
const FINDING_STATUS_VALUES = ["aberto", "em_correcao", "resolvido", "aceito_risco"] as const;

export const createFindingSchema = Joi.object({
  analysisId: Joi.number().integer().positive().required(),
  itemId: Joi.number().integer().positive().optional().allow(null),
  title: Joi.string().min(3).max(255).required().messages({
    "string.min": "Título deve ter pelo menos 3 caracteres",
    "any.required": "Título é obrigatório",
  }),
  description: Joi.string().max(5000).allow("", null).optional(),
  severity: Joi.string()
    .valid(...SEVERITY_VALUES)
    .optional(),
  priority: Joi.string()
    .valid(...PRIORITY_VALUES)
    .optional(),
  evidence: Joi.string().max(5000).allow("", null).optional(),
});

export const updateFindingSchema = Joi.object({
  title: Joi.string().min(3).max(255).optional(),
  description: Joi.string().max(5000).allow("", null).optional(),
  severity: Joi.string()
    .valid(...SEVERITY_VALUES)
    .optional(),
  evidence: Joi.string().max(5000).allow("", null).optional(),
  notes: Joi.string().max(5000).allow("", null).optional(),
}).min(1);

export const updateFindingStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...FINDING_STATUS_VALUES)
    .required()
    .messages({ "any.only": "Status inválido" }),
  comment: Joi.string().max(2000).allow("", null).optional(),
});

export const listFindingsSchema = Joi.object({
  applicationId: Joi.number().integer().positive().required(),
  severity: Joi.string()
    .valid(...SEVERITY_VALUES)
    .optional(),
  status: Joi.string()
    .valid(...FINDING_STATUS_VALUES)
    .optional(),
  categoryId: Joi.number().integer().positive().optional(),
});

// ─── Incident Schemas ──────────────────────────────────────────────────────
export const createIncidentSchema = Joi.object({
  title: Joi.string().min(3).max(255).required().messages({
    "string.min": "Título deve ter pelo menos 3 caracteres",
    "string.max": "Título deve ter no máximo 255 caracteres",
    "any.required": "Título é obrigatório",
  }),
  description: Joi.string().min(10).max(5000).required().messages({
    "string.min": "Descrição deve ter pelo menos 10 caracteres",
    "string.max": "Descrição deve ter no máximo 5000 caracteres",
    "any.required": "Descrição é obrigatória",
  }),
});

export function validateJoi<T>(schema: Joi.Schema, data: unknown): T {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message).join("; ");
    throw new Error(messages);
  }
  return value as T;
}
