import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ClipboardCheck, Lock, ArrowRight, CheckCircle,
  Globe, BarChart2, FileText, Users,
} from "lucide-react";

const LANDING_SHELL = "mx-auto w-full max-w-[min(100rem,calc(100vw-2rem))] px-4 sm:px-6 lg:px-8";

const CATEGORIES = [
  { label: "Autenticação", color: "#22d3ee", desc: "Política de senhas, sessão, MFA" },
  { label: "Autorização", color: "#a855f7", desc: "RBAC, menor privilégio, rotas protegidas" },
  { label: "Validação", color: "#f97316", desc: "Anti-XSS, anti-SQLi, server-side" },
  { label: "Headers", color: "#eab308", desc: "CSP, HSTS, X-Frame-Options" },
  { label: "Segredos", color: "#06b6d4", desc: "Variáveis de ambiente, rotação" },
];

const FEATURES = [
  {
    icon: Globe,
    title: "Cadastro de Aplicações",
    desc: "Registre aplicações web com URL, stack tecnológica e responsável para organizar análises de segurança.",
    color: "#22c55e",
  },
  {
    icon: ClipboardCheck,
    title: "Checklist OWASP",
    desc: "Análise guiada por controles de segurança alinhados ao OWASP Top 10 e boas práticas de hardening.",
    color: "#06b6d4",
  },
  {
    icon: BarChart2,
    title: "Achados & Priorização",
    desc: "Registre fragilidades, classifique severidade e receba recomendações de correção priorizadas.",
    color: "#a855f7",
  },
  {
    icon: FileText,
    title: "Relatório de Postura",
    desc: "Visualize o score de segurança e exporte relatório consolidado com plano de ação de hardening.",
    color: "#f97316",
  },
  {
    icon: Users,
    title: "Equipes Pequenas",
    desc: "Ferramenta leve para laboratórios, startups e equipes AppSec iniciantes — sem complexidade enterprise.",
    color: "#eab308",
  },
  {
    icon: Lock,
    title: "Segurança Robusta",
    desc: "Autenticação bcrypt, JWT HttpOnly, rate limiting, CORS, Helmet e proteção IDOR herdados do projeto base.",
    color: "#ec4899",
  },
];

const SECURITY = [
  "Segredos via variáveis de ambiente",
  "Hash bcrypt (12 rounds)",
  "Cookie seguro (httpOnly, sameSite lax)",
  "Proteção IDOR (404 em vez de 403)",
  "Rate limiting global e em auth",
  "CORS + Helmet configurados",
  "Timing attack prevention",
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  if (!loading && isAuthenticated) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
        <BrandLogo showSubtitle={false} />
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <button
            onClick={() => navigate("/login")}
            className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Entrar
          </button>
          <button
            onClick={() => navigate("/register")}
            className="text-sm font-mono bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Criar Conta
          </button>
        </div>
      </header>

      <main className="flex-1">
        <section className={`${LANDING_SHELL} py-12 md:py-16 lg:py-20`}>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm font-mono text-primary">
                <ClipboardCheck className="w-4 h-4" />
                AppHardener
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold font-mono text-foreground leading-tight">
                Diagnóstico e Hardening<br />
                <span className="text-primary">de Aplicações Web</span>
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                O SecureForge Web ajuda equipes a identificar fragilidades de segurança, aplicar checklists
                estruturados e organizar um processo simples de melhoria — orientado à correção, não apenas ao scanning.
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={() => navigate("/register")}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-base font-mono hover:bg-primary/90 transition-colors"
                >
                  Começar agora <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="text-base font-mono text-muted-foreground hover:text-foreground border border-border px-6 py-3 rounded-lg transition-colors"
                >
                  Já tenho conta
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {CATEGORIES.map(({ label, color, desc }) => (
                <div key={label} className="bg-card border border-border rounded-xl p-4 sm:p-5">
                  <div className="w-2.5 h-2.5 rounded-full mb-3" style={{ backgroundColor: color }} />
                  <p className="text-sm sm:text-base font-mono font-semibold text-foreground">{label}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 py-12 lg:py-16 border-t border-border/50">
          <div className={LANDING_SHELL}>
            <h2 className="text-base font-mono text-muted-foreground uppercase tracking-wider mb-6">
              Funcionalidades
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
              {FEATURES.map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="bg-card border border-border rounded-xl p-5 lg:p-6">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 border"
                    style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="text-base font-mono font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 py-12 lg:py-16 border-t border-border/50">
          <div className={LANDING_SHELL}>
            <h2 className="text-base font-mono text-muted-foreground uppercase tracking-wider mb-5">
              Controles de Segurança da Plataforma
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {SECURITY.map((item) => (
                <span key={item} className="flex items-center gap-2 text-sm font-mono text-muted-foreground bg-muted/30 border border-border rounded-full px-4 py-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 sm:px-6 lg:px-8 py-5">
        <div className={`${LANDING_SHELL} text-sm font-mono text-muted-foreground`}>
          SecureForge Web · Projeto Integrador · Segurança Aplicada · AppHardener
        </div>
      </footer>
    </div>
  );
}
