import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import PasswordCriteriaChecklist from "@/components/PasswordCriteriaChecklist";
import { PASSWORD_CRITERIA, checkPasswordCriteria } from "@/lib/password";
import { User, Mail, Lock, CheckCircle, XCircle } from "lucide-react";

export { PASSWORD_CRITERIA };

export default function Register() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const criteria = useMemo(() => checkPasswordCriteria(password), [password]);
  const allMet = criteria.every((c) => c.met);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Conta criada! Faça login para continuar.");
      navigate("/login");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleRegister = () => {
    if (!name || !email) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    if (!allMet) {
      toast.error("A senha não atende aos requisitos mínimos de segurança.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem. Verifique e tente novamente.");
      return;
    }
    registerMutation.mutate({ name, email, password });
  };

  return (
    <div className="min-h-screen bg-background flex items-stretch justify-center p-4 sm:p-6 lg:p-8">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center my-auto">
        <div className="hidden lg:flex flex-col gap-4 pr-4">
          <BrandLogo variant="icon" iconClassName="w-20 h-20 rounded-2xl" />
          <h1 className="text-3xl xl:text-4xl font-bold text-foreground font-mono leading-tight">
            SecureForge Web
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-md">
            Crie sua conta para registrar aplicações, executar checklists OWASP e acompanhar a postura de segurança da sua equipe.
          </p>
        </div>

        <div className="w-full max-w-xl mx-auto lg:mx-0 lg:max-w-none">
          <div className="text-center lg:text-left mb-6 flex flex-col items-center lg:items-start gap-3">
            <BrandLogo variant="icon" iconClassName="w-16 h-16 rounded-2xl lg:hidden" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-mono">Criar conta</h1>
              <p className="text-muted-foreground text-base mt-1">Novo operador SecureForge Web</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-xl">
            <div className="space-y-5">
              <div>
                <Label className="text-sm text-muted-foreground">Nome Completo</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Seu nome completo" value={name} onChange={e => setName(e.target.value)} className="pl-9 h-11 text-base bg-input border-border" />
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder="usuario@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-9 h-11 text-base bg-input border-border" />
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Senha</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-9 h-11 text-base bg-input border-border" />
                </div>
                <PasswordCriteriaChecklist password={password} />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Confirmar Senha</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="pl-9 h-11 text-base bg-input border-border"
                  />
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 shrink-0" />
                    As senhas não coincidem
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Senhas coincidem
                  </p>
                )}
              </div>
              <Button
                className="w-full h-11 text-base"
                onClick={handleRegister}
                disabled={registerMutation.isPending || !name || !email || !allMet || !passwordsMatch}
              >
                {registerMutation.isPending ? "Criando conta..." : "Criar Conta"}
              </Button>
            </div>
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-center text-base text-muted-foreground">
                Já tem conta?{" "}
                <button onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">Fazer login</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
