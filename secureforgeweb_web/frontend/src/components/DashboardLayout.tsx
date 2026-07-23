import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import {
  LayoutDashboard, Shield, LogOut, User, ChevronRight,
  Globe, BarChart2, Users, ListChecks, BarChart3,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset,
  SidebarProvider, SidebarRail, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import DashboardLayoutSkeleton from "./DashboardLayoutSkeleton";
import NotificationBell from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleToggle } from "./ChecklistLocaleToggle";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import type { MessageKey } from "@/i18n/messages";

function readSidebarOpenCookie(): boolean {
  if (typeof document === "undefined") return true;
  const match = document.cookie.match(/(?:^| )sidebar_state=([^;]+)/);
  if (!match) return true;
  return match[1] === "true";
}

const menuItems: { path: string; labelKey: MessageKey; icon: typeof LayoutDashboard }[] = [
  { path: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { path: "/applications", labelKey: "nav.applications", icon: Globe },
  { path: "/posture", labelKey: "nav.posture", icon: BarChart2 },
];

const adminItems: { path: string; labelKey: MessageKey; icon: typeof Shield }[] = [
  { path: "/admin", labelKey: "nav.admin", icon: Shield },
  { path: "/admin/users", labelKey: "nav.users", icon: Users },
  { path: "/admin/checklist-items", labelKey: "nav.checklist", icon: ListChecks },
  { path: "/admin/analyses", labelKey: "nav.analyses", icon: BarChart3 },
];

function DashboardSidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLocale();
  const { state } = useSidebar();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { toast.success(t("toast.sessionEnded")); window.location.href = "/login"; },
  });

  const collapsed = state === "collapsed";

  const roleLabel =
    user?.role === "admin"
      ? t("role.admin")
      : user?.role === "security-analyst"
        ? t("role.securityAnalyst")
        : t("role.user");

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader
        className={cn(
          "border-b border-sidebar-border",
          collapsed ? "p-2 flex items-center justify-center" : "p-3"
        )}
      >
        <BrandLogo
          variant={collapsed ? "icon" : "full"}
          showSubtitle={!collapsed}
          className={collapsed ? "justify-center" : undefined}
        />
      </SidebarHeader>
      <SidebarContent className="gap-0 py-2">
        <SidebarMenu className="px-2">
          {menuItems.map(item => {
            const isActive = location === item.path || (item.path !== "/dashboard" && location.startsWith(item.path));
            const label = t(item.labelKey);
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  isActive={isActive}
                  onClick={() => setLocation(item.path)}
                  tooltip={label}
                  className="h-10 transition-all font-mono text-sm"
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={isActive ? "text-foreground font-medium" : "text-muted-foreground"}>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
        {user?.role === "admin" && (
          <>
            <div className="px-4 pt-3 pb-1 group-data-[collapsible=icon]:hidden">
              <p className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wider">{t("nav.adminSection")}</p>
            </div>
            <SidebarMenu className="px-2">
              {adminItems.map(item => {
                const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
                const label = t(item.labelKey);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={label}
                      className="h-10 transition-all font-mono text-sm"
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={isActive ? "text-foreground font-medium" : "text-muted-foreground"}>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </>
        )}
      </SidebarContent>
      <SidebarFooter className={cn("border-t border-sidebar-border/50", collapsed ? "p-2" : "p-3")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center rounded-lg hover:bg-accent/50 transition-colors w-full text-left focus:outline-none",
                collapsed ? "justify-center p-1" : "gap-3 px-1 py-1"
              )}
            >
              <Avatar className="h-8 w-8 border border-border shrink-0">
                <AvatarFallback className="text-xs font-mono bg-primary/10 text-primary">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-medium truncate text-foreground">{user?.name || t("role.default")}</p>
                  <p className="text-xs text-muted-foreground truncate font-mono">{roleLabel}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card border-border">
            <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer font-mono text-xs">
              <User className="mr-2 h-3.5 w-3.5" /> {t("nav.profile")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="cursor-pointer text-destructive focus:text-destructive font-mono text-xs">
              <LogOut className="mr-2 h-3.5 w-3.5" /> {t("nav.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, loading } = useAuth();
  const { t } = useLocale();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) { window.location.href = "/login"; return null; }

  const activeItem = [...menuItems, ...adminItems].find(
    (i) => location === i.path || (i.path !== "/dashboard" && location.startsWith(i.path))
  );

  return (
    <SidebarProvider defaultOpen={readSidebarOpenCookie()}>
      <DashboardSidebar />
      <SidebarInset className="bg-background">
        <div className="flex border-b border-border h-14 items-center justify-between bg-background/95 px-4 lg:px-6 backdrop-blur sticky top-0 z-40 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="size-8 shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-xs">
                {t("nav.toggleSidebar")} ({t("nav.toggleShortcut")})
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground min-w-0 truncate">
              <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground/50 shrink-0">SecureForge</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
              <span className="text-foreground font-medium truncate">
                {activeItem ? t(activeItem.labelKey) : t("nav.dashboard")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LocaleToggle />
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
        <main className="flex-1 w-full p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
