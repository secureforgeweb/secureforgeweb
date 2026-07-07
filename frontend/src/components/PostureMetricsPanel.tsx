import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";

const SEVERITY_CHART_CONFIG: ChartConfig = {
  critical: { label: "Crítica", color: "#f87171" },
  high: { label: "Alta", color: "#fb923c" },
  medium: { label: "Média", color: "#facc15" },
  low: { label: "Baixa", color: "#34d399" },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#f87171",
  high: "#fb923c",
  medium: "#facc15",
  low: "#34d399",
};

type SeverityItem = { severity: string; count: number };
type CategoryItem = { categoryName: string; count: number };

type PostureMetricsProps = {
  postureScore: number | null;
  openFindings: number;
  totalFindings: number;
  resolutionRate: number;
  findingsBySeverity: SeverityItem[];
  findingsByCategory: CategoryItem[];
  checklistProgress?: {
    totalItems: number;
    conforme: number;
    parcial: number;
    nao_conforme: number;
    nao_aplicavel: number;
    answeredItems: number;
  } | null;
};

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export default function PostureMetricsPanel({
  postureScore,
  openFindings,
  totalFindings,
  resolutionRate,
  findingsBySeverity,
  findingsByCategory,
  checklistProgress,
}: PostureMetricsProps) {
  const severityData = findingsBySeverity
    .filter((s) => s.count > 0)
    .map((s) => ({
      severity: s.severity,
      label: SEVERITY_CHART_CONFIG[s.severity]?.label ?? s.severity,
      count: s.count,
      fill: SEVERITY_COLORS[s.severity] ?? "#64748b",
    }));

  const categoryData = findingsByCategory.slice(0, 6).map((c) => ({
    name: c.categoryName.length > 18 ? `${c.categoryName.slice(0, 16)}…` : c.categoryName,
    fullName: c.categoryName,
    count: c.count,
  }));

  const checklistPercent =
    checklistProgress && checklistProgress.totalItems > 0
      ? Math.round((checklistProgress.answeredItems / checklistProgress.totalItems) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 col-span-2 md:col-span-1">
          <p className="text-xs text-muted-foreground font-mono mb-2">Score de postura</p>
          <p className={`text-4xl font-bold font-mono ${scoreColor(postureScore)}`}>
            {postureScore !== null ? `${postureScore}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Itens conformes + N/A</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground font-mono mb-2">Achados abertos</p>
          <p className="text-2xl font-bold font-mono text-orange-400">{openFindings}</p>
          <p className="text-xs text-muted-foreground mt-1">de {totalFindings} total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground font-mono mb-2">Taxa de resolução</p>
          <p className="text-2xl font-bold font-mono text-emerald-400">{resolutionRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">resolvidos + aceitos</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground font-mono mb-2">Checklist</p>
          <p className="text-2xl font-bold font-mono text-foreground">
            {checklistProgress ? `${checklistPercent}%` : "—"}
          </p>
          {checklistProgress && (
            <Progress value={checklistPercent} className="mt-2 h-1.5" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-mono font-semibold text-foreground mb-4">Achados por severidade</h3>
          {severityData.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono">Nenhum achado registrado.</p>
          ) : (
            <ChartContainer config={SEVERITY_CHART_CONFIG} className="h-[220px] w-full">
              <BarChart data={severityData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  fontSize={10}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={4}>
                  {severityData.map((entry) => (
                    <Cell key={entry.severity} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-mono font-semibold text-foreground mb-4">Achados por categoria</h3>
          {categoryData.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono">Nenhum achado por categoria.</p>
          ) : (
            <ChartContainer config={{ count: { label: "Achados", color: "#22d3ee" } }} className="h-[220px] w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => [
                        `${value} achado(s)`,
                        (item.payload as { fullName?: string }).fullName,
                      ]}
                    />
                  }
                />
                <Pie
                  data={categoryData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, count }) => `${name}: ${count}`}
                  labelLine={false}
                  fontSize={9}
                />
              </PieChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export function downloadPdfBase64(base64: string, filename: string) {
  const link = document.createElement("a");
  link.href = `data:application/pdf;base64,${base64}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
