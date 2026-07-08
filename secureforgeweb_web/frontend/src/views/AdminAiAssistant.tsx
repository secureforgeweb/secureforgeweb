import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Brain, Loader2, Zap } from "lucide-react";
import { useLocale } from "@/contexts/ChecklistLocaleContext";

type ProviderId = "openai" | "gemini" | "azure_copilot" | "custom";

export default function AdminAiAssistant() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const backTo = location.startsWith("/admin") ? "/admin" : "/profile";

  const { data: config, isLoading } = trpc.aiAssistant.getConfig.useQuery(undefined, {
    enabled: Boolean(user),
  });

  const [provider, setProvider] = useState<ProviderId>("openai");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!config) return;
    setProvider(config.provider as ProviderId);
    setModel(config.model);
    setBaseUrl(config.baseUrl);
    setEnabled(config.enabled);
    setApiKey("");
  }, [config]);

  const selectedPreset = config?.presets.find((p) => p.id === provider);

  const saveMutation = trpc.aiAssistant.updateConfig.useMutation({
    onSuccess: () => {
      utils.aiAssistant.getConfig.invalidate();
      setApiKey("");
      toast.success(t("adminAi.saved"));
    },
    onError: (e) => toast.error(e.message),
  });

  const testMutation = trpc.aiAssistant.testConnection.useMutation({
    onSuccess: (result) => toast.success(result.message),
    onError: (e) => toast.error(e.message),
  });

  function applyPresetDefaults(nextProvider: ProviderId) {
    const preset = config?.presets.find((p) => p.id === nextProvider);
    if (!preset) return;
    setProvider(nextProvider);
    setModel(preset.defaultModel);
    setBaseUrl(preset.baseUrl);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate({
      provider,
      model: model.trim() || selectedPreset?.defaultModel || "gpt-4o-mini",
      baseUrl: baseUrl.trim(),
      enabled,
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(backTo)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground font-mono flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-500" />
              {t("adminAi.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t("adminAi.subtitle")}</p>
          </div>
        </div>

        {isLoading || !config ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
            <Loader2 className="w-4 h-4 animate-spin" /> {t("adminAi.loading")}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {t("common.account")}: {user?.email ?? user?.name ?? "—"}
              </Badge>
              {config.configured ? (
                <Badge className="font-mono text-xs bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                  {t("common.active")}
                </Badge>
              ) : (
                <Badge variant="outline" className="font-mono text-xs text-yellow-600 border-yellow-500/30">
                  {t("adminAi.localHeuristic")}
                </Badge>
              )}
              {config.apiKeyMasked && (
                <Badge variant="outline" className="font-mono text-xs">
                  {t("adminAi.keyMasked", { masked: config.apiKeyMasked })}
                </Badge>
              )}
            </div>

            <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-5 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-mono">{t("common.provider")}</Label>
                <Select value={provider} onValueChange={(v) => applyPresetDefaults(v as ProviderId)}>
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.presets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id} className="font-mono text-sm">
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPreset && (
                  <p className="text-xs text-muted-foreground">{selectedPreset.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl" className="text-xs font-mono">
                  {t("adminAi.apiBaseUrl")}
                </Label>
                <Input
                  id="baseUrl"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={selectedPreset?.baseUrl || "https://..."}
                  className="font-mono text-sm"
                />
                {provider === "azure_copilot" && (
                  <p className="text-xs text-muted-foreground">{t("adminAi.azureHint")}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="model" className="text-xs font-mono">
                  {t("common.model")}
                </Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={selectedPreset?.defaultModel}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-xs font-mono">
                  {t("adminAi.apiKey")}
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    config.apiKeyMasked
                      ? t("adminAi.keepKeyHint", { masked: config.apiKeyMasked })
                      : selectedPreset?.apiKeyHint
                  }
                  className="font-mono text-sm"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">{selectedPreset?.apiKeyHint}</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-mono text-foreground">{t("adminAi.enableLlm")}</p>
                  <p className="text-xs text-muted-foreground">{t("adminAi.enableLlmDesc")}</p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="submit" className="font-mono" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("common.saving")}
                    </>
                  ) : (
                    t("adminAi.saveConfig")
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="font-mono"
                  disabled={testMutation.isPending}
                  onClick={() =>
                    testMutation.mutate({
                      provider,
                      model: model.trim() || undefined,
                      baseUrl: baseUrl.trim() || undefined,
                      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
                    })
                  }
                >
                  {testMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("adminAi.testing")}
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" /> {t("adminAi.testConnection")}
                    </>
                  )}
                </Button>
              </div>
            </form>

            <p className="text-xs text-muted-foreground font-mono leading-relaxed">{t("adminAi.privacyNote")}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("adminAi.quotaNote")}</p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
