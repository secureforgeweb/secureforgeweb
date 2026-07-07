import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLES: Record<string, string> = {
  "/applications": "Aplicações",
  "/posture": "Postura de Segurança",
};

export default function ComingSoon() {
  const [location, navigate] = useLocation();
  const title = TITLES[location] ?? "Em desenvolvimento";

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Construction className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Este módulo será implementado nas próximas fases do SecureForge Web.
            Consulte o relatório em <code className="text-primary">docs/RELATORIO.md</code>.
          </p>
        </div>
        <Button variant="outline" className="font-mono text-xs" onClick={() => navigate("/dashboard")}>
          Voltar ao Dashboard
        </Button>
      </div>
    </DashboardLayout>
  );
}
