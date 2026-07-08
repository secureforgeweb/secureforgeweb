import { Button } from "@/components/ui/button";
import { useChecklistLocale } from "@/contexts/ChecklistLocaleContext";
import { Languages } from "lucide-react";

export function LocaleToggle() {
  const { locale, setLocale } = useChecklistLocale();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
      <Button
        type="button"
        variant={locale === "pt" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2 font-mono text-[11px]"
        onClick={() => setLocale("pt")}
        aria-pressed={locale === "pt"}
      >
        PT
      </Button>
      <Button
        type="button"
        variant={locale === "en" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2 font-mono text-[11px]"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
      >
        EN
      </Button>
      <Languages className="w-3.5 h-3.5 text-muted-foreground ml-0.5 mr-1 hidden sm:block" />
    </div>
  );
}

/** @deprecated Use LocaleToggle */
export const ChecklistLocaleToggle = LocaleToggle;
