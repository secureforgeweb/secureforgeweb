import { Check, X } from "lucide-react";
import { checkPasswordCriteria } from "@/lib/password";
import { useLocale } from "@/contexts/ChecklistLocaleContext";

export default function PasswordCriteriaChecklist({ password }: { password: string }) {
  const { t } = useLocale();
  if (!password) return null;

  const criteria = checkPasswordCriteria(password, t);

  return (
    <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50 space-y-1.5">
      {criteria.map((c) => (
        <div key={c.key} className="flex items-center gap-2 text-sm">
          {c.met ? (
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
          <span className={c.met ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
