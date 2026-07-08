import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleToggle } from "@/components/ChecklistLocaleToggle";

type PublicPageControlsProps = {
  variant?: "fixed" | "inline";
  className?: string;
};

export function PublicPageControls({ variant = "fixed", className = "" }: PublicPageControlsProps) {
  const base =
    variant === "fixed"
      ? "fixed top-4 right-4 z-50 flex items-center gap-2"
      : "flex items-center gap-2 sm:gap-3";

  return (
    <div className={`${base} ${className}`.trim()}>
      <LocaleToggle />
      <ThemeToggle />
    </div>
  );
}
