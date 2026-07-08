import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import PostureMetricsPanel, { downloadPdfBase64 } from "@/components/PostureMetricsPanel";
import { Globe, ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocale } from "@/contexts/ChecklistLocaleContext";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { t } = useLocale();
  const [exportingAppId, setExportingAppId] = useState<number | null>(null);
  const { data: global } = trpc.analyses.globalDashboard.useQuery();

  const exportPdf = trpc.reports.exportPdf.useMutation({
    onSuccess: (result) => {
      downloadPdfBase64(result.base64, result.filename);
      toast.success(t("dashboard.reportExported", { count: result.findingCount }));
      setExportingAppId(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setExportingAppId(null);
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="soc-page-title">{t("dashboard.title")}</h1>
          <p className="soc-page-subtitle mt-1">{t("dashboard.subtitle")}</p>
        </div>

        <PostureMetricsPanel
          postureScore={global?.averagePostureScore ?? null}
          openFindings={global?.openFindings ?? 0}
          totalFindings={global?.totalFindings ?? 0}
          resolutionRate={global?.overallResolutionRate ?? 0}
          findingsBySeverity={global?.findingsBySeverity ?? []}
          findingsByCategory={[]}
        />

        {global && global.applications.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-mono font-semibold text-foreground">{t("dashboard.applications")}</h2>
            <div className="space-y-2">
              {global.applications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between gap-3 py-2 border-t border-border/50 first:border-0 first:pt-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-mono text-foreground truncate">{app.name}</p>
                      {app.techStack && (
                        <p className="text-xs text-muted-foreground truncate">{app.techStack}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-muted-foreground">
                      {t("dashboard.openFindings", { count: app.openFindings })}
                    </span>
                    {app.postureScore !== null && (
                      <span className="text-sm font-mono text-primary">{app.postureScore}%</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-mono text-xs h-7"
                      onClick={() => navigate(`/applications/${app.id}/dashboard`)}
                    >
                      {t("dashboard.title")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-mono text-xs h-7"
                      disabled={exportPdf.isPending && exportingAppId === app.id}
                      onClick={() => {
                        setExportingAppId(app.id);
                        exportPdf.mutate({ applicationId: app.id });
                      }}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      {exportPdf.isPending && exportingAppId === app.id ? "PDF..." : "PDF"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-mono font-semibold text-foreground">{t("dashboard.registerApp")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("dashboard.registerAppDesc")}</p>
          </div>
          <Button
            variant="outline"
            className="font-mono text-xs shrink-0"
            onClick={() => navigate("/applications/new")}
          >
            {t("dashboard.newApplication")} <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
