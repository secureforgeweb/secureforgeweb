import { describe, expect, it } from "vitest";
import {
  AI_PROVIDER_PRESETS,
  getProviderPreset,
  maskApiKey,
  formatLlmHttpError,
  resolveExecutorAiModel,
  formatAiModelDisplay,
} from "../services/aiAssistantConfig.js";

describe("aiAssistantConfig", () => {
  it("expõe presets para OpenAI, Gemini, Azure e custom", () => {
    const ids = AI_PROVIDER_PRESETS.map((p) => p.id);
    expect(ids).toEqual(["openai", "gemini", "azure_copilot", "custom"]);
    expect(getProviderPreset("gemini").baseUrl).toContain("generativelanguage.googleapis.com");
  });

  it("mascara chave de API", () => {
    expect(maskApiKey("sk-proj-abcdefghijklmnop")).toMatch(/^sk-p/);
    expect(maskApiKey("sk-proj-abcdefghijklmnop")).toContain("••••");
    expect(maskApiKey(null)).toBeNull();
  });

  it("formata erro 429 de cota excedida", () => {
    const msg = formatLlmHttpError(
      429,
      JSON.stringify({ error: { message: "You exceeded your current quota" } })
    );
    expect(msg).toContain("429");
    expect(msg).toContain("Cota");
  });

  it("resolve modelo cadastrado mesmo com run heurístico", () => {
    const resolved = resolveExecutorAiModel({
      runProvider: "heuristic-local",
      runMode: "heuristic",
      configuredProvider: "gemini",
      configuredModel: "gemini-2.0-flash",
    });
    expect(resolved.modelKey).toBe("gemini:gemini-2.0-flash");
    expect(resolved.modelDisplay).toContain("Gemini");
    expect(resolved.modelDisplay).toContain("gemini-2.0-flash");
  });

  it("formata chave provider:modelo para exibição", () => {
    expect(formatAiModelDisplay("openai:gpt-4o-mini")).toContain("GPT");
    expect(formatAiModelDisplay("heuristic-local")).toBeNull();
  });
});
