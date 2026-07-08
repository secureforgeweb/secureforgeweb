import { useLocation, useRoute } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  ClipboardList,
  Globe,
  Play,
  History,
  AlertTriangle,
  BarChart2,
  GitBranch,
  Pencil,
  Download,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { downloadPdfBase64 } from "@/components/PostureMetricsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { hasDuplicateGitUrlProtocols, sanitizeGitRepositoryUrlInput } from "@/lib/gitRepositoryUrl";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { formatLocaleDate } from "@/i18n/formatLocaleDate";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "border-red-400/30 text-red-400",
  high: "border-orange-400/30 text-orange-400",
  medium: "border-yellow-400/30 text-yellow-400",
  low: "border-emerald-400/30 text-emerald-400",
};

const STATUS_COLORS: Record<string, string> = {
  rascunho: "text-muted-foreground",
  em_andamento: "text-primary",
  concluida: "text-emerald-400",
};

export default function ApplicationDetail() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { locale, t } = useLocale();
  const labels = useEnumLabels();

  const [, params] = useRoute("/applications/:id");
  const id = Number(params?.id);

  const [editUrls, setEditUrls] = useState(false);
  const [baseUrlDraft, setBaseUrlDraft] = useState("");
  const [repositoryUrlDraft, setRepositoryUrlDraft] = useState("");

  const { data: app, isLoading } = trpc.applications.getById.useQuery(
    { id },
    { enabled: Number.isFinite(id) && id > 0 }
  );
  const { data: catalog } = trpc.checklist.catalog.useQuery();
  const { data: availableChecklists } = trpc.checklist.listAvailable.useQuery();
  const [selectedChecklistId, setSelectedChecklistId] = useState<number | undefined>();

  useEffect(() => {
    if (selectedChecklistId != null || !availableChecklists?.length) return;
    const defaultChecklist =
      availableChecklists.find((c) => c.isDefault) ?? availableChecklists[0];
    setSelectedChecklistId(defaultChecklist.id);
  }, [availableChecklists, selectedChecklistId]);

  const { data: analyses, refetch: refetchAnalyses } = trpc.analyses.listByApplication.useQuery(
    { applicationId: id },
    { enabled: Number.isFinite(id) && id > 0 }
  );
  const { data: findingStats } = trpc.findings.stats.useQuery(
    { applicationId: id },
    { enabled: Number.isFinite(id) && id > 0 }
  );

  const utils = trpc.useUtils();

  const createAnalysis = trpc.analyses.create.useMutation({
    onSuccess: (analysis) => {
      refetchAnalyses();
      toast.success(t("appDetail.analysisStarted"));
      navigate(`/analyses/${analysis.id}/checklist`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateApp = trpc.applications.update.useMutation({
    onSuccess: () => {
      toast.success(t("appDetail.updated"));
      setEditUrls(false);
      utils.applications.getById.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  const exportPdf = trpc.reports.exportPdf.useMutation({
    onSuccess: (result) => {
      downloadPdfBase64(result.base64, result.filename);
      toast.success(t("dashboard.reportExported", { count: result.findingCount }));
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground font-mono">{t("common.loading")}</p>
      </DashboardLayout>
    );
  }

  if (!app) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground font-mono">{t("apps.notFound")}</p>
      </DashboardLayout>
    );
  }

  const items = catalog?.items ?? [];
  const itemsByCategory: Record<string, typeof items> = {};
  for (const item of items) {
    if (!itemsByCategory[item.categoryName]) itemsByCategory[item.categoryName] = [];
    itemsByCategory[item.categoryName].push(item);
  }

  const inProgress = analyses?.find((a) => a.status === "em_andamento" || a.status === "rascunho");
  const notConfigured = t("common.notConfigured");

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/applications")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground font-mono truncate">{app.name}</h1>
            {app.techStack && <p className="text-sm text-primary font-mono">{app.techStack}</p>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-mono text-foreground">
              <Globe className="w-4 h-4 text-primary" />
              {t("appDetail.details")}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="font-mono text-xs"
              onClick={() => {
                setBaseUrlDraft(app.baseUrl ?? "");
                setRepositoryUrlDraft(app.repositoryUrl ?? "");
                setEditUrls((v) => !v);
              }}
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              {editUrls ? t("common.cancel") : t("appDetail.editUrls")}
            </Button>
          </div>

          {editUrls ? (
            <div className="space-y-3 border-t border-border/50 pt-3">
              <div>
                <Label className="text-xs font-mono">{t("newApp.baseUrl")}</Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  value={baseUrlDraft}
                  onChange={(e) => setBaseUrlDraft(e.target.value)}
                  placeholder="https://app.exemplo.com"
                />
              </div>
              <div>
                <Label className="text-xs font-mono">{t("newApp.repo")}</Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  value={repositoryUrlDraft}
                  onChange={(e) => setRepositoryUrlDraft(e.target.value)}
                  placeholder="https://github.com/org/projeto"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="font-mono text-xs"
                disabled={updateApp.isPending}
                onClick={() => {
                  let repo = repositoryUrlDraft.trim() || null;
                  if (repo && hasDuplicateGitUrlProtocols(repo)) {
                    repo = sanitizeGitRepositoryUrlInput(repo);
                    setRepositoryUrlDraft(repo);
                    toast.message(t("newApp.repoFixed"));
                  }
                  updateApp.mutate({
                    id,
                    baseUrl: baseUrlDraft.trim() || null,
                    repositoryUrl: repo,
                  });
                }}
              >
                {updateApp.isPending ? t("common.saving") : t("appDetail.saveUrls")}
              </Button>
            </div>
          ) : (
            <>
              {app.baseUrl && (
                <p className="text-sm font-mono">
                  <span className="text-muted-foreground">{t("common.url")}: </span>
                  <a
                    href={app.baseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {app.baseUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              )}
              {app.repositoryUrl && (
                <p className="text-sm font-mono">
                  <span className="text-muted-foreground">{t("common.repository")}: </span>
                  <a
                    href={app.repositoryUrl.replace(/\.git$/, "")}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <GitBranch className="w-3 h-3" />
                    {app.repositoryUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              )}
              {!app.baseUrl && !app.repositoryUrl && (
                <p className="text-sm text-muted-foreground">{t("appDetail.noUrlsHint")}</p>
              )}
            </>
          )}

          {app.description && <p className="text-sm text-muted-foreground">{app.description}</p>}

          <p className="text-xs text-muted-foreground font-mono">
            {t("common.registeredOn")} {formatLocaleDate(locale, app.createdAt)}
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-mono font-semibold text-foreground">{t("appDetail.newAnalysis")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("appDetail.newAnalysisDesc")}</p>

            {availableChecklists && availableChecklists.length > 1 && (
              <div className="mt-3 max-w-md">
                <Label className="text-xs font-mono">{t("appDetail.checklistProfile")}</Label>
                <Select
                  value={selectedChecklistId != null ? String(selectedChecklistId) : undefined}
                  onValueChange={(v) => setSelectedChecklistId(Number(v))}
                >
                  <SelectTrigger className="mt-1 font-mono text-xs h-9">
                    <SelectValue placeholder={t("appDetail.selectChecklist")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChecklists.map((checklist) => (
                      <SelectItem key={checklist.id} value={String(checklist.id)} className="font-mono text-xs">
                        {(locale === "pt" && checklist.namePt) || checklist.name} (
                        {checklist.itemCount || checklist.version} {t("common.items")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {inProgress ? (
            <Button
              variant="outline"
              className="font-mono text-xs shrink-0"
              onClick={() => navigate(`/analyses/${inProgress.id}/checklist`)}
            >
              <Play className="w-3.5 h-3.5 mr-1" /> {t("appDetail.continueAnalysis")}
            </Button>
          ) : (
            <Button
              className="font-mono text-xs shrink-0"
              onClick={() =>
                createAnalysis.mutate({
                  applicationId: id,
                  checklistId: selectedChecklistId,
                })
              }
              disabled={createAnalysis.isPending}
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              {createAnalysis.isPending ? t("appDetail.starting") : t("appDetail.startAnalysis")}
            </Button>
          )}
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              {t("appDetail.postureDashboard")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("appDetail.postureDashboardDesc")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button
              variant="outline"
              className="font-mono text-xs shrink-0"
              onClick={() => navigate(`/applications/${id}/dashboard`)}
            >
              {t("appDetail.viewDashboard")}
            </Button>
            <Button
              variant="outline"
              className="font-mono text-xs shrink-0"
              onClick={() => exportPdf.mutate({ applicationId: id })}
              disabled={exportPdf.isPending}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              {exportPdf.isPending ? t("appDetail.generatingPdf") : t("common.exportPdf")}
            </Button>
          </div>
        </div>

        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              {t("appDetail.findings")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("appDetail.findingsDesc", { count: findingStats?.total ?? 0 })}
            </p>
          </div>
          <Button
            variant="outline"
            className="font-mono text-xs shrink-0"
            onClick={() => navigate(`/applications/${id}/findings`)}
          >
            {t("appDetail.viewFindings")}
          </Button>
        </div>

        {analyses && analyses.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-mono font-semibold text-foreground">{t("appDetail.analysisHistory")}</h2>
            </div>
            <div className="space-y-2">
              {analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between gap-3 py-2 border-t border-border/50 first:border-0 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-foreground truncate">{analysis.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatLocaleDate(locale, analysis.startedAt)}
                      {analysis.completedAt &&
                        ` — ${t("appDetail.completedOn")} ${formatLocaleDate(locale, analysis.completedAt)}`}
                      {"executorEmail" in analysis && analysis.executorEmail && (
                        <> · {t("common.by")} {analysis.executorEmail}</>
                      )}
                      {"aiModelDisplay" in analysis && analysis.aiModelDisplay !== notConfigured && (
                        <> · {labels.scopeShort("ai_agent")}: {analysis.aiModelDisplay}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-mono ${STATUS_COLORS[analysis.status] ?? ""}`}>
                      {labels.analysisStatus(analysis.status)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-mono text-xs h-7"
                      onClick={() => navigate(`/analyses/${analysis.id}/checklist`)}
                    >
                      {t("common.open")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {catalog?.checklist && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-mono font-semibold text-foreground">
                  {t("appDetail.checklistTitle", {
                    name: catalog.checklist.name,
                    version: catalog.checklist.version,
                  })}
                </h2>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {t("appDetail.checklistItems", { count: catalog.totalItems })}
              </Badge>
            </div>

            {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
              <div key={category} className="border-t border-border/50 pt-3">
                <p className="text-xs font-mono text-primary mb-2">{category}</p>
                <div className="space-y-2">
                  {categoryItems?.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-mono text-foreground">{item.code}</span>
                        <span className="text-muted-foreground"> — {item.title}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`font-mono shrink-0 ${SEVERITY_COLORS[item.suggestedSeverity] ?? ""}`}
                      >
                        {labels.severity(item.suggestedSeverity)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
