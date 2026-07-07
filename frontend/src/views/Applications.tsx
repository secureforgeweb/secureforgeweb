import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Globe, Plus, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Applications() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";
  const { data: apps, isLoading } = trpc.applications.list.useQuery();

  const deleteMutation = trpc.applications.delete.useMutation({
    onSuccess: () => {
      toast.success("Aplicação removida.");
      utils.applications.list.invalidate();
      utils.applications.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground font-mono">Aplicações</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAdmin
                ? "Todas as aplicações cadastradas no sistema (visão administrador)"
                : "Cadastre e gerencie aplicações web para análise de segurança"}
            </p>
          </div>
          <Button className="font-mono text-xs" onClick={() => navigate("/applications/new")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Nova Aplicação
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground font-mono">Carregando...</p>
        ) : !apps?.length ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-mono text-foreground mb-1">Nenhuma aplicação cadastrada</p>
            <p className="text-xs text-muted-foreground mb-4">
              Cadastre sua primeira aplicação para iniciar o diagnóstico de segurança.
            </p>
            <Button variant="outline" className="font-mono text-xs" onClick={() => navigate("/applications/new")}>
              Cadastrar aplicação
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {apps.map((app) => (
              <div key={app.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <button className="text-left flex-1 min-w-0" onClick={() => navigate(`/applications/${app.id}`)}>
                    <h3 className="font-mono font-semibold text-foreground truncate">{app.name}</h3>
                    {app.techStack && (
                      <p className="text-xs text-primary font-mono mt-1">{app.techStack}</p>
                    )}
                    {app.baseUrl && (
                      <p className="text-xs text-muted-foreground font-mono mt-1 truncate flex items-center gap-1">
                        <ExternalLink className="w-3 h-3 shrink-0" /> {app.baseUrl}
                      </p>
                    )}
                    {isAdmin && "ownerEmail" in app && (
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">
                        Dono: {(app as { ownerEmail?: string | null }).ownerEmail ?? "—"}
                      </p>
                    )}
                    {app.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{app.description}</p>
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remover "${app.name}"?`)) deleteMutation.mutate({ id: app.id });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
