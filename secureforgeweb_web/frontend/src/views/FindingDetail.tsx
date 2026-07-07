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

const SEVERITY_COLORS: Record<string, string> = {
  critical: "border-red-400/30 text-red-400",
  high: "border-orange-400/30 text-orange-400",
  medium: "border-yellow-400/30 text-yellow-400",
  low: "border-emerald-400/30 text-emerald-400",
};

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_correcao: "Em correção",
  resolvido: "Resolvido",
  aceito_risco: "Aceito risco",
};

const PRIORITY_LABELS: Record<string, string> = {
  imediata: "Imediata",
  curto_prazo: "Curto prazo",
  medio_prazo: "Médio prazo",
  baixa: "Baixa",
};

const ACTION_LABELS: Record<string, string> = {
  status_changed: "Status alterado",
  notes_updated: "Notas atualizadas",
  severity_changed: "Severidade alterada",
  created: "Achado criado",
};

type FindingStatus = "aberto" | "em_correcao" | "resolvido" | "aceito_risco";

export default function FindingDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/findings/:id");
  const findingId = Number(params?.id);

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
      toast.success("Status atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground font-mono">Carregando achado...</p>
      </DashboardLayout>
    );
  }

  if (!finding) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground font-mono">Achado não encontrado.</p>
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
              {finding.categoryName ?? "Sem categoria"} · {finding.analysisTitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={`font-mono ${SEVERITY_COLORS[finding.severity] ?? ""}`}>
            Severidade: {finding.severity}
          </Badge>
          <Badge variant="outline" className="font-mono">
            Prioridade: {PRIORITY_LABELS[finding.priority] ?? finding.priority}
          </Badge>
          <Badge variant="outline" className="font-mono">
            {STATUS_LABELS[finding.status] ?? finding.status}
          </Badge>
        </div>

        {finding.description && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-mono font-semibold">Descrição</h2>
            </div>
            <p className="text-sm text-muted-foreground">{finding.description}</p>
          </div>
        )}

        {finding.evidence && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-mono font-semibold">Evidência</h2>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{finding.evidence}</p>
          </div>
        )}

        {(finding.recommendationTitle || finding.recommendationAction) && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-mono font-semibold text-foreground">Recomendação de hardening</h2>
            </div>
            {finding.recommendationTitle && (
              <p className="text-sm font-mono text-foreground">{finding.recommendationTitle}</p>
            )}
            {finding.recommendationDescription && (
              <p className="text-sm text-muted-foreground">{finding.recommendationDescription}</p>
            )}
            {finding.recommendationAction && (
              <div className="bg-background/50 border border-border/50 rounded-lg p-3">
                <p className="text-xs font-mono text-primary mb-1">Ação sugerida</p>
                <p className="text-sm text-foreground">{finding.recommendationAction}</p>
              </div>
            )}
            {finding.recommendationReference && (
              <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Ref: {finding.recommendationReference}
              </p>
            )}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-mono font-semibold">Atualizar status</h2>
          <Textarea
            placeholder="Comentário opcional sobre a mudança de status"
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
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_correcao">Em correção</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="aceito_risco">Aceito risco</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {history && history.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-mono font-semibold">Histórico</h2>
            </div>
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="border-t border-border/50 pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-mono text-foreground">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {new Date(entry.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {entry.fromValue && entry.toValue && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.fromValue} → {entry.toValue}
                    </p>
                  )}
                  {entry.comment && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{entry.comment}</p>
                  )}
                  {entry.userName && (
                    <p className="text-xs text-muted-foreground/70 mt-1">por {entry.userName}</p>
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
          Voltar à lista de achados
        </Button>
      </div>
    </DashboardLayout>
  );
}
