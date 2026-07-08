import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, AlertTriangle, Filter } from "lucide-react";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import { useEnumLabels } from "@/i18n/useEnumLabels";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "border-red-400/30 text-red-400",
  high: "border-orange-400/30 text-orange-400",
  medium: "border-yellow-400/30 text-yellow-400",
  low: "border-emerald-400/30 text-emerald-400",
};

const STATUS_COLORS: Record<string, string> = {
  aberto: "text-red-400",
  em_correcao: "text-yellow-400",
  resolvido: "text-emerald-400",
  aceito_risco: "text-muted-foreground",
};

export default function ApplicationFindings() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/applications/:id/findings");
  const applicationId = Number(params?.id);
  const { t } = useLocale();
  const labels = useEnumLabels();

  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: app } = trpc.applications.getById.useQuery(
    { id: applicationId },
    { enabled: Number.isFinite(applicationId) && applicationId > 0 }
  );
  const { data: catalog } = trpc.checklist.catalog.useQuery();
  const { data: findings, isLoading } = trpc.findings.listByApplication.useQuery(
    {
      applicationId,
      severity:
        severityFilter !== "all"
          ? (severityFilter as "critical" | "high" | "medium" | "low")
          : undefined,
      status:
        statusFilter !== "all"
          ? (statusFilter as "aberto" | "em_correcao" | "resolvido" | "aceito_risco")
          : undefined,
      categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
    },
    { enabled: Number.isFinite(applicationId) && applicationId > 0 }
  );

  const categories = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of findings ?? []) {
      if (f.categoryId && f.categoryName) map.set(f.categoryId, f.categoryName);
    }
    for (const cat of catalog?.categories ?? []) {
      map.set(cat.id, cat.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [findings, catalog]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground font-mono">{t("findings.loading")}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/applications/${applicationId}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground font-mono truncate">
              {t("findings.title", { name: app?.name ?? t("common.application") })}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">{t("findings.subtitle")}</p>
          </div>
          <Badge variant="outline" className="font-mono text-xs shrink-0">
            {t("findings.count", { count: findings?.length ?? 0 })}
          </Badge>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            {t("common.filters")}
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-36 font-mono text-xs h-8">
              <SelectValue placeholder={t("common.severity")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("findings.allSeverities")}</SelectItem>
              {labels.severityOptions().map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 font-mono text-xs h-8">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("findings.allStatuses")}</SelectItem>
              {labels.findingStatusOptions().map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 font-mono text-xs h-8">
              <SelectValue placeholder={t("common.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("findings.allCategories")}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!findings || findings.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-mono text-muted-foreground">{t("findings.empty")}</p>
            <p className="text-xs text-muted-foreground">{t("findings.emptyDesc")}</p>
            <Button
              variant="outline"
              className="font-mono text-xs"
              onClick={() => navigate(`/applications/${applicationId}`)}
            >
              {t("findings.goToApp")}
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border/50">
            {findings.map((finding) => (
              <button
                key={finding.id}
                onClick={() => navigate(`/findings/${finding.id}`)}
                className="w-full text-left p-4 hover:bg-accent/30 transition-colors flex items-start justify-between gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-mono text-foreground truncate">{finding.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {finding.itemCode && (
                      <span className="text-primary font-mono">{finding.itemCode} · </span>
                    )}
                    {finding.categoryName ?? t("findings.noCategory")} · {finding.analysisTitle}
                  </p>
                  {finding.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{finding.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs ${SEVERITY_COLORS[finding.severity] ?? ""}`}
                  >
                    {labels.severity(finding.severity)}
                  </Badge>
                  <span className={`text-xs font-mono ${STATUS_COLORS[finding.status] ?? ""}`}>
                    {labels.findingStatus(finding.status)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
