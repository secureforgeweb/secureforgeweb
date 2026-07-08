import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import { PublicPageControls } from "@/components/PublicPageControls";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import type { MessageKey } from "@/i18n/messages";
import {
  ClipboardCheck, Lock, ArrowRight, CheckCircle,
  Globe, BarChart2, FileText, Users,
} from "lucide-react";

const LANDING_SHELL = "mx-auto w-full max-w-[min(100rem,calc(100vw-2rem))] px-4 sm:px-6 lg:px-8";

const CATEGORIES: { labelKey: MessageKey; descKey: MessageKey; color: string }[] = [
  { labelKey: "home.cat.auth", descKey: "home.cat.authDesc", color: "#22d3ee" },
  { labelKey: "home.cat.authorization", descKey: "home.cat.authorizationDesc", color: "#a855f7" },
  { labelKey: "home.cat.validation", descKey: "home.cat.validationDesc", color: "#f97316" },
  { labelKey: "home.cat.headers", descKey: "home.cat.headersDesc", color: "#eab308" },
  { labelKey: "home.cat.secrets", descKey: "home.cat.secretsDesc", color: "#06b6d4" },
];

const FEATURES: { icon: typeof Globe; titleKey: MessageKey; descKey: MessageKey; color: string }[] = [
  { icon: Globe, titleKey: "home.feat.apps", descKey: "home.feat.appsDesc", color: "#22c55e" },
  { icon: ClipboardCheck, titleKey: "home.feat.checklist", descKey: "home.feat.checklistDesc", color: "#06b6d4" },
  { icon: BarChart2, titleKey: "home.feat.findings", descKey: "home.feat.findingsDesc", color: "#a855f7" },
  { icon: FileText, titleKey: "home.feat.report", descKey: "home.feat.reportDesc", color: "#f97316" },
  { icon: Users, titleKey: "home.feat.teams", descKey: "home.feat.teamsDesc", color: "#eab308" },
  { icon: Lock, titleKey: "home.feat.security", descKey: "home.feat.securityDesc", color: "#ec4899" },
];

const SECURITY_KEYS: MessageKey[] = [
  "home.sec.envSecrets",
  "home.sec.bcrypt",
  "home.sec.cookie",
  "home.sec.idor",
  "home.sec.rateLimit",
  "home.sec.cors",
  "home.sec.timing",
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useLocale();

  if (!loading && isAuthenticated) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
        <BrandLogo showSubtitle={false} />
        <div className="flex items-center gap-2 sm:gap-3">
          <PublicPageControls variant="inline" />
          <button
            onClick={() => navigate("/login")}
            className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            {t("home.signIn")}
          </button>
          <button
            onClick={() => navigate("/register")}
            className="text-sm font-mono bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t("home.createAccount")}
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
                {t("home.heroTitle1")}<br />
                <span className="text-primary">{t("home.heroTitle2")}</span>
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {t("home.heroDesc")}
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={() => navigate("/register")}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-base font-mono hover:bg-primary/90 transition-colors"
                >
                  {t("home.getStarted")} <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="text-base font-mono text-muted-foreground hover:text-foreground border border-border px-6 py-3 rounded-lg transition-colors"
                >
                  {t("home.haveAccount")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {CATEGORIES.map(({ labelKey, descKey, color }) => (
                <div key={labelKey} className="bg-card border border-border rounded-xl p-4 sm:p-5">
                  <div className="w-2.5 h-2.5 rounded-full mb-3" style={{ backgroundColor: color }} />
                  <p className="text-sm sm:text-base font-mono font-semibold text-foreground">{t(labelKey)}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">{t(descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 py-12 lg:py-16 border-t border-border/50">
          <div className={LANDING_SHELL}>
            <h2 className="text-base font-mono text-muted-foreground uppercase tracking-wider mb-6">
              {t("home.features")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
              {FEATURES.map(({ icon: Icon, titleKey, descKey, color }) => (
                <div key={titleKey} className="bg-card border border-border rounded-xl p-5 lg:p-6">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 border"
                    style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="text-base font-mono font-semibold text-foreground mb-2">{t(titleKey)}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{t(descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 py-12 lg:py-16 border-t border-border/50">
          <div className={LANDING_SHELL}>
            <h2 className="text-base font-mono text-muted-foreground uppercase tracking-wider mb-5">
              {t("home.platformSecurity")}
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {SECURITY_KEYS.map((key) => (
                <span key={key} className="flex items-center gap-2 text-sm font-mono text-muted-foreground bg-muted/30 border border-border rounded-full px-4 py-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  {t(key)}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 sm:px-6 lg:px-8 py-5">
        <div className={`${LANDING_SHELL} text-sm font-mono text-muted-foreground`}>
          {t("home.footer")}
        </div>
      </footer>
    </div>
  );
}
