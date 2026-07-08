import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import { PublicPageControls } from "@/components/PublicPageControls";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import PasswordCriteriaChecklist from "@/components/PasswordCriteriaChecklist";
import { PASSWORD_CRITERIA, checkPasswordCriteria } from "@/lib/password";
import { User, Mail, Lock, CheckCircle, XCircle } from "lucide-react";

export { PASSWORD_CRITERIA };

export default function Register() {
  const [, navigate] = useLocation();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const criteria = useMemo(() => checkPasswordCriteria(password), [password]);
  const allMet = criteria.every((c) => c.met);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success(t("register.success"));
      navigate("/login");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleRegister = () => {
    if (!name || !email) {
      toast.error(t("register.fillRequired"));
      return;
    }
    if (!allMet) {
      toast.error(t("register.weakPassword"));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("register.passwordsMismatch"));
      return;
    }
    registerMutation.mutate({ name, email, password });
  };

  return (
    <div className="min-h-screen bg-background flex items-stretch justify-center p-4 sm:p-6 lg:p-8">
      <PublicPageControls />
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center my-auto">
        <div className="hidden lg:flex flex-col gap-4 pr-4">
          <BrandLogo variant="icon" iconClassName="w-20 h-20 rounded-2xl" />
          <h1 className="text-3xl xl:text-4xl font-bold text-foreground font-mono leading-tight">
            SecureForge Web
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-md">
            {t("register.heroDesc")}
          </p>
        </div>

        <div className="w-full max-w-xl mx-auto lg:mx-0 lg:max-w-none">
          <div className="text-center lg:text-left mb-6 flex flex-col items-center lg:items-start gap-3">
            <BrandLogo variant="icon" iconClassName="w-16 h-16 rounded-2xl lg:hidden" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-mono">{t("register.title")}</h1>
              <p className="text-muted-foreground text-base mt-1">{t("register.subtitle")}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-xl">
            <div className="space-y-5">
              <div>
                <Label className="text-sm text-muted-foreground">{t("register.fullName")}</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={t("register.fullNamePlaceholder")} value={name} onChange={e => setName(e.target.value)} className="pl-9 h-11 text-base bg-input border-border" />
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t("register.email")}</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder={t("register.emailPlaceholder")} value={email} onChange={e => setEmail(e.target.value)} className="pl-9 h-11 text-base bg-input border-border" />
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t("register.password")}</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder={t("register.passwordPlaceholder")} value={password} onChange={e => setPassword(e.target.value)} className="pl-9 h-11 text-base bg-input border-border" />
                </div>
                <PasswordCriteriaChecklist password={password} />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t("register.confirmPassword")}</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder={t("register.confirmPlaceholder")}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="pl-9 h-11 text-base bg-input border-border"
                  />
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 shrink-0" />
                    {t("register.passwordMismatch")}
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    {t("register.passwordMatch")}
                  </p>
                )}
              </div>
              <Button
                className="w-full h-11 text-base"
                onClick={handleRegister}
                disabled={registerMutation.isPending || !name || !email || !allMet || !passwordsMatch}
              >
                {registerMutation.isPending ? t("register.submitting") : t("register.submit")}
              </Button>
            </div>
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-center text-base text-muted-foreground">
                {t("register.hasAccount")}{" "}
                <button onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">{t("register.signIn")}</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
