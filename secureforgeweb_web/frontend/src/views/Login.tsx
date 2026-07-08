import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import { PublicPageControls } from "@/components/PublicPageControls";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import { Lock, Mail, Eye, EyeOff, Copy, ExternalLink, AlertTriangle } from "lucide-react";
import { getLoginUrl } from "@/lib/const";

export default function Login() {
  const [, navigate] = useLocation();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [inBandLink, setInBandLink] = useState<string | null>(null);
  const [inBandNote, setInBandNote] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const blockClipboard = (e: React.ClipboardEvent | React.KeyboardEvent) => {
    if ("key" in e) {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && ["c", "x", "v"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        toast.warning(t("login.clipboardBlocked"));
        return;
      }
    }
    if ("clipboardData" in e) {
      e.preventDefault();
      toast.warning(t("login.clipboardBlocked"));
    }
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      toast.success(t("login.success"));
      await utils.auth.me.invalidate();
      if (data.mustChangePassword) {
        window.location.href = "/profile?mustChangePassword=1";
      } else {
        window.location.href = "/dashboard";
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const forgotMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      setForgotSent(true);
      if (data.linkInBand && data.resetUrl) {
        setInBandLink(data.resetUrl);
        setInBandNote(data.deliveryNote ?? null);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const handleForgot = () => {
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      toast.error(t("login.forgot.invalidEmail"));
      return;
    }
    forgotMutation.mutate({ email: forgotEmail, origin: window.location.origin });
  };

  const copyLink = () => {
    if (inBandLink) {
      navigator.clipboard.writeText(inBandLink).then(() => {
        toast.success(t("login.forgot.linkCopied"));
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-stretch justify-center p-4 sm:p-6 lg:p-8">
      <PublicPageControls />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/3 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center my-auto relative">
        <div className="hidden lg:flex flex-col gap-4 pr-4">
          <BrandLogo variant="icon" iconClassName="w-20 h-20 rounded-2xl" />
          <h1 className="text-3xl xl:text-4xl font-bold text-foreground font-mono leading-tight">
            SecureForge Web
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-md">
            {t("login.heroDesc")}
          </p>
        </div>

        <div className="w-full max-w-xl mx-auto lg:mx-0 lg:max-w-none">
        <div className="text-center lg:text-left mb-6 flex flex-col items-center lg:items-start gap-3">
          <BrandLogo variant="icon" iconClassName="w-16 h-16 rounded-2xl lg:hidden" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-mono">SecureForge Web</h1>
            <p className="text-muted-foreground text-base mt-1">{t("login.tagline")}</p>
          </div>
        </div>

        {!showForgot ? (
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-xl font-semibold text-foreground mb-6">{t("login.title")}</h2>
            <div className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-sm text-muted-foreground">{t("login.email")}</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("login.emailPlaceholder")}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-9 bg-input border-border"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="text-sm text-muted-foreground">{t("login.password")}</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("login.passwordPlaceholder")}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-9 pr-9 bg-input border-border"
                    autoComplete="current-password"
                    onCopy={blockClipboard}
                    onCut={blockClipboard}
                    onPaste={blockClipboard}
                    onKeyDown={e => {
                      blockClipboard(e);
                      if (e.key === "Enter") loginMutation.mutate({ email, password });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {t("login.clipboardHint")}
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => loginMutation.mutate({ email, password })}
                disabled={loginMutation.isPending || !email || !password}
              >
                {loginMutation.isPending ? t("login.submitting") : t("login.submit")}
              </Button>
            </div>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs text-primary hover:underline"
              >
                {t("login.forgotPassword")}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                {t("login.noAccount")}{" "}
                <button onClick={() => navigate("/register")} className="text-primary hover:underline font-medium">
                  {t("login.createAccount")}
                </button>
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-center text-xs text-muted-foreground mb-2">{t("login.oauthHint")}</p>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = getLoginUrl()}>
                {t("login.oauth")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-2">{t("login.forgot.title")}</h2>
            {!forgotSent ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("login.forgot.desc")}{" "}
                  <strong className="text-foreground">{t("login.forgot.minutes")}</strong>.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="forgot-email" className="text-sm text-muted-foreground">{t("login.forgot.emailLabel")}</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder={t("login.emailPlaceholder")}
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        className="pl-9 bg-input border-border"
                        autoComplete="email"
                        onKeyDown={e => e.key === "Enter" && handleForgot()}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleForgot}
                    disabled={forgotMutation.isPending || !forgotEmail}
                  >
                    {forgotMutation.isPending ? t("login.forgot.sending") : t("login.forgot.send")}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setShowForgot(false)}>
                    {t("login.forgot.back")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {inBandLink ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-300">{t("login.forgot.linkGenerated")}</p>
                        <p className="text-xs text-yellow-400/80 mt-1">
                          {inBandNote ?? t("login.forgot.linkFallback")}
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/30 border border-border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider">
                        {t("login.forgot.linkLabel")}
                      </p>
                      <p className="text-xs font-mono text-primary break-all leading-relaxed mb-3">
                        {inBandLink}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={copyLink}>
                          <Copy className="w-3 h-3" />
                          {t("login.forgot.copyLink")}
                        </Button>
                        <Button size="sm" className="flex-1 gap-2" onClick={() => window.location.href = inBandLink}>
                          <ExternalLink className="w-3 h-3" />
                          {t("login.forgot.openLink")}
                        </Button>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full" onClick={() => {
                      setShowForgot(false);
                      setForgotSent(false);
                      setForgotEmail("");
                      setInBandLink(null);
                      setInBandNote(null);
                    }}>
                      {t("login.forgot.back")}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
                      <Mail className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium">{t("login.forgot.emailSent")}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("login.forgot.emailSentDesc", { email: forgotEmail })}
                      </p>
                      <p className="text-xs text-yellow-400 mt-2 font-medium">
                        {t("login.forgot.expiryWarning")}
                      </p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => {
                      setShowForgot(false);
                      setForgotSent(false);
                      setForgotEmail("");
                    }}>
                      {t("login.forgot.back")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-center lg:text-left text-sm text-muted-foreground mt-5">
          {t("login.footer")}
        </p>
        </div>
      </div>
    </div>
  );
}
