import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "icon" | "full";
  className?: string;
  iconClassName?: string;
  showSubtitle?: boolean;
};

export default function BrandLogo({
  variant = "full",
  className,
  iconClassName,
  showSubtitle = true,
}: BrandLogoProps) {
  if (variant === "icon") {
    return (
      <img
        src="/icon.png"
        alt="SecureForge Web"
        className={cn("w-7 h-7 rounded-lg object-cover shrink-0", iconClassName)}
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <img
        src="/icon.png"
        alt=""
        aria-hidden
        className={cn("w-7 h-7 rounded-lg object-cover shrink-0", iconClassName)}
      />
      <div className="min-w-0">
        <p className="font-bold text-sm font-mono text-foreground truncate">SecureForge Web</p>
        {showSubtitle && (
          <p className="text-xs text-muted-foreground font-mono truncate">Diagnóstico & Hardening</p>
        )}
      </div>
    </div>
  );
}
