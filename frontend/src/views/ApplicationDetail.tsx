import { useLocation, useRoute } from "wouter";

import { trpc } from "@/lib/trpc";

import DashboardLayout from "@/components/DashboardLayout";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { ArrowLeft, ExternalLink, ClipboardList, Globe, Play, History, AlertTriangle, BarChart2, GitBranch, Pencil, Download } from "lucide-react";
import { downloadPdfBase64 } from "@/components/PostureMetricsPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { hasDuplicateGitUrlProtocols, sanitizeGitRepositoryUrlInput } from "@/lib/gitRepositoryUrl";



const SEVERITY_COLORS: Record<string, string> = {

  critical: "border-red-400/30 text-red-400",

  high: "border-orange-400/30 text-orange-400",

  medium: "border-yellow-400/30 text-yellow-400",

  low: "border-emerald-400/30 text-emerald-400",

};



const STATUS_LABELS: Record<string, string> = {

  rascunho: "Rascunho",

  em_andamento: "Em andamento",

  concluida: "Concluída",

};



const STATUS_COLORS: Record<string, string> = {

  rascunho: "text-muted-foreground",

  em_andamento: "text-primary",

  concluida: "text-emerald-400",

};



export default function ApplicationDetail() {

  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [, params] = useRoute("/applications/:id");

  const id = Number(params?.id);

  const [editUrls, setEditUrls] = useState(false);

  const [baseUrlDraft, setBaseUrlDraft] = useState("");

  const [repositoryUrlDraft, setRepositoryUrlDraft] = useState("");



  const { data: app, isLoading } = trpc.applications.getById.useQuery(

    { id },

    { enabled: Number.isFinite(id) && id > 0 }

  );

  const { data: catalog } = trpc.checklist.catalog.useQuery();

  const { data: analyses, refetch: refetchAnalyses } = trpc.analyses.listByApplication.useQuery(

    { applicationId: id },

    { enabled: Number.isFinite(id) && id > 0 }

  );

  const { data: findingStats } = trpc.findings.stats.useQuery(

    { applicationId: id },

    { enabled: Number.isFinite(id) && id > 0 }

  );



  const utils = trpc.useUtils();

  const createAnalysis = trpc.analyses.create.useMutation({

    onSuccess: (analysis) => {

      refetchAnalyses();

      toast.success("Análise iniciada!");

      navigate(`/analyses/${analysis.id}/checklist`);

    },

    onError: (e) => toast.error(e.message),

  });

  const updateApp = trpc.applications.update.useMutation({

    onSuccess: () => {

      toast.success("Aplicação atualizada.");

      setEditUrls(false);

      utils.applications.getById.invalidate({ id });

    },

    onError: (e) => toast.error(e.message),

  });

  const exportPdf = trpc.reports.exportPdf.useMutation({

    onSuccess: (result) => {

      downloadPdfBase64(result.base64, result.filename);

      toast.success(`Relatório exportado (${result.findingCount} achado(s))`);

    },

    onError: (e) => toast.error(e.message),

  });



  if (isLoading) {

    return (

      <DashboardLayout>

        <p className="text-sm text-muted-foreground font-mono">Carregando...</p>

      </DashboardLayout>

    );

  }



  if (!app) {

    return (

      <DashboardLayout>

        <p className="text-sm text-muted-foreground font-mono">Aplicação não encontrada.</p>

      </DashboardLayout>

    );

  }



  const items = catalog?.items ?? [];

  const itemsByCategory: Record<string, typeof items> = {};

  for (const item of items) {

    if (!itemsByCategory[item.categoryName]) itemsByCategory[item.categoryName] = [];

    itemsByCategory[item.categoryName].push(item);

  }



  const inProgress = analyses?.find((a) => a.status === "em_andamento" || a.status === "rascunho");



  return (

    <DashboardLayout>

      <div className="space-y-6 max-w-4xl">

        <div className="flex items-center gap-3">

          <button onClick={() => navigate("/applications")} className="text-muted-foreground hover:text-foreground">

            <ArrowLeft className="w-4 h-4" />

          </button>

          <div className="flex-1 min-w-0">

            <h1 className="text-xl font-bold text-foreground font-mono truncate">{app.name}</h1>

            {app.techStack && <p className="text-sm text-primary font-mono">{app.techStack}</p>}

          </div>

        </div>



        <div className="bg-card border border-border rounded-xl p-5 space-y-4">

          <div className="flex items-center justify-between gap-2">

            <div className="flex items-center gap-2 text-sm font-mono text-foreground">

              <Globe className="w-4 h-4 text-primary" />

              Detalhes da aplicação

            </div>

            <Button

              type="button"

              variant="ghost"

              size="sm"

              className="font-mono text-xs"

              onClick={() => {

                setBaseUrlDraft(app.baseUrl ?? "");

                setRepositoryUrlDraft(app.repositoryUrl ?? "");

                setEditUrls((v) => !v);

              }}

            >

              <Pencil className="w-3.5 h-3.5 mr-1" />

              {editUrls ? "Cancelar" : "Editar URLs"}

            </Button>

          </div>



          {editUrls ? (

            <div className="space-y-3 border-t border-border/50 pt-3">

              <div>

                <Label className="text-xs font-mono">URL base</Label>

                <Input

                  className="mt-1 font-mono text-sm"

                  value={baseUrlDraft}

                  onChange={(e) => setBaseUrlDraft(e.target.value)}

                  placeholder="https://app.exemplo.com"

                />

              </div>

              <div>

                <Label className="text-xs font-mono">Repositório Git</Label>

                <Input

                  className="mt-1 font-mono text-sm"

                  value={repositoryUrlDraft}

                  onChange={(e) => setRepositoryUrlDraft(e.target.value)}

                  placeholder="https://github.com/org/projeto"

                />

              </div>

              <Button

                type="button"

                size="sm"

                className="font-mono text-xs"

                disabled={updateApp.isPending}

                onClick={() => {
                  let repo = repositoryUrlDraft.trim() || null;
                  if (repo && hasDuplicateGitUrlProtocols(repo)) {
                    repo = sanitizeGitRepositoryUrlInput(repo);
                    setRepositoryUrlDraft(repo);
                    toast.message("URL do repositório corrigida — havia endereço duplicado no campo.");
                  }
                  updateApp.mutate({
                    id,
                    baseUrl: baseUrlDraft.trim() || null,
                    repositoryUrl: repo,
                  });
                }}

              >

                {updateApp.isPending ? "Salvando..." : "Salvar URLs"}

              </Button>

            </div>

          ) : (

            <>

              {app.baseUrl && (

                <p className="text-sm font-mono">

                  <span className="text-muted-foreground">URL: </span>

                  <a href={app.baseUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">

                    {app.baseUrl} <ExternalLink className="w-3 h-3" />

                  </a>

                </p>

              )}

              {app.repositoryUrl && (

                <p className="text-sm font-mono">

                  <span className="text-muted-foreground">Repositório: </span>

                  <a href={app.repositoryUrl.replace(/\.git$/, "")} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">

                    <GitBranch className="w-3 h-3" />

                    {app.repositoryUrl} <ExternalLink className="w-3 h-3" />

                  </a>

                </p>

              )}

              {!app.baseUrl && !app.repositoryUrl && (

                <p className="text-sm text-muted-foreground">

                  Cadastre URL base e/ou repositório Git para habilitar análises automáticas.

                </p>

              )}

            </>

          )}

          {app.description && (

            <p className="text-sm text-muted-foreground">{app.description}</p>

          )}

          <p className="text-xs text-muted-foreground font-mono">

            Cadastrada em {new Date(app.createdAt).toLocaleDateString("pt-BR")}

          </p>

        </div>



        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center justify-between gap-4">

          <div>

            <p className="text-sm font-mono font-semibold text-foreground">Nova análise de segurança</p>

            <p className="text-xs text-muted-foreground mt-1">

              Percorra o checklist OWASP por categoria e registre a conformidade de cada controle.

            </p>

          </div>

          {inProgress ? (

            <Button

              variant="outline"

              className="font-mono text-xs shrink-0"

              onClick={() => navigate(`/analyses/${inProgress.id}/checklist`)}

            >

              <Play className="w-3.5 h-3.5 mr-1" /> Continuar análise

            </Button>

          ) : (

            <Button

              className="font-mono text-xs shrink-0"

              onClick={() => createAnalysis.mutate({ applicationId: id })}

              disabled={createAnalysis.isPending}

            >

              <Play className="w-3.5 h-3.5 mr-1" />

              {createAnalysis.isPending ? "Iniciando..." : "Iniciar análise"}

            </Button>

          )}

        </div>



        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center justify-between gap-4">

          <div>

            <p className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">

              <BarChart2 className="w-4 h-4 text-primary" />

              Dashboard de postura

            </p>

            <p className="text-xs text-muted-foreground mt-1">

              Score de conformidade, gráficos por severidade e exportação de relatório PDF.

            </p>

          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">

            <Button

              variant="outline"

              className="font-mono text-xs shrink-0"

              onClick={() => navigate(`/applications/${id}/dashboard`)}

            >

              Ver dashboard

            </Button>

            <Button

              variant="outline"

              className="font-mono text-xs shrink-0"

              onClick={() => exportPdf.mutate({ applicationId: id })}

              disabled={exportPdf.isPending}

            >

              <Download className="w-3.5 h-3.5 mr-1" />

              {exportPdf.isPending ? "Gerando PDF..." : "Exportar PDF"}

            </Button>

          </div>

        </div>



        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5 flex items-center justify-between gap-4">

          <div>

            <p className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">

              <AlertTriangle className="w-4 h-4 text-orange-400" />

              Achados de segurança

            </p>

            <p className="text-xs text-muted-foreground mt-1">

              {findingStats?.total ?? 0} achado(s) registrado(s). Revise severidade, recomendações e status de correção.

            </p>

          </div>

          <Button

            variant="outline"

            className="font-mono text-xs shrink-0"

            onClick={() => navigate(`/applications/${id}/findings`)}

          >

            Ver achados

          </Button>

        </div>



        {analyses && analyses.length > 0 && (

          <div className="bg-card border border-border rounded-xl p-5 space-y-3">

            <div className="flex items-center gap-2">

              <History className="w-4 h-4 text-primary" />

              <h2 className="text-sm font-mono font-semibold text-foreground">Histórico de análises</h2>

            </div>

            <div className="space-y-2">

              {analyses.map((analysis) => (

                <div

                  key={analysis.id}

                  className="flex items-center justify-between gap-3 py-2 border-t border-border/50 first:border-0 first:pt-0"

                >

                  <div className="min-w-0">

                    <p className="text-sm font-mono text-foreground truncate">{analysis.title}</p>

                    <p className="text-xs text-muted-foreground">

                      {new Date(analysis.startedAt).toLocaleDateString("pt-BR")}

                      {analysis.completedAt && ` — concluída em ${new Date(analysis.completedAt).toLocaleDateString("pt-BR")}`}

                      {"executorEmail" in analysis && analysis.executorEmail && (
                        <> · por {analysis.executorEmail}</>
                      )}

                      {"aiModelDisplay" in analysis && analysis.aiModelDisplay !== "Não configurado" && (
                        <> · IA: {analysis.aiModelDisplay}</>
                      )}

                    </p>

                  </div>

                  <div className="flex items-center gap-2 shrink-0">

                    <span className={`text-xs font-mono ${STATUS_COLORS[analysis.status] ?? ""}`}>

                      {STATUS_LABELS[analysis.status] ?? analysis.status}

                    </span>

                    <Button

                      variant="ghost"

                      size="sm"

                      className="font-mono text-xs h-7"

                      onClick={() => navigate(`/analyses/${analysis.id}/checklist`)}

                    >

                      Abrir

                    </Button>

                  </div>

                </div>

              ))}

            </div>

          </div>

        )}



        {catalog?.checklist && (

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">

            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-2">

                <ClipboardList className="w-4 h-4 text-primary" />

                <h2 className="text-sm font-mono font-semibold text-foreground">

                  Checklist {catalog.checklist.name} v{catalog.checklist.version}

                </h2>

              </div>

              <Badge variant="outline" className="font-mono text-xs">

                {catalog.totalItems} itens

              </Badge>

            </div>



            {Object.entries(itemsByCategory).map(([category, items]) => (

              <div key={category} className="border-t border-border/50 pt-3">

                <p className="text-xs font-mono text-primary mb-2">{category}</p>

                <div className="space-y-2">

                  {items?.map((item) => (

                    <div key={item.id} className="flex items-start justify-between gap-3 text-xs">

                      <div>

                        <span className="font-mono text-foreground">{item.code}</span>

                        <span className="text-muted-foreground"> — {item.title}</span>

                      </div>

                      <Badge variant="outline" className={`font-mono shrink-0 ${SEVERITY_COLORS[item.suggestedSeverity] ?? ""}`}>

                        {item.suggestedSeverity}

                      </Badge>

                    </div>

                  ))}

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </DashboardLayout>

  );

}


