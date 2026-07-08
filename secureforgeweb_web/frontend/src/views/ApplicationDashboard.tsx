import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import PostureMetricsPanel, { downloadPdfBase64 } from "@/components/PostureMetricsPanel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Download, History } from "lucide-react";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { formatLocaleDate } from "@/i18n/formatLocaleDate";

export default function ApplicationDashboard() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/applications/:id/dashboard");
  const applicationId = Number(params?.id);
  const { locale, t } = useLocale();
  const labels = useEnumLabels();

  const { data, isLoading } = trpc.analyses.dashboard.useQuery(
    { applicationId },
    { enabled: Number.isFinite(applicationId) && applicationId > 0 }
  );

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
        <p className="text-sm text-muted-foreground font-mono">{t("appDashboard.loading")}</p>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground font-mono">{t("apps.notFound")}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(`/applications/${applicationId}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground font-mono truncate">
              {t("appDashboard.title", { name: data.application.name })}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">{t("appDashboard.subtitle")}</p>
          </div>
          <Button
            variant="outline"
            className="font-mono text-xs shrink-0"
            onClick={() => exportPdf.mutate({ applicationId })}
            disabled={exportPdf.isPending}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            {exportPdf.isPending ? t("common.generating") : t("common.exportPdf")}
          </Button>
        </div>

        <PostureMetricsPanel
          postureScore={data.postureScore}
          openFindings={data.openFindings}
          totalFindings={data.totalFindings}
          resolutionRate={data.resolutionRate}
          findingsBySeverity={data.findingsBySeverity}
          findingsByCategory={data.findingsByCategory}
          checklistProgress={data.checklistProgress}
        />

        {data.analyses.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-mono font-semibold text-foreground">{t("appDashboard.analysisHistory")}</h2>
            </div>
            <div className="space-y-2">
              {data.analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between gap-3 py-2 border-t border-border/50 first:border-0 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-foreground truncate">{analysis.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatLocaleDate(locale, analysis.startedAt)} ·{" "}
                      {labels.analysisStatus(analysis.status)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {analysis.postureScore !== null && (
                      <span className="text-sm font-mono text-primary">{analysis.postureScore}%</span>
                    )}
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
      </div>
    </DashboardLayout>
  );
}
