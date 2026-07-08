import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Lock, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import PasswordCriteriaChecklist from "@/components/PasswordCriteriaChecklist";
import { isPasswordValid } from "@/lib/password";

export default function ResetPassword() {
  const { t } = useLocale();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

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

  const tokenQuery = trpc.auth.validateResetToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const confirmMutation = trpc.auth.confirmPasswordReset.useMutation({
    onSuccess: () => {
      setDone(true);
      toast.success(t("reset.success"));
    },
    onError: (e) => toast.error(e.message),
  });

  const passwordValid = isPasswordValid(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = () => {
    if (!passwordValid) {
      toast.error(t("register.weakPassword"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("register.passwordsMismatch"));
      return;
    }
    confirmMutation.mutate({ token, newPassword });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">{t("reset.invalidLink")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("reset.invalidLinkDesc")}</p>
          <Button onClick={() => navigate("/login")} className="w-full">
            {t("login.forgot.back")}
          </Button>
        </div>
      </div>
    );
  }

  if (tokenQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm font-mono">{t("reset.validating")}</div>
      </div>
    );
  }

  if (!tokenQuery.data?.valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">{t("reset.expiredTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-1">
            {tokenQuery.data?.reason ?? t("reset.expiredDefault")}
          </p>
          <p className="text-xs text-yellow-400 mb-4">{t("reset.expiredHint")}</p>
          <Button onClick={() => navigate("/login")} className="w-full">
            {t("reset.requestNew")}
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">{t("reset.doneTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("reset.doneDesc")}</p>
          <Button onClick={() => navigate("/login")} className="w-full">
            {t("reset.goToLogin")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-mono">SecureForge Web</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("reset.title")}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-foreground mb-1">{t("reset.newPassword")}</h2>
          <p className="text-xs text-muted-foreground mb-4">{t("reset.newPasswordHint")}</p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password" className="text-sm text-muted-foreground">
                {t("reset.newPassword")}
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 pr-9 bg-input border-border"
                  autoComplete="new-password"
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                  onPaste={blockClipboard}
                  onKeyDown={blockClipboard}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordCriteriaChecklist password={newPassword} />
            </div>

            <div>
              <Label htmlFor="confirm-password" className="text-sm text-muted-foreground">
                {t("reset.confirmNewPassword")}
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 pr-9 bg-input border-border"
                  autoComplete="new-password"
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                  onPaste={blockClipboard}
                  onKeyDown={(e) => {
                    blockClipboard(e);
                    if ("key" in e && e.key === "Enter") handleSubmit();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {t("register.passwordMismatch")}
                </p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {t("register.passwordMatch")}
                </p>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={confirmMutation.isPending || !passwordValid || !passwordsMatch}
            >
              {confirmMutation.isPending ? t("common.saving") : t("reset.submit")}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">{t("reset.footer")}</p>
      </div>
    </div>
  );
}
