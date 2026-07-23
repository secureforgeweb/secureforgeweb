import type { ChecklistLocale } from "./checklistLocale.js";

export const API_ERROR_MESSAGES = {
  pt: {
    "application.notFound": "Aplicação não encontrada",
    "analysis.notFound": "Análise não encontrada",
    "finding.notFound": "Achado não encontrado",
    "auth.emailTaken": "Email já cadastrado",
    "auth.invalidCredentials": "Credenciais inválidas",
    "auth.passwordRequirements":
      "A senha não atende aos requisitos de segurança (mín. 8 caracteres, maiúscula, minúscula, número e caractere especial).",
    "auth.newPasswordRequirements":
      "A nova senha não atende aos requisitos de segurança (mín. 8 caracteres, maiúscula, minúscula, número e caractere especial).",
    "auth.tokenInvalid": "Token inválido",
    "auth.tokenUsed": "Token já utilizado",
    "auth.tokenExpired": "Token expirado. Solicite uma nova redefinição.",
    "auth.noLocalPassword": "Usuário não possui senha local",
    "auth.wrongCurrentPassword": "Senha atual incorreta",
    "auth.adminOnly": "Acesso restrito a administradores",
    "auth.analystOnly": "Apenas analistas de segurança ou administradores podem executar esta ação",
    "admin.cannotChangeOwnRole": "Você não pode alterar seu próprio perfil",
    "admin.useProfileToEditSelf": "Use a página de perfil para editar seus próprios dados",
    "admin.cannotDeleteSelf": "Você não pode excluir sua própria conta",
    "admin.useProfileToChangePassword": "Use a página de perfil para alterar sua própria senha",
    "admin.nothingToUpdate": "Nenhum campo para atualizar",
    "checklistItem.notFound": "Item de checklist não encontrado",
    "analysis.alreadyCompleted": "Análise já concluída — não é possível executar nova avaliação automática.",
    "assessment.noValidItems": "Nenhum item válido selecionado para esta avaliação.",
    "assessment.missingBaseUrl":
      "Cadastre a URL base da aplicação antes de executar a análise HTTP (editar aplicação → URL base).",
    "assessment.missingRepoUrl":
      "Cadastre a URL do repositório Git antes de executar a análise de código (editar aplicação → Repositório Git).",
    "assessment.missingUrlsForAi": "Cadastre URL base e/ou repositório Git para o assistente IA.",
    "assessment.unsupportedScope": "Escopo de avaliação não suportado",
    "assessment.autoFailed": "Falha na avaliação automática",
    "analysis.completeAllItems": "Responda todos os itens antes de concluir ({answered}/{total})",
    "analysis.invalidChecklistItem": "Item de checklist inválido: {itemId}",
    "ai.missingBaseUrl": "Informe a URL base da API do provedor.",
    "ai.missingApiKey": "Informe a chave de API para habilitar o assistente IA.",
    "ai.apiKeyNotConfigured": "Chave de API não configurada.",
    "ai.baseUrlNotConfigured": "URL base da API não configurada.",
    "ai.invalidApiKey": "Chave de API inválida ou expirada. Verifique a chave no painel do provedor e salve novamente.",
    "ai.accessDenied": "Acesso negado pela API. Confirme permissões da chave e se o modelo está disponível na sua conta.",
    "ai.endpointNotFound": "Endpoint ou modelo não encontrado. Revise a URL base e o nome do modelo.",
    "ai.quotaExceeded":
      "Cota ou limite de uso excedido na conta do provedor (HTTP 429). Para OpenAI: adicione créditos em platform.openai.com/settings/organization/billing ou use outro provedor (ex.: Google Gemini) no seletor acima.{detail}",
    "ai.providerUnavailable": "Serviço do provedor indisponível (HTTP {status}). Tente novamente em alguns minutos.",
    "ai.apiFailed": "Falha na API (HTTP {status}){detail}",
    "error.badRequest": "Requisição inválida",
    "validation.nameMin": "Nome deve ter pelo menos 2 caracteres",
    "validation.nameMax100": "Nome deve ter no máximo 100 caracteres",
    "validation.nameMax255": "Nome deve ter no máximo 255 caracteres",
    "validation.nameRequired": "Nome é obrigatório",
    "validation.emailInvalid": "Email inválido",
    "validation.emailRequired": "Email é obrigatório",
    "validation.passwordMin": "Senha deve ter pelo menos {min} caracteres",
    "validation.passwordMax": "Senha deve ter no máximo {max} caracteres",
    "validation.passwordPattern": "Senha deve conter letra minúscula, maiúscula, número e caractere especial",
    "validation.passwordRequired": "Senha é obrigatória",
    "validation.baseUrlInvalid": "URL base inválida (use http:// ou https://)",
    "validation.baseUrlMax": "URL deve ter no máximo 500 caracteres",
    "validation.repoUrlMax": "URL do repositório deve ter no máximo 500 caracteres",
    "validation.applicationUrlsRequired":
      "Informe a URL base ou o repositório Git — pelo menos um é necessário para análises automáticas.",
    "validation.complianceInvalid": "Conformidade inválida",
    "validation.titleMin": "Título deve ter pelo menos 3 caracteres",
    "validation.titleMax": "Título deve ter no máximo 255 caracteres",
    "validation.titleRequired": "Título é obrigatório",
    "validation.descriptionMin": "Descrição deve ter pelo menos 10 caracteres",
    "validation.descriptionMax": "Descrição deve ter no máximo 5000 caracteres",
    "validation.descriptionRequired": "Descrição é obrigatória",
    "validation.statusInvalid": "Status inválido",
  },
  en: {
    "application.notFound": "Application not found",
    "analysis.notFound": "Analysis not found",
    "finding.notFound": "Finding not found",
    "auth.emailTaken": "Email already registered",
    "auth.invalidCredentials": "Invalid credentials",
    "auth.passwordRequirements":
      "Password does not meet security requirements (min. 8 characters, uppercase, lowercase, number, and special character).",
    "auth.newPasswordRequirements":
      "New password does not meet security requirements (min. 8 characters, uppercase, lowercase, number, and special character).",
    "auth.tokenInvalid": "Invalid token",
    "auth.tokenUsed": "Token already used",
    "auth.tokenExpired": "Token expired. Request a new reset link.",
    "auth.noLocalPassword": "User does not have a local password",
    "auth.wrongCurrentPassword": "Current password is incorrect",
    "auth.adminOnly": "Access restricted to administrators",
    "auth.analystOnly": "Only security analysts or administrators can perform this action",
    "admin.cannotChangeOwnRole": "You cannot change your own role",
    "admin.useProfileToEditSelf": "Use the profile page to edit your own data",
    "admin.cannotDeleteSelf": "You cannot delete your own account",
    "admin.useProfileToChangePassword": "Use the profile page to change your own password",
    "admin.nothingToUpdate": "No fields to update",
    "checklistItem.notFound": "Checklist item not found",
    "analysis.alreadyCompleted": "Analysis already completed — cannot run a new automated assessment.",
    "assessment.noValidItems": "No valid items selected for this assessment.",
    "assessment.missingBaseUrl":
      "Register the application base URL before running HTTP analysis (edit application → Base URL).",
    "assessment.missingRepoUrl":
      "Register the Git repository URL before running code analysis (edit application → Git Repository).",
    "assessment.missingUrlsForAi": "Register base URL and/or Git repository for the AI assistant.",
    "assessment.unsupportedScope": "Unsupported assessment scope",
    "assessment.autoFailed": "Automated assessment failed",
    "analysis.completeAllItems": "Answer all items before completing ({answered}/{total})",
    "analysis.invalidChecklistItem": "Invalid checklist item: {itemId}",
    "ai.missingBaseUrl": "Enter the provider API base URL.",
    "ai.missingApiKey": "Enter the API key to enable the AI assistant.",
    "ai.apiKeyNotConfigured": "API key not configured.",
    "ai.baseUrlNotConfigured": "API base URL not configured.",
    "ai.invalidApiKey": "Invalid or expired API key. Check the key in the provider dashboard and save again.",
    "ai.accessDenied": "Access denied by the API. Confirm key permissions and model availability on your account.",
    "ai.endpointNotFound": "Endpoint or model not found. Review the base URL and model name.",
    "ai.quotaExceeded":
      "Provider account quota or rate limit exceeded (HTTP 429). For OpenAI: add credits at platform.openai.com/settings/organization/billing or switch to another provider (e.g. Google Gemini).{detail}",
    "ai.providerUnavailable": "Provider service unavailable (HTTP {status}). Try again in a few minutes.",
    "ai.apiFailed": "API failure (HTTP {status}){detail}",
    "error.badRequest": "Invalid request",
    "validation.nameMin": "Name must be at least 2 characters",
    "validation.nameMax100": "Name must be at most 100 characters",
    "validation.nameMax255": "Name must be at most 255 characters",
    "validation.nameRequired": "Name is required",
    "validation.emailInvalid": "Invalid email",
    "validation.emailRequired": "Email is required",
    "validation.passwordMin": "Password must be at least {min} characters",
    "validation.passwordMax": "Password must be at most {max} characters",
    "validation.passwordPattern": "Password must include lowercase, uppercase, number, and special character",
    "validation.passwordRequired": "Password is required",
    "validation.baseUrlInvalid": "Invalid base URL (use http:// or https://)",
    "validation.baseUrlMax": "URL must be at most 500 characters",
    "validation.repoUrlMax": "Repository URL must be at most 500 characters",
    "validation.applicationUrlsRequired":
      "Enter the base URL or Git repository — at least one is required for automated analyses.",
    "validation.complianceInvalid": "Invalid compliance value",
    "validation.titleMin": "Title must be at least 3 characters",
    "validation.titleMax": "Title must be at most 255 characters",
    "validation.titleRequired": "Title is required",
    "validation.descriptionMin": "Description must be at least 10 characters",
    "validation.descriptionMax": "Description must be at most 5000 characters",
    "validation.descriptionRequired": "Description is required",
    "validation.statusInvalid": "Invalid status",
  },
} as const;

export type ApiErrorKey = keyof typeof API_ERROR_MESSAGES.pt;

export function apiError(
  key: ApiErrorKey,
  locale: ChecklistLocale,
  params?: Record<string, string | number>
): string {
  let text: string = API_ERROR_MESSAGES[locale][key] ?? API_ERROR_MESSAGES.pt[key] ?? key;
  if (params) {
    for (const [param, value] of Object.entries(params)) {
      text = text.replace(`{${param}}`, String(value));
    }
  }
  return text.replace("{detail}", params?.detail ? ` Detail: ${params.detail}` : "");
}
