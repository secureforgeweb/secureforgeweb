import { useMemo } from "react";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import type { MessageKey } from "@/i18n/messages";

const SEVERITY_KEYS: Record<string, MessageKey> = {
  critical: "severity.critical",
  high: "severity.high",
  medium: "severity.medium",
  low: "severity.low",
};

const ANALYSIS_STATUS_KEYS: Record<string, MessageKey> = {
  rascunho: "status.draft",
  em_andamento: "status.inProgress",
  concluida: "status.completed",
};

const FINDING_STATUS_KEYS: Record<string, MessageKey> = {
  aberto: "findingStatus.open",
  em_correcao: "findingStatus.inProgress",
  resolvido: "findingStatus.resolved",
  aceito_risco: "findingStatus.acceptedRisk",
};

const PRIORITY_KEYS: Record<string, MessageKey> = {
  imediata: "priority.immediate",
  curto_prazo: "priority.shortTerm",
  medio_prazo: "priority.mediumTerm",
  baixa: "priority.low",
};

const COMPLIANCE_KEYS: Record<string, MessageKey> = {
  conforme: "compliance.compliant",
  parcial: "compliance.partial",
  nao_conforme: "compliance.nonCompliant",
  nao_aplicavel: "compliance.notApplicable",
};

const HISTORY_ACTION_KEYS: Record<string, MessageKey> = {
  status_changed: "history.statusChanged",
  notes_updated: "history.notesUpdated",
  severity_changed: "history.severityChanged",
  created: "history.created",
};

const AI_MODE_KEYS: Record<string, MessageKey> = {
  llm: "aiMode.llm",
  heuristic: "aiMode.heuristic",
  "heuristic-fallback": "aiMode.heuristicFallback",
};

const SCOPE_KEYS: Record<string, MessageKey> = {
  http_headers: "scope.http",
  git_repo: "scope.git",
  ai_agent: "scope.ai",
};

const SCOPE_SHORT_KEYS: Record<string, MessageKey> = {
  http_headers: "scope.httpShort",
  git_repo: "scope.gitShort",
  ai_agent: "scope.aiShort",
};

const ROLE_KEYS: Record<string, MessageKey> = {
  admin: "role.admin",
  "security-analyst": "role.securityAnalyst",
  user: "role.user",
};

export function useEnumLabels() {
  const { t } = useLocale();

  return useMemo(
    () => ({
      role: (value: string) => t(ROLE_KEYS[value] ?? "role.default"),
      severity: (value: string) => t(SEVERITY_KEYS[value] ?? "severity.low"),
      analysisStatus: (value: string) => t(ANALYSIS_STATUS_KEYS[value] ?? "status.draft"),
      findingStatus: (value: string) => t(FINDING_STATUS_KEYS[value] ?? "findingStatus.open"),
      priority: (value: string) => t(PRIORITY_KEYS[value] ?? "priority.low"),
      compliance: (value: string) => t(COMPLIANCE_KEYS[value] ?? "compliance.nonCompliant"),
      historyAction: (value: string) => t(HISTORY_ACTION_KEYS[value] ?? "history.created"),
      aiMode: (value: string) => t(AI_MODE_KEYS[value] ?? "aiMode.llm"),
      scope: (value: string) => t(SCOPE_KEYS[value] ?? "scope.http"),
      scopeShort: (value: string) => t(SCOPE_SHORT_KEYS[value] ?? "scope.httpShort"),
      severityOptions: () =>
        (["critical", "high", "medium", "low"] as const).map((value) => ({
          value,
          label: t(SEVERITY_KEYS[value]),
        })),
      findingStatusOptions: () =>
        (["aberto", "em_correcao", "resolvido", "aceito_risco"] as const).map((value) => ({
          value,
          label: t(FINDING_STATUS_KEYS[value]),
        })),
      complianceOptions: () =>
        (["conforme", "parcial", "nao_conforme", "nao_aplicavel"] as const).map((value) => ({
          value,
          label: t(COMPLIANCE_KEYS[value]),
        })),
    }),
    [t]
  );
}
