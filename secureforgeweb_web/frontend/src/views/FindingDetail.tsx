import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  History,
  Shield,
  Wrench,
} from "lucide-react";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { formatLocaleDateTime } from "@/i18n/formatLocaleDate";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "border-red-400/30 text-red-400",
  high: "border-orange-400/30 text-orange-400",
  medium: "border-yellow-400/30 text-yellow-400",
  low: "border-emerald-400/30 text-emerald-400",
};

type FindingStatus = "aberto" | "em_correcao" | "resolvido" | "aceito_risco";

function formatHistoryValue(
  action: string,
  value: string,
  labels: ReturnType<typeof useEnumLabels>
): string {
  if (action === "status_changed") return labels.findingStatus(value);
  if (action === "severity_changed") return labels.severity(value);
  return value;
}

export default function FindingDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/findings/:id");
  const findingId = Number(params?.id);
  const { locale, t } = useLocale();
  const labels = useEnumLabels();

  const [statusComment, setStatusComment] = useState("");
  const utils = trpc.useUtils();

  const { data: finding, isLoading } = trpc.findings.getById.useQuery(
    { id: findingId },
    { enabled: Number.isFinite(findingId) && findingId > 0 }
  );
  const { data: history } = trpc.findings.getHistory.useQuery(
    { id: findingId },
    { enabled: Number.isFinite(findingId) && findingId > 0 }
  );

  const updateStatus = trpc.findings.updateStatus.useMutation({
    onSuccess: () => {
      utils.findings.getById.invalidate({ id: findingId });
      utils.findings.getHistory.invalidate({ id: findingId });
      setStatusComment("");
      toast.success(t("finding.statusUpdated"));
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground font-mono">{t("finding.loading")}</p>
      </DashboardLayout>
    );
  }

  if (!finding) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground font-mono">{t("finding.notFound")}</p>
      </DashboardLayout>
    );
  }

  function handleStatusChange(status: FindingStatus) {
    updateStatus.mutate({ id: findingId, status, comment: statusComment || null });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/applications/${finding.applicationId}/findings`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground font-mono">{finding.title}</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {finding.itemCode && `${finding.itemCode} · `}
              {finding.categoryName ?? t("findings.noCategory")} · {finding.analysisTitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={`font-mono ${SEVERITY_COLORS[finding.severity] ?? ""}`}>
            {t("finding.severityLabel")} {labels.severity(finding.severity)}
          </Badge>
          <Badge variant="outline" className="font-mono">
            {t("finding.priorityLabel")} {labels.priority(finding.priority)}
          </Badge>
          <Badge variant="outline" className="font-mono">
            {labels.findingStatus(finding.status)}
          </Badge>
        </div>

        {finding.description && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-mono font-semibold">{t("common.description")}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{finding.description}</p>
          </div>
        )}

        {finding.evidence && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-mono font-semibold">{t("common.evidence")}</h2>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{finding.evidence}</p>
          </div>
        )}

        {(finding.recommendationTitle || finding.recommendationAction) && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-mono font-semibold text-foreground">{t("finding.recommendation")}</h2>
            </div>
            {finding.recommendationTitle && (
              <p className="text-sm font-mono text-foreground">{finding.recommendationTitle}</p>
            )}
            {finding.recommendationDescription && (
              <p className="text-sm text-muted-foreground">{finding.recommendationDescription}</p>
            )}
            {finding.recommendationAction && (
              <div className="bg-background/50 border border-border/50 rounded-lg p-3">
                <p className="text-xs font-mono text-primary mb-1">{t("finding.suggestedAction")}</p>
                <p className="text-sm text-foreground">{finding.recommendationAction}</p>
              </div>
            )}
            {finding.recommendationReference && (
              <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {t("common.ref")}: {finding.recommendationReference}
              </p>
            )}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-mono font-semibold">{t("finding.updateStatus")}</h2>
          <Textarea
            placeholder={t("finding.statusComment")}
            value={statusComment}
            onChange={(e) => setStatusComment(e.target.value)}
            className="text-xs font-mono min-h-16"
          />
          <div className="flex flex-wrap gap-2">
            <Select
              value={finding.status}
              onValueChange={(v) => handleStatusChange(v as FindingStatus)}
              disabled={updateStatus.isPending}
            >
              <SelectTrigger className="w-48 font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {labels.findingStatusOptions().map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {history && history.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-mono font-semibold">{t("common.history")}</h2>
            </div>
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="border-t border-border/50 pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-mono text-foreground">
                      {labels.historyAction(entry.action)}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatLocaleDateTime(locale, entry.createdAt)}
                    </p>
                  </div>
                  {entry.fromValue && entry.toValue && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatHistoryValue(entry.action, entry.fromValue, labels)} →{" "}
                      {formatHistoryValue(entry.action, entry.toValue, labels)}
                    </p>
                  )}
                  {entry.comment && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{entry.comment}</p>
                  )}
                  {entry.userName && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {t("common.by")} {entry.userName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          className="font-mono text-xs"
          onClick={() => navigate(`/applications/${finding.applicationId}/findings`)}
        >
          {t("finding.backToList")}
        </Button>
      </div>
    </DashboardLayout>
  );
}
