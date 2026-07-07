import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db.js";
import {
  analyses,
  applications,
  checklistResponses,
  findings,
  checklistItems,
  checklistCategories,
} from "../../drizzle/schema.js";
import { getActiveChecklist, listChecklistItems } from "./checklist.db.js";
import type { ComplianceValue } from "./analyses.db.js";

export type SeverityBreakdown = {
  severity: "critical" | "high" | "medium" | "low";
  count: number;
};

export type CategoryBreakdown = {
  categoryId: number;
  categoryName: string;
  count: number;
};

export type AnalysisSummary = {
  id: number;
  title: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  postureScore: number | null;
};

export type ChecklistProgress = {
  totalItems: number;
  conforme: number;
  parcial: number;
  nao_conforme: number;
  nao_aplicavel: number;
  answeredItems: number;
};

export type ApplicationDashboard = {
  application: {
    id: number;
    name: string;
    baseUrl: string | null;
    techStack: string | null;
  };
  postureScore: number | null;
  checklistProgress: ChecklistProgress | null;
  totalFindings: number;
  openFindings: number;
  resolutionRate: number;
  findingsBySeverity: SeverityBreakdown[];
  findingsByCategory: CategoryBreakdown[];
  findingsByStatus: { status: string; count: number }[];
  analyses: AnalysisSummary[];
  latestAnalysisId: number | null;
};

export type GlobalDashboard = {
  totalApplications: number;
  averagePostureScore: number | null;
  totalFindings: number;
  openFindings: number;
  overallResolutionRate: number;
  findingsBySeverity: SeverityBreakdown[];
  applications: Array<{
    id: number;
    name: string;
    techStack: string | null;
    postureScore: number | null;
    openFindings: number;
    totalFindings: number;
    latestAnalysisId: number | null;
  }>;
};

const SEVERITY_ORDER: Array<"critical" | "high" | "medium" | "low"> = [
  "critical",
  "high",
  "medium",
  "low",
];

export function computePostureScore(
  responses: Array<{ compliance: ComplianceValue }>,
  totalItems: number
): number {
  if (totalItems === 0) return 0;
  const positive = responses.filter(
    (r) => r.compliance === "conforme" || r.compliance === "nao_aplicavel"
  ).length;
  return Math.round((positive / totalItems) * 100);
}

export function computeChecklistProgress(
  responses: Array<{ compliance: ComplianceValue }>,
  totalItems: number
): ChecklistProgress {
  const counts = {
    conforme: 0,
    parcial: 0,
    nao_conforme: 0,
    nao_aplicavel: 0,
  };
  for (const r of responses) {
    counts[r.compliance]++;
  }
  return {
    totalItems,
    ...counts,
    answeredItems: responses.length,
  };
}

function buildSeverityBreakdown(
  rows: Array<{ severity: "critical" | "high" | "medium" | "low" }>
): SeverityBreakdown[] {
  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.severity] = (map[row.severity] ?? 0) + 1;
  }
  return SEVERITY_ORDER.map((severity) => ({
    severity,
    count: map[severity] ?? 0,
  }));
}

function computeResolutionRate(
  rows: Array<{ status: "aberto" | "em_correcao" | "resolvido" | "aceito_risco" }>
): number {
  if (rows.length === 0) return 100;
  const resolved = rows.filter(
    (r) => r.status === "resolvido" || r.status === "aceito_risco"
  ).length;
  return Math.round((resolved / rows.length) * 100);
}

async function getAnalysisPostureScore(analysisId: number, checklistId: number) {
  const db = await getDb();
  if (!db) return { score: null, progress: null as ChecklistProgress | null };

  const [responses, items] = await Promise.all([
    db
      .select({ compliance: checklistResponses.compliance })
      .from(checklistResponses)
      .where(eq(checklistResponses.analysisId, analysisId)),
    listChecklistItems(checklistId),
  ]);

  if (responses.length === 0) {
    return { score: null, progress: null };
  }

  const progress = computeChecklistProgress(responses, items.length);
  return { score: computePostureScore(responses, items.length), progress };
}

export async function getApplicationDashboard(
  applicationId: number
): Promise<ApplicationDashboard | null> {
  const db = await getDb();
  if (!db) return null;

  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return null;

  const [analysisRows, findingRows] = await Promise.all([
    db
      .select()
      .from(analyses)
      .where(eq(analyses.applicationId, applicationId))
      .orderBy(desc(analyses.completedAt), desc(analyses.createdAt)),
    db
      .select({
        id: findings.id,
        severity: findings.severity,
        status: findings.status,
        categoryId: checklistCategories.id,
        categoryName: checklistCategories.name,
      })
      .from(findings)
      .innerJoin(analyses, eq(findings.analysisId, analyses.id))
      .leftJoin(checklistItems, eq(findings.itemId, checklistItems.id))
      .leftJoin(checklistCategories, eq(checklistItems.categoryId, checklistCategories.id))
      .where(eq(analyses.applicationId, applicationId)),
  ]);

  const analysisSummaries: AnalysisSummary[] = [];
  for (const analysis of analysisRows) {
    const { score } = await getAnalysisPostureScore(analysis.id, analysis.checklistId);
    analysisSummaries.push({
      id: analysis.id,
      title: analysis.title,
      status: analysis.status,
      startedAt: analysis.startedAt,
      completedAt: analysis.completedAt,
      postureScore: analysis.status === "concluida" ? score : null,
    });
  }

  const latestCompleted = analysisRows.find((a) => a.status === "concluida");
  let postureScore: number | null = null;
  let checklistProgress: ChecklistProgress | null = null;

  if (latestCompleted) {
    const result = await getAnalysisPostureScore(
      latestCompleted.id,
      latestCompleted.checklistId
    );
    postureScore = result.score;
    checklistProgress = result.progress;
  } else if (analysisRows[0]) {
    const result = await getAnalysisPostureScore(
      analysisRows[0].id,
      analysisRows[0].checklistId
    );
    postureScore = result.score;
    checklistProgress = result.progress;
  }

  const openFindings = findingRows.filter(
    (f) => f.status === "aberto" || f.status === "em_correcao"
  ).length;

  const categoryMap = new Map<number, { categoryName: string; count: number }>();
  for (const f of findingRows) {
    if (!f.categoryId || !f.categoryName) continue;
    const existing = categoryMap.get(f.categoryId);
    if (existing) existing.count++;
    else categoryMap.set(f.categoryId, { categoryName: f.categoryName, count: 1 });
  }

  const statusMap: Record<string, number> = {};
  for (const f of findingRows) {
    statusMap[f.status] = (statusMap[f.status] ?? 0) + 1;
  }

  return {
    application: {
      id: app.id,
      name: app.name,
      baseUrl: app.baseUrl,
      techStack: app.techStack,
    },
    postureScore,
    checklistProgress,
    totalFindings: findingRows.length,
    openFindings,
    resolutionRate: computeResolutionRate(findingRows),
    findingsBySeverity: buildSeverityBreakdown(findingRows),
    findingsByCategory: Array.from(categoryMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.categoryName,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count),
    findingsByStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    analyses: analysisSummaries,
    latestAnalysisId: latestCompleted?.id ?? analysisRows[0]?.id ?? null,
  };
}

export async function getGlobalDashboard(userId: number): Promise<GlobalDashboard> {
  const db = await getDb();
  if (!db) {
    return {
      totalApplications: 0,
      averagePostureScore: null,
      totalFindings: 0,
      openFindings: 0,
      overallResolutionRate: 0,
      findingsBySeverity: SEVERITY_ORDER.map((severity) => ({ severity, count: 0 })),
      applications: [],
    };
  }

  const apps = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.updatedAt));

  const appDashboards = await Promise.all(
    apps.map(async (app) => {
      const dash = await getApplicationDashboard(app.id);
      return dash;
    })
  );

  const valid = appDashboards.filter((d): d is ApplicationDashboard => d !== null);
  const scores = valid
    .map((d) => d.postureScore)
    .filter((s): s is number => s !== null);

  const allFindings = valid.flatMap((d) =>
    d.findingsBySeverity.flatMap((s) => Array(s.count).fill({ severity: s.severity }))
  ) as Array<{ severity: "critical" | "high" | "medium" | "low" }>;

  const totalFindings = valid.reduce((sum, d) => sum + d.totalFindings, 0);
  const openFindings = valid.reduce((sum, d) => sum + d.openFindings, 0);
  const totalResolvedWeight = valid.reduce(
    (sum, d) => sum + (d.resolutionRate / 100) * d.totalFindings,
    0
  );

  return {
    totalApplications: apps.length,
    averagePostureScore:
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
    totalFindings,
    openFindings,
    overallResolutionRate:
      totalFindings > 0 ? Math.round((totalResolvedWeight / totalFindings) * 100) : 100,
    findingsBySeverity: buildSeverityBreakdown(allFindings),
    applications: valid.map((d) => ({
      id: d.application.id,
      name: d.application.name,
      techStack: d.application.techStack,
      postureScore: d.postureScore,
      openFindings: d.openFindings,
      totalFindings: d.totalFindings,
      latestAnalysisId: d.latestAnalysisId,
    })),
  };
}

export async function getPostureReportData(applicationId: number, analysisId?: number) {
  const dashboard = await getApplicationDashboard(applicationId);
  if (!dashboard) return null;

  const db = await getDb();
  if (!db) return null;

  const targetAnalysisId = analysisId ?? dashboard.latestAnalysisId;
  if (!targetAnalysisId) {
    return { dashboard, findings: [], analysisTitle: null };
  }

  const [analysis] = await db
    .select()
    .from(analyses)
    .where(and(eq(analyses.id, targetAnalysisId), eq(analyses.applicationId, applicationId)))
    .limit(1);

  if (!analysis) {
    return { dashboard, findings: [], analysisTitle: null };
  }

  const findingRows = await db
    .select({
      id: findings.id,
      title: findings.title,
      description: findings.description,
      severity: findings.severity,
      priority: findings.priority,
      status: findings.status,
      recommendationTitle: findings.recommendationTitle,
      recommendationAction: findings.recommendationAction,
      itemCode: checklistItems.code,
      categoryName: checklistCategories.name,
    })
    .from(findings)
    .innerJoin(analyses, eq(findings.analysisId, analyses.id))
    .leftJoin(checklistItems, eq(findings.itemId, checklistItems.id))
    .leftJoin(checklistCategories, eq(checklistItems.categoryId, checklistCategories.id))
    .where(eq(findings.analysisId, targetAnalysisId));

  const priorityOrder: Record<string, number> = {
    imediata: 0,
    curto_prazo: 1,
    medio_prazo: 2,
    baixa: 3,
  };
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const sortedFindings = [...findingRows].sort((a, b) => {
    const sev = severityOrder[a.severity] - severityOrder[b.severity];
    if (sev !== 0) return sev;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const { score, progress } = await getAnalysisPostureScore(analysis.id, analysis.checklistId);

  return {
    dashboard: {
      ...dashboard,
      postureScore: analysis.status === "concluida" ? score : dashboard.postureScore,
      checklistProgress: progress ?? dashboard.checklistProgress,
    },
    findings: sortedFindings,
    analysisTitle: analysis.title,
    analysisCompletedAt: analysis.completedAt,
  };
}
