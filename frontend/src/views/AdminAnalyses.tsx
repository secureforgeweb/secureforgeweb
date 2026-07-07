import { useCallback, useMemo, useRef, useState } from "react";
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

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const MODE_LABELS: Record<string, string> = {
  llm: "LLM",
  heuristic: "Heurístico",
  "heuristic-fallback": "Heurístico (fallback)",
};

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

const COLUMN_LABELS: Record<ColumnKey, string> = {
  select: "",
  analysis: "Análise",
  executor: "Executado por",
  application: "Aplicação",
  owner: "Dono app",
  model: "Modelo IA",
  posture: "Postura",
  status: "Status",
  actions: "Ações",
};

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

const COMPARE_CHART_CONFIG: ChartConfig = {
  posture: { label: "Postura (%)", color: "#22d3ee" },
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

function rowSearchText(row: AnalysisRow, key: keyof ColumnFilters): string {
  switch (key) {
    case "analysis":
      return `${row.analysisTitle} ${new Date(row.startedAt).toLocaleDateString("pt-BR")}`;
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
      return `${STATUS_LABELS[row.analysisStatus] ?? row.analysisStatus} ${row.analysisStatus}`;
    default:
      return "";
  }
}

function useResizableColumns(defaults: Record<ColumnKey, number>) {
  const [widths, setWidths] = useState(defaults);
  const resizing = useRef<{ col: ColumnKey; startX: number; startW: number } | null>(null);

  const onResizeStart = useCallback(
    (col: ColumnKey, clientX: number) => {
      resizing.current = { col, startX: clientX, startW: widths[col] };

      const onMove = (e: MouseEvent) => {
        if (!resizing.current) return;
        const delta = e.clientX - resizing.current.startX;
        const next = Math.max(48, resizing.current.startW + delta);
        setWidths((prev) => ({ ...prev, [resizing.current!.col]: next }));
      };

      const onUp = () => {
        resizing.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [widths]
  );

  return { widths, onResizeStart };
}

function ResizeHandle({
  onResizeStart,
}: {
  onResizeStart: (clientX: number) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart(e.clientX);
      }}
    />
  );
}

function comparisonLabel(row: AnalysisRow): string {
  const who = row.executorName?.split(" ")[0] ?? row.executorEmail?.split("@")[0] ?? "?";
  const modelMatch = row.aiModelDisplay.match(/\(([^)]+)\)/);
  const model =
    modelMatch?.[1] ??
    row.aiModelKey?.split(":").pop() ??
    (row.aiModelDisplay !== "Não configurado" ? row.aiModelDisplay : "Não configurado");
  return `${who} · ${model}`;
}

function formatModeLabel(mode: string | null | undefined): string | null {
  if (!mode) return null;
  return MODE_LABELS[mode] ?? mode;
}

export default function AdminAnalyses() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [applicationFilter, setApplicationFilter] = useState<string>("all");
  const [baseUrlFilter, setBaseUrlFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showCompareChart, setShowCompareChart] = useState(false);

  const { widths, onResizeStart } = useResizableColumns(DEFAULT_WIDTHS);

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
        matchesFilter(rowSearchText(row, key), columnFilters[key])
      );
    });
  }, [analyses, applicationFilter, baseUrlFilter, columnFilters]);

  const selectedRows = useMemo(
    () => filteredRows.filter((r) => selectedIds.has(r.analysisId)),
    [filteredRows, selectedIds]
  );

  const comparisonData = useMemo(() => {
    return selectedRows.map((row, index) => ({
      id: row.analysisId,
      label: comparisonLabel(row),
      shortLabel:
        comparisonLabel(row).length > 22
          ? `${comparisonLabel(row).slice(0, 20)}…`
          : comparisonLabel(row),
      posture: row.postureScore ?? 0,
      hasPosture: row.postureScore != null,
      model: row.aiModelDisplay,
      executor: row.executorEmail ?? row.executorName ?? "—",
      application: row.applicationName,
      fill: `hsl(${(index * 67) % 360} 70% 50%)`,
    }));
  }, [selectedRows]);

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
            <p className="text-muted-foreground font-mono">Acesso restrito a administradores.</p>
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
                Análises — visão global
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Redimensione colunas, filtre por campo e compare 2+ análises em gráfico.
              </p>
            </div>
          </div>

          {selectedIds.size >= 2 && (
            <Button
              className="font-mono text-xs"
              onClick={() => setShowCompareChart((v) => !v)}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {showCompareChart ? "Ocultar" : "Comparar"} ({selectedIds.size})
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Select value={applicationFilter} onValueChange={setApplicationFilter}>
            <SelectTrigger className="w-56 font-mono text-sm">
              <SelectValue placeholder="Aplicação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-sm">
                Todas as aplicações
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
            placeholder="URL base (exata)"
            className="max-w-xs font-mono text-sm"
          />
          <Button variant="outline" size="sm" className="font-mono text-xs" onClick={clearFilters}>
            Limpar filtros
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
              Desmarcar ({selectedIds.size})
            </Button>
          )}
        </div>

        {showCompareChart && selectedIds.size >= 2 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-mono font-semibold text-foreground">
                Comparação de postura — {selectedRows.length} análises
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Análises sem score concluído aparecem com 0% (em andamento).
              </p>
            </div>
            <ChartContainer config={COMPARE_CHART_CONFIG} className="h-[280px] w-full">
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
                          {item.payload.hasPosture ? `${value}%` : "Sem score (em andamento)"}
                        </span>
                      )}
                      labelFormatter={(_label, payload) => {
                        const p = payload?.[0]?.payload;
                        if (!p) return "";
                        return (
                          <div className="space-y-0.5 text-xs font-mono">
                            <p>{p.executor}</p>
                            <p className="text-muted-foreground">{p.application}</p>
                            <p className="text-muted-foreground">Modelo: {p.model}</p>
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
                    Postura: {item.hasPosture ? `${item.posture}%` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando análises...
          </div>
        ) : !analyses?.length ? (
          <p className="text-sm text-muted-foreground font-mono">Nenhuma análise encontrada.</p>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <p className="text-xs text-muted-foreground font-mono px-4 py-2 border-b border-border">
              {filteredRows.length} de {analyses.length} análise(s) · arraste a borda da coluna para
              redimensionar
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono" style={{ tableLayout: "fixed", minWidth: "100%" }}>
                <colgroup>
                  {(Object.keys(DEFAULT_WIDTHS) as ColumnKey[]).map((col) => (
                    <col key={col} style={{ width: widths[col] }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((col) => (
                      <th key={col} className="relative p-0 font-medium select-none">
                        <div className="p-3 pr-4 flex items-center gap-2 min-h-[2.5rem]">
                          {col === "select" ? (
                            <Checkbox
                              checked={allFilteredSelected}
                              onCheckedChange={(c) => toggleAllFiltered(c === true)}
                              aria-label="Selecionar todos filtrados"
                            />
                          ) : (
                            <span className="truncate">{COLUMN_LABELS[col]}</span>
                          )}
                        </div>
                        {col !== "select" && col !== "actions" && (
                          <ResizeHandle onResizeStart={(x) => onResizeStart(col, x)} />
                        )}
                      </th>
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
                          placeholder={`Filtrar ${COLUMN_LABELS[key].toLowerCase()}…`}
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
                        Nenhum resultado para os filtros atuais.
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
                            aria-label={`Selecionar análise ${row.analysisTitle}`}
                          />
                        </td>
                        <td className="p-3 overflow-hidden">
                          <p className="text-foreground truncate">{row.analysisTitle}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(row.startedAt).toLocaleDateString("pt-BR")}
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
                          {row.aiModelDisplay !== "Não configurado" ? (
                            <div className="space-y-0.5">
                              <Badge variant="outline" className="text-[10px] truncate max-w-full">
                                {row.aiModelDisplay}
                              </Badge>
                              {row.latestAiMode && (
                                <p className="text-muted-foreground truncate">
                                  {formatModeLabel(row.latestAiMode)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Não configurado</span>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          {row.postureScore != null ? `${row.postureScore}%` : "—"}
                        </td>
                        <td className="p-3 text-xs">
                          {STATUS_LABELS[row.analysisStatus] ?? row.analysisStatus}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => navigate(`/analyses/${row.analysisId}/checklist`)}
                            >
                              Abrir
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
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
