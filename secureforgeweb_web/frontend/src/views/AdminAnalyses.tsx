import { useCallback, useMemo, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { formatLocaleDate } from "@/i18n/formatLocaleDate";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { ResizableColGroup, ResizableTable, ResizableTh } from "@/components/ResizableTable";

type AnalysisRow = {
  analysisId: number;
  analysisTitle: string;
  analysisStatus: string;
  startedAt: Date | string;
  completedAt: Date | string | null;
  postureScore: number | null;
  executorId: number;
  executorName: string | null;
  executorEmail: string | null;
  applicationId: number;
  applicationName: string;
  applicationBaseUrl: string | null;
  applicationOwnerId: number;
  applicationOwnerName: string | null;
  applicationOwnerEmail: string | null;
  latestAiProvider: string | null;
  latestAiMode: string | null;
  aiModelDisplay: string;
  aiModelKey: string | null;
  assessmentRunCount: number;
};

type ColumnKey =
  | "select"
  | "analysis"
  | "executor"
  | "application"
  | "owner"
  | "model"
  | "posture"
  | "status"
  | "actions";

const DEFAULT_WIDTHS: Record<ColumnKey, number> = {
  select: 44,
  analysis: 200,
  executor: 170,
  application: 200,
  owner: 150,
  model: 150,
  posture: 90,
  status: 110,
  actions: 100,
};

type ColumnFilters = {
  analysis: string;
  executor: string;
  application: string;
  owner: string;
  model: string;
  posture: string;
  status: string;
};

const EMPTY_FILTERS: ColumnFilters = {
  analysis: "",
  executor: "",
  application: "",
  owner: "",
  model: "",
  posture: "",
  status: "",
};

function matchesFilter(value: string, filter: string): boolean {
  if (!filter.trim()) return true;
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}

function rowSearchText(
  row: AnalysisRow,
  key: keyof ColumnFilters,
  locale: ReturnType<typeof useLocale>["locale"],
  labels: ReturnType<typeof useEnumLabels>
): string {
  switch (key) {
    case "analysis":
      return `${row.analysisTitle} ${formatLocaleDate(locale, row.startedAt)}`;
    case "executor":
      return `${row.executorName ?? ""} ${row.executorEmail ?? ""}`;
    case "application":
      return `${row.applicationName} ${row.applicationBaseUrl ?? ""}`;
    case "owner":
      return `${row.applicationOwnerName ?? ""} ${row.applicationOwnerEmail ?? ""}`;
    case "model":
      return `${row.aiModelDisplay} ${row.aiModelKey ?? ""} ${row.latestAiMode ?? ""}`;
    case "posture":
      return row.postureScore != null ? String(row.postureScore) : "";
    case "status":
      return `${labels.analysisStatus(row.analysisStatus)} ${row.analysisStatus}`;
    default:
      return "";
  }
}

export default function AdminAnalyses() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const labels = useEnumLabels();
  const notConfigured = t("common.notConfigured");
  const [applicationFilter, setApplicationFilter] = useState<string>("all");
  const [baseUrlFilter, setBaseUrlFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showCompareChart, setShowCompareChart] = useState(false);

  const { widths, onResizeStart } = useResizableColumns("admin-analyses", DEFAULT_WIDTHS);

  const columnLabels: Record<ColumnKey, string> = useMemo(
    () => ({
      select: "",
      analysis: t("adminAnalyses.colAnalysis"),
      executor: t("adminAnalyses.colExecutor"),
      application: t("adminAnalyses.colApplication"),
      owner: t("adminAnalyses.colOwner"),
      model: t("adminAnalyses.colModel"),
      posture: t("adminAnalyses.colPosture"),
      status: t("common.status"),
      actions: t("common.actions"),
    }),
    [t]
  );

  const compareChartConfig: ChartConfig = useMemo(
    () => ({
      posture: { label: t("adminAnalyses.posturePercent"), color: "#22d3ee" },
    }),
    [t]
  );

  const comparisonLabel = useCallback(
    (row: AnalysisRow): string => {
      const who = row.executorName?.split(" ")[0] ?? row.executorEmail?.split("@")[0] ?? "?";
      const modelMatch = row.aiModelDisplay.match(/\(([^)]+)\)/);
      const model =
        modelMatch?.[1] ??
        row.aiModelKey?.split(":").pop() ??
        (row.aiModelDisplay !== notConfigured ? row.aiModelDisplay : notConfigured);
      return `${who} · ${model}`;
    },
    [notConfigured]
  );

  const { data: analyses, isLoading } = trpc.admin.listAnalyses.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const filteredRows = useMemo(() => {
    if (!analyses?.length) return [];

    return analyses.filter((row) => {
      if (applicationFilter !== "all" && row.applicationId !== Number(applicationFilter)) {
        return false;
      }
      if (baseUrlFilter.trim() && row.applicationBaseUrl?.trim() !== baseUrlFilter.trim()) {
        return false;
      }
      return (Object.keys(columnFilters) as Array<keyof ColumnFilters>).every((key) =>
        matchesFilter(rowSearchText(row, key, locale, labels), columnFilters[key])
      );
    });
  }, [analyses, applicationFilter, baseUrlFilter, columnFilters, locale, labels]);

  const selectedRows = useMemo(
    () => filteredRows.filter((r) => selectedIds.has(r.analysisId)),
    [filteredRows, selectedIds]
  );

  const comparisonData = useMemo(() => {
    return selectedRows.map((row, index) => {
      const label = comparisonLabel(row);
      return {
        id: row.analysisId,
        label,
        shortLabel: label.length > 22 ? `${label.slice(0, 20)}…` : label,
        posture: row.postureScore ?? 0,
        hasPosture: row.postureScore != null,
        model: row.aiModelDisplay,
        executor: row.executorEmail ?? row.executorName ?? "—",
        application: row.applicationName,
        fill: `hsl(${(index * 67) % 360} 70% 50%)`,
      };
    });
  }, [selectedRows, comparisonLabel]);

  const applicationOptions = useMemo(() => {
    if (!analyses) return [];
    const map = new Map<number, string>();
    for (const row of analyses) {
      map.set(row.applicationId, row.applicationName);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [analyses]);

  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.analysisId));

  const toggleRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllFiltered = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredRows.map((r) => r.analysisId)));
  };

  const clearFilters = () => {
    setColumnFilters(EMPTY_FILTERS);
    setApplicationFilter("all");
    setBaseUrlFilter("");
  };

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono">{t("common.adminOnly")}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const filterableColumns: Array<keyof ColumnFilters> = [
    "analysis",
    "executor",
    "application",
    "owner",
    "model",
    "posture",
    "status",
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground font-mono flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-500" />
                {t("adminAnalyses.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{t("adminAnalyses.subtitle")}</p>
            </div>
          </div>

          {selectedIds.size >= 2 && (
            <Button
              className="font-mono text-xs"
              onClick={() => setShowCompareChart((v) => !v)}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {showCompareChart ? t("adminAnalyses.hideCompare") : t("adminAnalyses.compare")} ({selectedIds.size})
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Select value={applicationFilter} onValueChange={setApplicationFilter}>
            <SelectTrigger className="w-56 font-mono text-sm">
              <SelectValue placeholder={t("common.application")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-sm">
                {t("adminAnalyses.allApps")}
              </SelectItem>
              {applicationOptions.map(([id, name]) => (
                <SelectItem key={id} value={String(id)} className="font-mono text-sm">
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={baseUrlFilter}
            onChange={(e) => setBaseUrlFilter(e.target.value)}
            placeholder={t("adminAnalyses.baseUrlPlaceholder")}
            className="max-w-xs font-mono text-sm"
          />
          <Button variant="outline" size="sm" className="font-mono text-xs" onClick={clearFilters}>
            {t("adminAnalyses.clearFilters")}
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="font-mono text-xs"
              onClick={() => {
                setSelectedIds(new Set());
                setShowCompareChart(false);
              }}
            >
              <X className="w-3 h-3 mr-1" />
              {t("adminAnalyses.deselect", { count: selectedIds.size })}
            </Button>
          )}
        </div>

        {showCompareChart && selectedIds.size >= 2 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-mono font-semibold text-foreground">
                {t("adminAnalyses.comparisonTitle", { count: selectedRows.length })}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">{t("adminAnalyses.comparisonHint")}</p>
            </div>
            <ChartContainer config={compareChartConfig} className="h-[280px] w-full">
              <BarChart data={comparisonData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 10, fontFamily: "monospace" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => (
                        <span className="font-mono">
                          {item.payload.hasPosture ? `${value}%` : t("adminAnalyses.noScore")}
                        </span>
                      )}
                      labelFormatter={(_label, payload) => {
                        const p = payload?.[0]?.payload;
                        if (!p) return "";
                        return (
                          <div className="space-y-0.5 text-xs font-mono">
                            <p>{p.executor}</p>
                            <p className="text-muted-foreground">{p.application}</p>
                            <p className="text-muted-foreground">
                              {t("adminAnalyses.modelTooltip", { model: p.model })}
                            </p>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="posture" radius={[4, 4, 0, 0]}>
                  {comparisonData.map((entry) => (
                    <Cell key={entry.id} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {comparisonData.map((item) => (
                <div
                  key={item.id}
                  className="text-xs font-mono border border-border/60 rounded-lg px-3 py-2"
                >
                  <p className="text-foreground truncate">{item.label}</p>
                  <p className="text-muted-foreground truncate">{item.application}</p>
                  <p className={item.hasPosture ? "text-cyan-500" : "text-muted-foreground"}>
                    {t("adminAnalyses.postureValue", {
                      value: item.hasPosture ? `${item.posture}%` : "—",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
            <Loader2 className="w-4 h-4 animate-spin" /> {t("adminAnalyses.loading")}
          </div>
        ) : !analyses?.length ? (
          <p className="text-sm text-muted-foreground font-mono">{t("adminAnalyses.empty")}</p>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <p className="text-xs text-muted-foreground font-mono px-4 py-2 border-b border-border">
              {t("adminAnalyses.rowCount", { filtered: filteredRows.length, total: analyses.length })}
              {" · "}
              {t("common.tableResizeHint")}
            </p>
            <div className="overflow-x-auto">
              <ResizableTable className="text-sm font-mono">
                <ResizableColGroup
                  columns={Object.keys(DEFAULT_WIDTHS) as ColumnKey[]}
                  widths={widths}
                />
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    {(Object.keys(columnLabels) as ColumnKey[]).map((col) => (
                      <ResizableTh
                        key={col}
                        resizable={col !== "select" && col !== "actions"}
                        onResizeStart={
                          col !== "select" && col !== "actions"
                            ? (x) => onResizeStart(col, x)
                            : undefined
                        }
                      >
                        {col === "select" ? (
                          <Checkbox
                            checked={allFilteredSelected}
                            onCheckedChange={(c) => toggleAllFiltered(c === true)}
                            aria-label={t("adminAnalyses.selectAllFiltered")}
                          />
                        ) : (
                          <span className="truncate">{columnLabels[col]}</span>
                        )}
                      </ResizableTh>
                    ))}
                  </tr>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="p-2" />
                    {filterableColumns.map((key) => (
                      <th key={key} className="p-2">
                        <Input
                          value={columnFilters[key]}
                          onChange={(e) =>
                            setColumnFilters((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder={t("adminAnalyses.filterPlaceholder", {
                            column: columnLabels[key].toLowerCase(),
                          })}
                          className="h-7 text-[10px] font-mono px-2"
                        />
                      </th>
                    ))}
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-8 text-center text-sm text-muted-foreground"
                      >
                        {t("adminAnalyses.noResults")}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr
                        key={row.analysisId}
                        className={`border-b border-border/50 hover:bg-muted/20 ${
                          selectedIds.has(row.analysisId) ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={selectedIds.has(row.analysisId)}
                            onCheckedChange={(c) => toggleRow(row.analysisId, c === true)}
                            aria-label={t("adminAnalyses.selectAnalysis", { title: row.analysisTitle })}
                          />
                        </td>
                        <td className="p-3 overflow-hidden">
                          <p className="text-foreground truncate">{row.analysisTitle}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatLocaleDate(locale, row.startedAt)}
                          </p>
                        </td>
                        <td className="p-3 text-xs overflow-hidden">
                          <p className="text-foreground truncate">{row.executorName ?? "—"}</p>
                          <p className="text-muted-foreground truncate">{row.executorEmail}</p>
                        </td>
                        <td className="p-3 text-xs overflow-hidden">
                          <p className="text-foreground truncate">{row.applicationName}</p>
                          {row.applicationBaseUrl && (
                            <p className="text-muted-foreground truncate">{row.applicationBaseUrl}</p>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground overflow-hidden truncate">
                          {row.applicationOwnerEmail ?? row.applicationOwnerName ?? "—"}
                        </td>
                        <td className="p-3 text-xs overflow-hidden">
                          {row.aiModelDisplay !== notConfigured ? (
                            <div className="space-y-0.5">
                              <Badge variant="outline" className="text-[10px] truncate max-w-full">
                                {row.aiModelDisplay}
                              </Badge>
                              {row.latestAiMode && (
                                <p className="text-muted-foreground truncate">
                                  {labels.aiMode(row.latestAiMode)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">{notConfigured}</span>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          {row.postureScore != null ? `${row.postureScore}%` : "—"}
                        </td>
                        <td className="p-3 text-xs">
                          {labels.analysisStatus(row.analysisStatus)}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => navigate(`/analyses/${row.analysisId}/checklist`)}
                            >
                              {t("common.open")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => navigate(`/applications/${row.applicationId}`)}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </ResizableTable>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
