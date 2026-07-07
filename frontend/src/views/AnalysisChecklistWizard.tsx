import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLocation, useRoute } from "wouter";

import { trpc } from "@/lib/trpc";

import DashboardLayout from "@/components/DashboardLayout";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";

import {

  ArrowLeft,

  ArrowRight,

  CheckCircle2,

  ClipboardList,

  AlertTriangle,

  Loader2,

  Sparkles,

  GitBranch,

  Brain,

} from "lucide-react";

import SuggestionEvidenceDialog, {
  EvidenceIconButton,
  type SuggestionEvidenceEntry,
} from "@/components/SuggestionEvidenceDialog";
import type { AssessmentEvidenceArtifact } from "@/lib/assessmentEvidence";



type Compliance = "conforme" | "parcial" | "nao_conforme" | "nao_aplicavel";

type AutoSuggestionMeta = {
  confidence: number;
  evidence: string;
  rationale: string;
  source?: "auto" | "ai";
  scope?: AssessmentScope;
  compliance?: Compliance;
  artifacts?: AssessmentEvidenceArtifact[];
  assessedAt?: string;
};

type AssessmentScope = "http_headers" | "git_repo" | "ai_agent";

type PendingAssessment = { scope: AssessmentScope; itemIds: number[] } | null;

const HTTP_ITEM_CODES = new Set(["HEADER-01", "HEADER-02", "HEADER-03", "HEADER-04", "DATA-01"]);

const GIT_ITEM_CODES = new Set([
  "AUTH-01", "AUTH-02", "AUTH-03", "AUTH-04",
  "AUTHZ-01", "AUTHZ-02", "AUTHZ-03",
  "INPUT-01", "INPUT-02", "INPUT-03",
  "SECRET-01", "SECRET-02", "ERROR-01", "ERROR-02",
]);

function getScopeItemIds(
  items: { id: number; code: string }[],
  scope: AssessmentScope
): number[] {
  if (scope === "ai_agent") return items.map((i) => i.id);
  const codeSet = scope === "http_headers" ? HTTP_ITEM_CODES : GIT_ITEM_CODES;
  return items.filter((i) => codeSet.has(i.code)).map((i) => i.id);
}



const COMPLIANCE_OPTIONS: { value: Compliance; label: string; color: string }[] = [

  { value: "conforme", label: "Conforme", color: "text-emerald-400" },

  { value: "parcial", label: "Parcialmente conforme", color: "text-yellow-400" },

  { value: "nao_conforme", label: "Não conforme", color: "text-red-400" },

  { value: "nao_aplicavel", label: "Não aplicável", color: "text-muted-foreground" },

];



const SEVERITY_COLORS: Record<string, string> = {

  critical: "border-red-400/30 text-red-400",

  high: "border-orange-400/30 text-orange-400",

  medium: "border-yellow-400/30 text-yellow-400",

  low: "border-emerald-400/30 text-emerald-400",

};



type LocalResponse = { compliance: Compliance; notes: string };



export default function AnalysisChecklistWizard() {

  const [, navigate] = useLocation();

  const [, params] = useRoute("/analyses/:id/checklist");

  const analysisId = Number(params?.id);



  const utils = trpc.useUtils();

  const { data: wizard, isLoading } = trpc.analyses.getWizard.useQuery(

    { id: analysisId },

    { enabled: Number.isFinite(analysisId) && analysisId > 0 }

  );



  const [categoryIndex, setCategoryIndex] = useState(0);

  const [localResponses, setLocalResponses] = useState<Record<number, LocalResponse>>({});

  const [autoMeta, setAutoMeta] = useState<Record<number, AutoSuggestionMeta>>({});

  const [itemEvidenceMap, setItemEvidenceMap] = useState<Record<number, SuggestionEvidenceEntry[]>>({});

  const [evidenceDialogItem, setEvidenceDialogItem] = useState<{
    id: number;
    code: string;
    title: string;
  } | null>(null);

  const [showSummary, setShowSummary] = useState(false);

  const [lastSuggestedCount, setLastSuggestedCount] = useState(0);

  const [pendingAssessment, setPendingAssessment] = useState<PendingAssessment>(null);

  const hydratedRef = useRef(false);

  const silentSaveRef = useRef(false);



  const categories = wizard?.categories ?? [];

  const currentCategory = categories[categoryIndex];



  useEffect(() => {

    if (!wizard) return;

    setLocalResponses((prev) => {

      const next = { ...prev };

      for (const item of wizard.items) {

        const saved = wizard.responses[item.id];

        if (saved && !prev[item.id]) {

          next[item.id] = {

            compliance: saved.compliance as Compliance,

            notes: saved.notes ?? "",

          };

        }

      }

      if (!hydratedRef.current) {

        for (const item of wizard.items) {

          const saved = wizard.responses[item.id];

          if (saved) {

            next[item.id] = {

              compliance: saved.compliance as Compliance,

              notes: saved.notes ?? "",

            };

          }

        }

        hydratedRef.current = true;

      }

      return next;

    });

    if (wizard.analysis.status === "concluida") setShowSummary(true);

    if (wizard.itemEvidence?.length) {
      const grouped: Record<number, SuggestionEvidenceEntry[]> = {};
      for (const row of wizard.itemEvidence) {
        const entry: SuggestionEvidenceEntry = {
          scope: row.scope as AssessmentScope,
          source: row.source as "auto" | "ai",
          confidence: row.confidence,
          compliance: row.compliance,
          evidence: row.evidence,
          rationale: row.rationale,
          artifacts: (row.artifacts as AssessmentEvidenceArtifact[]) ?? [],
          assessedAt: row.assessedAt ? new Date(row.assessedAt).toISOString() : undefined,
        };
        if (!grouped[row.itemId]) grouped[row.itemId] = [];
        const existing = grouped[row.itemId].findIndex((e) => e.scope === entry.scope);
        if (existing >= 0) grouped[row.itemId][existing] = entry;
        else grouped[row.itemId].push(entry);
      }
      setItemEvidenceMap(grouped);

      setAutoMeta((prev) => {
        const next = { ...prev };
        for (const [itemIdStr, entries] of Object.entries(grouped)) {
          const itemId = Number(itemIdStr);
          const latest = [...entries].sort((a, b) => {
            const ta = a.assessedAt ? Date.parse(a.assessedAt) : 0;
            const tb = b.assessedAt ? Date.parse(b.assessedAt) : 0;
            return tb - ta;
          })[0];
          if (latest && !prev[itemId]) {
            next[itemId] = {
              confidence: latest.confidence,
              evidence: latest.evidence,
              rationale: latest.rationale,
              source: latest.source,
              scope: latest.scope,
              compliance: latest.compliance as Compliance | undefined,
              artifacts: latest.artifacts,
              assessedAt: latest.assessedAt,
            };
          }
        }
        return next;
      });
    }

  }, [wizard]);



  const saveMutation = trpc.analyses.saveResponses.useMutation({

    onSuccess: (result) => {

      setLastSuggestedCount(result.suggestedFindings.length);

      utils.analyses.getWizard.invalidate({ id: analysisId });

      if (!silentSaveRef.current) {

        toast.success(`${result.savedCount} resposta(s) salva(s)`);

      }

      silentSaveRef.current = false;

    },

    onError: (e) => {

      silentSaveRef.current = false;

      toast.error(e.message);

    },

  });



  const completeMutation = trpc.analyses.complete.useMutation({

    onSuccess: async () => {

      utils.analyses.getWizard.invalidate({ id: analysisId });

      toast.success("Análise concluída! Achados gerados automaticamente.");

      if (wizard?.analysis.applicationId) {

        navigate(`/applications/${wizard.analysis.applicationId}/findings`);

      }

    },

    onError: (e) => toast.error(e.message),

  });



  const applyAutoSuggestions = useCallback(
    (
      result: {
        scope: AssessmentScope;
        suggestions: Array<{
          itemId: number;
          compliance: string;
          confidence: number;
          evidence: string;
          rationale: string;
          source?: "auto" | "ai";
          artifacts?: AssessmentEvidenceArtifact[];
        }>;
        assessmentMode?: string;
        filesScanned?: number;
        assessedUrl?: string;
      },
      itemCount: number
    ) => {
      const meta: Record<number, AutoSuggestionMeta> = {};
      const evidenceUpdates: Record<number, SuggestionEvidenceEntry[]> = {};

      setLocalResponses((prev) => {
        const next = { ...prev };

        for (const suggestion of result.suggestions) {
          const label =
            suggestion.source === "ai"
              ? "Assistente IA"
              : result.scope === "git_repo"
                ? "Análise Git"
                : "Análise HTTP";

          next[suggestion.itemId] = {
            compliance: suggestion.compliance as Compliance,
            notes: `[${label} · ${suggestion.confidence}%]\n${suggestion.evidence}\n\n${suggestion.rationale}`,
          };

          const assessedAt = new Date().toISOString();
          meta[suggestion.itemId] = {
            confidence: suggestion.confidence,
            evidence: suggestion.evidence,
            rationale: suggestion.rationale,
            source: suggestion.source,
            scope: result.scope,
            compliance: suggestion.compliance as Compliance,
            artifacts: suggestion.artifacts,
            assessedAt,
          };

          evidenceUpdates[suggestion.itemId] = [
            {
              scope: result.scope,
              source: suggestion.source,
              confidence: suggestion.confidence,
              compliance: suggestion.compliance,
              evidence: suggestion.evidence,
              rationale: suggestion.rationale,
              artifacts: suggestion.artifacts,
              assessedAt,
            },
          ];
        }

        return next;
      });

      setAutoMeta((prev) => ({ ...prev, ...meta }));

      setItemEvidenceMap((prev) => {
        const next = { ...prev };
        for (const [itemIdStr, entries] of Object.entries(evidenceUpdates)) {
          const itemId = Number(itemIdStr);
          const existing = [...(next[itemId] ?? [])];
          for (const entry of entries) {
            const idx = existing.findIndex((e) => e.scope === entry.scope);
            if (idx >= 0) existing[idx] = entry;
            else existing.push(entry);
          }
          next[itemId] = existing;
        }
        return next;
      });

      if (result.suggestions.length === 0) {
        toast.message("Nenhuma sugestão gerada para a seleção atual.");
        return;
      }

      const label =
        result.scope === "ai_agent"
          ? `${result.suggestions.length} sugestão(ões) IA (${itemCount === 1 ? "item" : `${itemCount} itens`})`
          : result.scope === "git_repo"
            ? `${result.suggestions.length} sugestão(ões) do repositório`
            : `${result.suggestions.length} sugestão(ões) HTTP`;

      toast.success(label);
    },
    []
  );

  const autoAssessMutation = trpc.analyses.runAutoAssessment.useMutation({

    onMutate: (vars) =>
      setPendingAssessment({
        scope: vars.scope ?? "http_headers",
        itemIds: vars.itemIds ?? [],
      }),

    onSettled: () => setPendingAssessment(null),

    onSuccess: (result, vars) => {
      applyAutoSuggestions(result, vars.itemIds?.length ?? result.suggestions.length);
      utils.analyses.getWizard.invalidate({ id: analysisId });
    },

    onError: (e) => toast.error(e.message),

  });



  const categoryProgress = useMemo(() => {

    if (!currentCategory) return { answered: 0, total: 0, complete: false };

    const items = currentCategory.items;

    const answered = items.filter((i) => localResponses[i.id]?.compliance).length;

    return { answered, total: items.length, complete: answered === items.length && items.length > 0 };

  }, [currentCategory, localResponses]);



  function setItemResponse(itemId: number, patch: Partial<LocalResponse>) {

    if (patch.compliance !== undefined || patch.notes !== undefined) {

      setAutoMeta((prev) => {

        if (!prev[itemId]) return prev;

        const next = { ...prev };

        delete next[itemId];

        return next;

      });

    }

    setLocalResponses((prev) => ({

      ...prev,

      [itemId]: { compliance: prev[itemId]?.compliance ?? "conforme", notes: prev[itemId]?.notes ?? "", ...patch },

    }));

  }



  async function saveCurrentCategory(options?: {
    andAdvance?: boolean;
    requireAll?: boolean;
    silent?: boolean;
  }) {

    const { andAdvance = false, requireAll = false, silent = false } = options ?? {};

    if (!currentCategory) return false;

    const responses = currentCategory.items

      .filter((i) => localResponses[i.id]?.compliance)

      .map((i) => ({

        itemId: i.id,

        compliance: localResponses[i.id].compliance,

        notes: localResponses[i.id].notes || null,

      }));



    if (responses.length === 0) {

      if (!silent) toast.error("Nenhuma resposta para salvar nesta categoria.");

      return false;

    }



    if (requireAll && responses.length < currentCategory.items.length) {

      toast.error("Responda todos os itens desta categoria antes de continuar.");

      return false;

    }



    if (silent) silentSaveRef.current = true;

    await saveMutation.mutateAsync({ analysisId, responses });



    if (andAdvance) {

      if (categoryIndex < categories.length - 1) {

        setCategoryIndex((i) => i + 1);

      } else {

        setShowSummary(true);

      }

    }

    return true;

  }



  async function switchCategory(idx: number) {

    if (idx === categoryIndex) return;

    await saveCurrentCategory({ silent: true });

    setCategoryIndex(idx);

  }



  function runAssessment(scope: AssessmentScope, items: { id: number; code: string }[]) {

    const itemIds = getScopeItemIds(items, scope);

    if (itemIds.length === 0) {

      const msg =
        scope === "http_headers"
          ? "Esta seleção não possui itens avaliáveis via headers HTTP."

          : scope === "git_repo"
            ? "Esta seleção não possui itens avaliáveis via repositório Git."

            : "Nenhum item selecionado para o assistente IA.";

      toast.error(msg);

      return;

    }

    autoAssessMutation.mutate({ analysisId, scope, itemIds });

  }



  function isAssessmentPending(scope: AssessmentScope, itemIds: number[]) {

    if (!pendingAssessment || pendingAssessment.scope !== scope) return false;

    if (itemIds.length === 0) return pendingAssessment.itemIds.length === 0;

    return (
      itemIds.length === pendingAssessment.itemIds.length &&
      itemIds.every((id) => pendingAssessment.itemIds.includes(id))
    );

  }



  if (isLoading) {

    return (

      <DashboardLayout>

        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">

          <Loader2 className="w-4 h-4 animate-spin" /> Carregando checklist...

        </div>

      </DashboardLayout>

    );

  }



  if (!wizard) {

    return (

      <DashboardLayout>

        <p className="text-sm text-muted-foreground font-mono">Análise não encontrada.</p>

      </DashboardLayout>

    );

  }



  const { analysis, progress, application } = wizard;

  const isCompleted = analysis.status === "concluida";

  const applicationBaseUrl = application?.baseUrl?.trim() ?? "";

  const applicationRepositoryUrl = application?.repositoryUrl?.trim() ?? "";

  const canRunHttpAssessment = Boolean(applicationBaseUrl) && !isCompleted;

  const canRunGitAssessment = Boolean(applicationRepositoryUrl) && !isCompleted;

  const canRunAiAssessment =
    Boolean(applicationBaseUrl || applicationRepositoryUrl) && !isCompleted;

  const currentCategoryHttpIds = currentCategory
    ? getScopeItemIds(currentCategory.items, "http_headers")
    : [];

  const currentCategoryGitIds = currentCategory
    ? getScopeItemIds(currentCategory.items, "git_repo")
    : [];

  const categoryAnsweredCount = currentCategory
    ? currentCategory.items.filter((i) => localResponses[i.id]?.compliance).length
    : 0;



  if (showSummary) {

    const nonCompliant = Object.entries(localResponses).filter(

      ([, r]) => r.compliance === "parcial" || r.compliance === "nao_conforme"

    );



    return (

      <DashboardLayout>

        <div className="space-y-6 max-w-5xl">

          <div className="flex items-center gap-3">

            <button

              onClick={() => navigate(`/applications/${analysis.applicationId}`)}

              className="text-muted-foreground hover:text-foreground"

            >

              <ArrowLeft className="w-4 h-4" />

            </button>

            <div>

              <h1 className="text-xl font-bold text-foreground font-mono">Resumo da análise</h1>

              <p className="text-sm text-muted-foreground">{analysis.title}</p>

            </div>

          </div>



          <div className="bg-card border border-border rounded-xl p-5 space-y-4">

            <div className="flex items-center gap-2">

              <CheckCircle2 className="w-5 h-5 text-emerald-400" />

              <p className="text-sm font-mono font-semibold text-foreground">

                Checklist completo — {progress.percentComplete}%

              </p>

            </div>

            <Progress value={progress.percentComplete} />

            <p className="text-xs text-muted-foreground font-mono">

              {progress.answeredItems} de {progress.totalItems} itens respondidos

            </p>

          </div>



          {nonCompliant.length > 0 && (

            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5 space-y-3">

              <div className="flex items-center gap-2">

                <AlertTriangle className="w-4 h-4 text-orange-400" />

                <h2 className="text-sm font-mono font-semibold text-foreground">

                  Achados sugeridos ({lastSuggestedCount || nonCompliant.length})

                </h2>

              </div>

              <p className="text-xs text-muted-foreground">

                Itens não conformes ou parciais geram achados ao concluir a análise. Revise abaixo:

              </p>

              <div className="space-y-2">

                {wizard.items

                  .filter((i) => {

                    const r = localResponses[i.id];

                    return r && (r.compliance === "parcial" || r.compliance === "nao_conforme");

                  })

                  .map((item) => (

                    <div key={item.id} className="flex items-start justify-between gap-3 text-xs border-t border-border/50 pt-2">

                      <div>

                        <span className="font-mono text-foreground">{item.code}</span>

                        <span className="text-muted-foreground"> — {item.title}</span>

                        {localResponses[item.id]?.notes && (

                          <p className="text-muted-foreground mt-1 italic">{localResponses[item.id].notes}</p>

                        )}

                      </div>

                      <Badge variant="outline" className={`font-mono shrink-0 ${SEVERITY_COLORS[item.suggestedSeverity] ?? ""}`}>

                        {item.suggestedSeverity}

                      </Badge>

                    </div>

                  ))}

              </div>

            </div>

          )}



          <div className="flex gap-3">

            {!isCompleted && (

              <Button

                className="font-mono"

                onClick={() => completeMutation.mutate({ id: analysisId })}

                disabled={completeMutation.isPending || progress.answeredItems < progress.totalItems}

              >

                {completeMutation.isPending ? "Concluindo..." : "Concluir e gerar achados"}

              </Button>

            )}

            <Button

              variant="outline"

              className="font-mono"

              onClick={() => navigate(`/applications/${analysis.applicationId}`)}

            >

              Voltar à aplicação

            </Button>

          </div>

        </div>

      </DashboardLayout>

    );

  }



  return (

    <DashboardLayout>

      <div className="space-y-6 max-w-5xl">

        <div className="flex items-center gap-3">

          <button

            onClick={() => navigate(`/applications/${analysis.applicationId}`)}

            className="text-muted-foreground hover:text-foreground"

          >

            <ArrowLeft className="w-4 h-4" />

          </button>

          <div className="flex-1 min-w-0">

            <h1 className="text-xl font-bold text-foreground font-mono truncate">{analysis.title}</h1>

            <p className="text-xs text-muted-foreground font-mono">Wizard de checklist OWASP</p>

          </div>

          <Badge variant="outline" className="font-mono text-xs shrink-0">

            {progress.percentComplete}%

          </Badge>

        </div>



        <div className="space-y-2">

          <div className="flex justify-between text-xs font-mono text-muted-foreground">

            <span>Progresso geral</span>

            <span>{progress.answeredItems}/{progress.totalItems} itens</span>

          </div>

          <Progress value={progress.percentComplete} />

        </div>



        {!isCompleted && (

          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-2">

            {(!applicationBaseUrl || !applicationRepositoryUrl) && (

              <div className="space-y-1 text-sm text-yellow-600 dark:text-yellow-400">

                {!applicationBaseUrl && (

                  <p className="flex items-start gap-2">

                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />

                    Cadastre a URL base da aplicação para análise automática de headers HTTP.

                  </p>

                )}

                {!applicationRepositoryUrl && (

                  <p className="flex items-start gap-2">

                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />

                    Cadastre a URL do repositório Git para análise estática de código.

                  </p>

                )}

              </div>

            )}

            {(applicationBaseUrl || applicationRepositoryUrl) && (

              <div className="text-xs font-mono text-muted-foreground space-y-1">

                {applicationBaseUrl && <p>URL HTTP: {applicationBaseUrl}</p>}

                {applicationRepositoryUrl && <p>Repositório: {applicationRepositoryUrl}</p>}

                <p>Use os botões em cada categoria ou item para executar análises de forma independente. As respostas são salvas ao trocar de categoria ou ao clicar em Salvar.</p>

              </div>

            )}

          </div>

        )}



        <div className="flex flex-wrap gap-2">

          {categories.map((cat, idx) => {

            const answered = cat.items.filter((i) => localResponses[i.id]?.compliance).length;

            return (

            <button

              key={cat.id}

              onClick={() => switchCategory(idx)}

              className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${

                idx === categoryIndex

                  ? "bg-primary/10 border-primary/30 text-primary"

                  : answered === cat.totalInCategory && cat.totalInCategory > 0

                    ? "border-emerald-400/30 text-emerald-400"

                    : "border-border text-muted-foreground hover:text-foreground"

              }`}

            >

              {cat.name}

              <span className="ml-1 opacity-70">({answered}/{cat.totalInCategory})</span>

            </button>

            );

          })}

        </div>



        {currentCategory && (

          <div className="bg-card border border-border rounded-xl p-5 space-y-5">

            <div className="flex flex-col gap-3 border-b border-border/50 pb-3">

              <div className="flex items-center gap-2">

                <ClipboardList className="w-4 h-4 text-primary" />

                <h2 className="text-sm font-mono font-semibold text-foreground">{currentCategory.name}</h2>

                <span className="text-xs text-muted-foreground font-mono ml-auto">

                  Categoria {categoryIndex + 1} de {categories.length} · {categoryAnsweredCount}/{currentCategory.items.length} respondidos

                </span>

              </div>

              {!isCompleted && (

                <div className="flex flex-wrap gap-2">

                  {currentCategoryHttpIds.length > 0 && (

                    <Button

                      variant="outline"

                      size="sm"

                      className="font-mono text-xs h-8"

                      disabled={!canRunHttpAssessment || autoAssessMutation.isPending}

                      onClick={() => runAssessment("http_headers", currentCategory.items)}

                    >

                      {isAssessmentPending("http_headers", currentCategoryHttpIds) ? (

                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Headers...</>

                      ) : (

                        <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Analisar headers HTTP</>

                      )}

                    </Button>

                  )}

                  {currentCategoryGitIds.length > 0 && (

                    <Button

                      variant="outline"

                      size="sm"

                      className="font-mono text-xs h-8"

                      disabled={!canRunGitAssessment || autoAssessMutation.isPending}

                      onClick={() => runAssessment("git_repo", currentCategory.items)}

                    >

                      {isAssessmentPending("git_repo", currentCategoryGitIds) ? (

                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Repositório...</>

                      ) : (

                        <><GitBranch className="w-3.5 h-3.5 mr-1.5" /> Analisar repositório Git</>

                      )}

                    </Button>

                  )}

                  {canRunAiAssessment && (

                    <Button

                      variant="outline"

                      size="sm"

                      className="font-mono text-xs h-8"

                      disabled={autoAssessMutation.isPending}

                      onClick={() => runAssessment("ai_agent", currentCategory.items)}

                    >

                      {isAssessmentPending("ai_agent", currentCategory.items.map((i) => i.id)) ? (

                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Assistente IA...</>

                      ) : (

                        <><Brain className="w-3.5 h-3.5 mr-1.5" /> Assistente IA (categoria)</>

                      )}

                    </Button>

                  )}

                </div>

              )}

            </div>



            {currentCategory.items.map((item) => (

              <div key={item.id} className="space-y-3 border-t border-border/30 pt-4 first:border-0 first:pt-0">

                <div className="flex items-start justify-between gap-3">

                  <div className="flex-1 min-w-0">

                    <p className="text-sm font-mono text-foreground">

                      <span className="text-primary">{item.code}</span> — {item.title}

                    </p>

                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>

                    {item.owaspRef && (

                      <p className="text-xs text-muted-foreground/70 mt-1 font-mono">Ref: {item.owaspRef}</p>

                    )}

                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">

                    <div className="flex items-center gap-1">
                      {(itemEvidenceMap[item.id]?.length ?? 0) > 0 && (
                        <EvidenceIconButton
                          onClick={() =>
                            setEvidenceDialogItem({
                              id: item.id,
                              code: item.code,
                              title: item.title,
                            })
                          }
                        />
                      )}

                      <Badge variant="outline" className={`font-mono text-xs ${SEVERITY_COLORS[item.suggestedSeverity] ?? ""}`}>

                        {item.suggestedSeverity}

                      </Badge>
                    </div>

                    {!isCompleted && canRunAiAssessment && (

                      <Button

                        variant="ghost"

                        size="sm"

                        className="font-mono text-xs h-7 px-2 text-violet-600 dark:text-violet-300 hover:text-violet-700 hover:bg-violet-500/10"

                        disabled={autoAssessMutation.isPending}

                        onClick={() => runAssessment("ai_agent", [item])}

                      >

                        {isAssessmentPending("ai_agent", [item.id]) ? (

                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> IA...</>

                        ) : (

                          <><Brain className="w-3 h-3 mr-1" /> Assistente IA</>

                        )}

                      </Button>

                    )}

                  </div>

                </div>



                {autoMeta[item.id] && (

                  <div className={`rounded-lg border px-3 py-2.5 ${autoMeta[item.id].source === "ai" ? "border-violet-500/25 bg-violet-500/5" : "border-cyan-500/25 bg-cyan-500/5"}`}>

                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-mono flex items-center gap-1.5 ${autoMeta[item.id].source === "ai" ? "text-violet-700 dark:text-violet-300" : "text-cyan-700 dark:text-cyan-300"}`}>
                        {autoMeta[item.id].source === "ai" ? (
                          <><Brain className="w-3.5 h-3.5 shrink-0" /> IA · {autoMeta[item.id].confidence}%</>
                        ) : (
                          <><Sparkles className="w-3.5 h-3.5 shrink-0" /> Auto · {autoMeta[item.id].confidence}%</>
                        )}
                      </p>
                      {(itemEvidenceMap[item.id]?.length ?? 0) > 0 && (
                        <button
                          type="button"
                          className="text-[10px] font-mono text-primary hover:underline shrink-0"
                          onClick={() =>
                            setEvidenceDialogItem({
                              id: item.id,
                              code: item.code,
                              title: item.title,
                            })
                          }
                        >
                          Ver evidência
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-foreground/90 mt-1 line-clamp-2">{autoMeta[item.id].rationale}</p>

                  </div>

                )}



                <RadioGroup

                  value={localResponses[item.id]?.compliance ?? ""}

                  onValueChange={(v) => setItemResponse(item.id, { compliance: v as Compliance })}

                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"

                >

                  {COMPLIANCE_OPTIONS.map((opt) => (

                    <div key={opt.value} className="flex items-center gap-2">

                      <RadioGroupItem value={opt.value} id={`${item.id}-${opt.value}`} />

                      <Label htmlFor={`${item.id}-${opt.value}`} className={`text-xs font-mono cursor-pointer ${opt.color}`}>

                        {opt.label}

                      </Label>

                    </div>

                  ))}

                </RadioGroup>



                <Textarea

                  placeholder="Observações (opcional)"

                  value={localResponses[item.id]?.notes ?? ""}

                  onChange={(e) => setItemResponse(item.id, { notes: e.target.value })}

                  className="text-xs font-mono min-h-16"

                />

              </div>

            ))}

          </div>

        )}



        <div className="flex items-center justify-between gap-3 flex-wrap">

          <Button

            variant="outline"

            className="font-mono text-xs"

            disabled={categoryIndex === 0}

            onClick={() => switchCategory(categoryIndex - 1)}

          >

            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Anterior

          </Button>



          <div className="flex items-center gap-2">

            <Button

              variant="outline"

              className="font-mono text-xs"

              onClick={() => saveCurrentCategory()}

              disabled={saveMutation.isPending || categoryAnsweredCount === 0}

            >

              {saveMutation.isPending ? (

                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Salvando...</>

              ) : (

                "Salvar categoria"

              )}

            </Button>



            <Button

              className="font-mono text-xs"

              onClick={() => saveCurrentCategory({ andAdvance: true, requireAll: true })}

              disabled={saveMutation.isPending || !categoryProgress.complete}

            >

              {saveMutation.isPending ? (

                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Salvando...</>

              ) : categoryIndex < categories.length - 1 ? (

                <>Salvar e continuar <ArrowRight className="w-3.5 h-3.5 ml-1" /></>

              ) : (

                <>Salvar e ver resumo <ArrowRight className="w-3.5 h-3.5 ml-1" /></>

              )}

            </Button>

          </div>

        </div>

      </div>

      <SuggestionEvidenceDialog
        open={evidenceDialogItem !== null}
        onOpenChange={(open) => {
          if (!open) setEvidenceDialogItem(null);
        }}
        itemCode={evidenceDialogItem?.code ?? ""}
        itemTitle={evidenceDialogItem?.title ?? ""}
        entries={evidenceDialogItem ? itemEvidenceMap[evidenceDialogItem.id] ?? [] : []}
      />

    </DashboardLayout>

  );

}


