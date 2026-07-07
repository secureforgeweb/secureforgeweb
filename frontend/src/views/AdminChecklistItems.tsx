import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ClipboardList, ShieldAlert } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "border-red-400/30 text-red-400",
  high: "border-orange-400/30 text-orange-400",
  medium: "border-yellow-400/30 text-yellow-400",
  low: "border-emerald-400/30 text-emerald-400",
};

export default function AdminChecklistItems() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: catalog, isLoading } = trpc.admin.listChecklistItems.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const updateItem = trpc.admin.updateChecklistItem.useMutation({
    onSuccess: () => {
      utils.admin.listChecklistItems.invalidate();
      setEditingId(null);
      toast.success("Item atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

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

  const items = catalog?.items ?? [];
  const itemsByCategory: Record<string, typeof items> = {};
  for (const item of items) {
    if (!itemsByCategory[item.categoryName]) itemsByCategory[item.categoryName] = [];
    itemsByCategory[item.categoryName].push(item);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground font-mono">Itens do Checklist</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {catalog?.checklist ? `${catalog.checklist.name} v${catalog.checklist.version}` : "Catálogo OWASP"} ·{" "}
              {catalog?.totalItems ?? 0} itens
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground font-mono">Carregando catálogo...</p>
        ) : (
          Object.entries(itemsByCategory).map(([category, items]) => (
            <div key={category} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                <ClipboardList className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-mono font-semibold">{category}</h2>
              </div>
              {items?.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 py-2 border-t border-border/30 first:border-0 first:pt-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono text-foreground">
                      <span className="text-primary">{item.code}</span> — {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    {item.owaspRef && (
                      <p className="text-xs text-muted-foreground/70 mt-1 font-mono">Ref: {item.owaspRef}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editingId === item.id ? (
                      <>
                        <Select
                          defaultValue={item.suggestedSeverity}
                          onValueChange={(v) =>
                            updateItem.mutate({
                              id: item.id,
                              suggestedSeverity: v as "critical" | "high" | "medium" | "low",
                            })
                          }
                        >
                          <SelectTrigger className="w-32 font-mono text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">Crítica</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="low">Baixa</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-mono text-xs h-8"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs ${SEVERITY_COLORS[item.suggestedSeverity] ?? ""}`}
                        >
                          {item.suggestedSeverity}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-mono text-xs h-8"
                          onClick={() => setEditingId(item.id)}
                        >
                          Editar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
