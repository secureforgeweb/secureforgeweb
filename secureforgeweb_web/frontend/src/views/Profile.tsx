import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import PasswordCriteriaChecklist from "@/components/PasswordCriteriaChecklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { isPasswordValid } from "@/lib/password";
import { User, Mail, Shield, Calendar, Lock, Eye, EyeOff, AlertTriangle, CheckCircle, XCircle, Brain } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function blockClipboard(e: React.ClipboardEvent | React.KeyboardEvent) {
  if ("key" in e) {
    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl && ["c", "x", "v"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      toast.warning("Copiar/colar não é permitido no campo de senha por segurança.");
      return;
    }
  }
  if ("clipboardData" in e) {
    e.preventDefault();
    toast.warning("Copiar/colar não é permitido no campo de senha por segurança.");
  }
}

export default function Profile() {
  const { user } = useAuth();
  const search = useSearch();
  const mustChangePwd = new URLSearchParams(search).get("mustChangePassword") === "1";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const utils = trpc.useUtils();

  const passwordValid = useMemo(() => isPasswordValid(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      window.history.replaceState({}, "", "/profile");
      utils.auth.me.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleChangePassword = () => {
    if (!currentPassword) { toast.error("Informe a senha atual."); return; }
    if (!passwordValid) {
      toast.error("A nova senha não atende aos requisitos mínimos de segurança.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem. Verifique e tente novamente.");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Meu Perfil
          </h1>
          <p className="text-base text-muted-foreground mt-1">Informações da sua conta SecureForge Web</p>
        </div>

        {mustChangePwd && (
          <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-semibold text-yellow-700 dark:text-yellow-300">Troca de senha obrigatória</p>
              <p className="text-sm text-yellow-700/80 dark:text-yellow-400/80 mt-0.5">
                Sua senha foi redefinida pelo administrador. Crie uma nova senha antes de continuar.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_1fr]">
          <Card className="bg-card border-border h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-mono font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Dados da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 py-2 border-b border-border/50">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-mono font-bold text-primary">
                    {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-mono font-semibold text-foreground text-base">{user?.name ?? "Usuário"}</p>
                  <Badge
                    variant="outline"
                    className={`mt-1 text-xs font-mono ${
                      user?.role === "admin"
                        ? "border-yellow-400/30 text-yellow-600 dark:text-yellow-400"
                        : user?.role === "security-analyst"
                        ? "border-blue-400/30 text-blue-600 dark:text-blue-400"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {user?.role === "admin" ? "Administrador" : user?.role === "security-analyst" ? "Revisor AppSec" : "Usuário"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-mono text-muted-foreground">Nome</p>
                    <p className="text-base font-mono text-foreground">{user?.name ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-mono text-muted-foreground">E-mail</p>
                    <p className="text-base font-mono text-foreground break-all">{user?.email ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-mono text-muted-foreground">Membro desde</p>
                    <p className="text-base font-mono text-foreground">{formatDate(user?.createdAt)}</p>
                  </div>
                </div>
                <Link href="/profile/ai-assistant">
                  <Button variant="outline" className="w-full font-mono text-sm mt-2">
                    <Brain className="w-4 h-4 mr-2 text-violet-500" />
                    Configurar Assistente IA
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-mono font-semibold text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Alterar Senha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Senha Atual</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="pr-9 h-11 text-base bg-input border-border"
                      onCopy={blockClipboard} onCut={blockClipboard} onPaste={blockClipboard} onKeyDown={blockClipboard}
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Nova Senha</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="pr-9 h-11 text-base bg-input border-border"
                      onCopy={blockClipboard} onCut={blockClipboard} onPaste={blockClipboard} onKeyDown={blockClipboard}
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Confirmar Nova Senha</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pr-9 h-11 text-base bg-input border-border"
                      onCopy={blockClipboard} onCut={blockClipboard} onPaste={blockClipboard} onKeyDown={blockClipboard}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <PasswordCriteriaChecklist password={newPassword} />
                <div className="space-y-2">
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 shrink-0" />
                      As senhas não coincidem
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      Senhas coincidem
                    </p>
                  )}
                </div>
              </div>

              <Button
                className="h-11 text-base"
                onClick={handleChangePassword}
                disabled={
                  changePasswordMutation.isPending ||
                  !currentPassword ||
                  !passwordValid ||
                  !passwordsMatch
                }
              >
                {changePasswordMutation.isPending ? "Salvando..." : "Alterar Senha"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
