import {
  getUserAiAssistantConfigByUserId,
  upsertUserAiAssistantConfig,
} from "../models/userAiAssistantConfig.db.js";

export const AI_PROVIDER_IDS = ["openai", "gemini", "azure_copilot", "custom"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export type AiProviderPreset = {
  id: AiProviderId;
  label: string;
  description: string;
  baseUrl: string;
  defaultModel: string;
  apiKeyHint: string;
};

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI (GPT)",
    description: "API oficial OpenAI — modelos GPT-4o, GPT-4o mini, etc.",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    apiKeyHint: "Chave sk-... em platform.openai.com",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    description: "Endpoint compatível com OpenAI para modelos Gemini.",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    apiKeyHint: "Chave de API do Google AI Studio",
  },
  {
    id: "azure_copilot",
    label: "Microsoft Copilot (Azure OpenAI)",
    description: "Recurso Azure OpenAI / Copilot — informe a URL do seu deployment.",
    baseUrl: "",
    defaultModel: "gpt-4o",
    apiKeyHint: "Chave do recurso Azure OpenAI",
  },
  {
    id: "custom",
    label: "Compatível OpenAI (personalizado)",
    description: "Ollama, LM Studio ou outro endpoint /v1/chat/completions.",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    apiKeyHint: "Opcional para servidores locais",
  },
];

export type AiAssistantRuntimeConfig = {
  provider: AiProviderId;
  apiKey: string;
  model: string;
  baseUrl: string;
  enabled: boolean;
  source: "database" | "none";
};

export type AiAssistantPublicConfig = {
  provider: AiProviderId;
  model: string;
  baseUrl: string;
  enabled: boolean;
  configured: boolean;
  apiKeyMasked: string | null;
  source: "database" | "none";
  updatedAt: string | null;
  presets: AiProviderPreset[];
};

export function getProviderPreset(provider: AiProviderId): AiProviderPreset {
  return AI_PROVIDER_PRESETS.find((p) => p.id === provider) ?? AI_PROVIDER_PRESETS[0];
}

export function isHeuristicProviderKey(provider: string | null | undefined): boolean {
  if (!provider?.trim()) return true;
  return (
    provider === "heuristic-local" ||
    provider === "heuristic-fallback" ||
    provider.startsWith("heuristic")
  );
}

export function formatAiModelKey(provider: string, model: string): string {
  return `${provider}:${model}`;
}

export function parseAiModelKey(key: string): { provider: string; model: string } | null {
  const idx = key.indexOf(":");
  if (idx <= 0) return null;
  return { provider: key.slice(0, idx), model: key.slice(idx + 1) };
}

export function formatAiModelDisplay(key: string | null | undefined): string | null {
  if (!key || isHeuristicProviderKey(key)) return null;
  const parsed = parseAiModelKey(key);
  if (!parsed) return key;
  const preset = getProviderPreset(
    AI_PROVIDER_IDS.includes(parsed.provider as AiProviderId)
      ? (parsed.provider as AiProviderId)
      : "custom"
  );
  return `${preset.label} (${parsed.model})`;
}

export function resolveExecutorAiModel(input: {
  runProvider: string | null | undefined;
  runMode: string | null | undefined;
  configuredProvider: string | null | undefined;
  configuredModel: string | null | undefined;
}): {
  modelKey: string | null;
  modelDisplay: string;
  mode: string | null;
} {
  const configuredKey =
    input.configuredProvider && input.configuredModel
      ? formatAiModelKey(input.configuredProvider, input.configuredModel)
      : null;

  const runKey =
    input.runProvider && !isHeuristicProviderKey(input.runProvider)
      ? input.runProvider
      : null;

  const modelKey = configuredKey ?? runKey;
  const modelDisplay = formatAiModelDisplay(modelKey) ?? "Não configurado";

  return {
    modelKey,
    modelDisplay,
    mode: input.runMode ?? null,
  };
}

export function maskApiKey(apiKey: string | null | undefined): string | null {
  if (!apiKey?.trim()) return null;
  const key = apiKey.trim();
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

function rowToRuntime(
  row: NonNullable<Awaited<ReturnType<typeof getUserAiAssistantConfigByUserId>>>
): AiAssistantRuntimeConfig {
  const provider = AI_PROVIDER_IDS.includes(row.provider as AiProviderId)
    ? (row.provider as AiProviderId)
    : "openai";
  return {
    provider,
    apiKey: row.apiKey,
    model: row.model,
    baseUrl: row.baseUrl.replace(/\/$/, ""),
    enabled: row.enabled,
    source: "database",
  };
}

function emptyRuntime(): AiAssistantRuntimeConfig {
  return {
    provider: "openai",
    apiKey: "",
    model: getProviderPreset("openai").defaultModel,
    baseUrl: getProviderPreset("openai").baseUrl,
    enabled: false,
    source: "none",
  };
}

export async function getAiAssistantRuntimeConfig(
  userId: number
): Promise<AiAssistantRuntimeConfig> {
  const row = await getUserAiAssistantConfigByUserId(userId);
  if (!row) return emptyRuntime();
  return rowToRuntime(row);
}

export async function getAiAssistantPublicConfig(
  userId: number
): Promise<AiAssistantPublicConfig> {
  const row = await getUserAiAssistantConfigByUserId(userId);
  if (!row) {
    const empty = emptyRuntime();
    return {
      provider: empty.provider,
      model: empty.model,
      baseUrl: empty.baseUrl,
      enabled: false,
      configured: false,
      apiKeyMasked: null,
      source: "none",
      updatedAt: null,
      presets: AI_PROVIDER_PRESETS,
    };
  }

  const runtime = rowToRuntime(row);
  return {
    provider: runtime.provider,
    model: runtime.model,
    baseUrl: runtime.baseUrl,
    enabled: runtime.enabled,
    configured: Boolean(runtime.apiKey && runtime.enabled),
    apiKeyMasked: maskApiKey(runtime.apiKey),
    source: "database",
    updatedAt: row.updatedAt.toISOString(),
    presets: AI_PROVIDER_PRESETS,
  };
}

export async function saveAiAssistantConfig(input: {
  userId: number;
  provider: AiProviderId;
  apiKey?: string;
  model: string;
  baseUrl: string;
  enabled: boolean;
}): Promise<AiAssistantPublicConfig> {
  const preset = getProviderPreset(input.provider);
  const model = input.model.trim() || preset.defaultModel;
  const baseUrl = (input.baseUrl.trim() || preset.baseUrl).replace(/\/$/, "");

  if (!baseUrl) {
    throw new Error("Informe a URL base da API do provedor.");
  }

  const existing = await getUserAiAssistantConfigByUserId(input.userId);
  const apiKey = input.apiKey?.trim() || existing?.apiKey || "";
  if (input.enabled && !apiKey) {
    throw new Error("Informe a chave de API para habilitar o assistente IA.");
  }

  await upsertUserAiAssistantConfig(input.userId, {
    provider: input.provider,
    apiKey,
    model,
    baseUrl,
    enabled: input.enabled,
  });

  return getAiAssistantPublicConfig(input.userId);
}

export function formatLlmHttpError(status: number, body: string): string {
  let apiMessage = "";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; code?: string } };
    apiMessage = parsed.error?.message ?? "";
  } catch {
    apiMessage = body.slice(0, 180);
  }

  if (status === 401) {
    return "Chave de API inválida ou expirada. Verifique a chave no painel do provedor e salve novamente.";
  }
  if (status === 403) {
    return "Acesso negado pela API. Confirme permissões da chave e se o modelo está disponível na sua conta.";
  }
  if (status === 404) {
    return "Endpoint ou modelo não encontrado. Revise a URL base e o nome do modelo.";
  }
  if (status === 429) {
    return (
      "Cota ou limite de uso excedido na conta do provedor (HTTP 429). " +
      "Para OpenAI: adicione créditos em platform.openai.com/settings/organization/billing " +
      "ou use outro provedor (ex.: Google Gemini) no seletor acima. " +
      (apiMessage ? `Detalhe: ${apiMessage}` : "")
    );
  }
  if (status >= 500) {
    return `Serviço do provedor indisponível (HTTP ${status}). Tente novamente em alguns minutos.`;
  }

  return `Falha na API (HTTP ${status})${apiMessage ? `: ${apiMessage}` : ""}`;
}

async function probeLlmConnection(input: {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: AiProviderId;
}): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.apiKey}`,
  };

  if (input.provider !== "azure_copilot") {
    const modelsRes = await fetch(`${input.baseUrl}/models`, { method: "GET", headers });
    if (modelsRes.ok) return modelsRes;
    if (modelsRes.status !== 404 && modelsRes.status !== 405) {
      return modelsRes;
    }
  }

  return fetch(`${input.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      temperature: 0,
      max_tokens: 5,
      messages: [{ role: "user", content: "ok" }],
    }),
  });
}

export async function testAiAssistantConnection(input: {
  userId: number;
  provider?: AiProviderId;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}): Promise<{ ok: boolean; message: string; model: string }> {
  const runtime = await getAiAssistantRuntimeConfig(input.userId);
  const provider = input.provider ?? runtime.provider;
  const preset = getProviderPreset(provider);
  const apiKey = input.apiKey?.trim() || runtime.apiKey;
  const model = (input.model?.trim() || runtime.model || preset.defaultModel).trim();
  const baseUrl = (input.baseUrl?.trim() || runtime.baseUrl || preset.baseUrl).replace(/\/$/, "");

  if (!apiKey) {
    throw new Error("Chave de API não configurada.");
  }
  if (!baseUrl) {
    throw new Error("URL base da API não configurada.");
  }

  const response = await probeLlmConnection({ baseUrl, apiKey, model, provider });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(formatLlmHttpError(response.status, body));
  }

  return {
    ok: true,
    message: `Conexão bem-sucedida com ${preset.label} (modelo ${model}).`,
    model,
  };
}
