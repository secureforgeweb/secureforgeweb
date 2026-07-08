import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert, Users, ShieldCheck, User, Crown, Pencil, Trash2, KeyRound, ShieldHalf } from "lucide-react";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { ResizableColGroup, ResizableTable, ResizableTh } from "@/components/ResizableTable";
import { formatLocaleDateTime } from "@/i18n/formatLocaleDate";

type UserRole = "admin" | "security-analyst" | "user";

type UsersColumnKey = "user" | "email" | "role" | "loginMethod" | "lastAccess" | "actions";

const USERS_COLUMN_WIDTHS: Record<UsersColumnKey, number> = {
  user: 200,
  email: 220,
  role: 140,
  loginMethod: 120,
  lastAccess: 160,
  actions: 180,
};

const USERS_COLUMNS: UsersColumnKey[] = ["user", "email", "role", "loginMethod", "lastAccess", "actions"];

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  loginMethod: string;
  isActive: boolean;
  createdAt: Date;
  lastSignedIn: Date;
};

function RoleBadge({ role }: { role: UserRole }) {
  const labels = useEnumLabels();

  if (role === "admin") {
    return (
      <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/30 font-mono text-xs">
        <Crown className="w-3 h-3 mr-1" /> {labels.role(role)}
      </Badge>
    );
  }
  if (role === "security-analyst") {
    return (
      <Badge className="bg-blue-400/10 text-blue-400 border-blue-400/30 font-mono text-xs">
        <ShieldHalf className="w-3 h-3 mr-1" /> {labels.role(role)}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
      <User className="w-3 h-3 mr-1" /> {labels.role(role)}
    </Badge>
  );
}

function RoleIcon({ role }: { role: UserRole }) {
  if (role === "admin") return <Crown className="w-3.5 h-3.5 text-yellow-400" />;
  if (role === "security-analyst") return <ShieldHalf className="w-3.5 h-3.5 text-blue-400" />;
  return <User className="w-3.5 h-3.5 text-primary" />;
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { locale, t } = useLocale();
  const labels = useEnumLabels();
  const { widths, onResizeStart } = useResizableColumns("admin-users", USERS_COLUMN_WIDTHS);
  const utils = trpc.useUtils();

  const [roleTarget, setRoleTarget] = useState<{ user: UserRow; newRole: UserRole } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const { data: users, isLoading } = trpc.admin.listUsers.useQuery();

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success(t("adminUsers.roleUpdated"));
      utils.admin.listUsers.invalidate();
      setRoleTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateUserMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      toast.success(t("adminUsers.userUpdated"));
      utils.admin.listUsers.invalidate();
      setEditTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success(t("adminUsers.userDeleted"));
      utils.admin.listUsers.invalidate();
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPasswordMutation = trpc.admin.resetUserPassword.useMutation({
    onSuccess: () => {
      toast.success(t("adminUsers.passwordReset"));
      setResetTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (u: UserRow) => {
    setEditTarget(u);
    setEditName(u.name ?? "");
    setEditEmail(u.email ?? "");
  };

  const roleLabel = (role: UserRole) => labels.role(role);

  if (currentUser?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono text-sm">{t("common.adminOnly")}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const adminCount = users?.filter((u) => u.role === "admin").length ?? 0;
  const analystCount = users?.filter((u) => u.role === "security-analyst").length ?? 0;
  const userCount = users?.filter((u) => u.role === "user").length ?? 0;

  const getPromoteActions = (u: UserRow): Array<{ label: string; newRole: UserRole; className: string }> => {
    if (u.role === "user") {
      return [
        {
          label: t("adminUsers.promoteAnalyst"),
          newRole: "security-analyst",
          className: "h-7 text-xs font-mono border-blue-400/30 text-blue-400 hover:bg-blue-400/10",
        },
        {
          label: t("adminUsers.promoteAdmin"),
          newRole: "admin",
          className: "h-7 text-xs font-mono border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10",
        },
      ];
    }
    if (u.role === "security-analyst") {
      return [
        {
          label: t("adminUsers.promoteAdmin"),
          newRole: "admin",
          className: "h-7 text-xs font-mono border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10",
        },
      ];
    }
    return [];
  };

  const getDemoteAction = (u: UserRow): { label: string; newRole: UserRole; className: string } | null => {
    if (u.role === "admin") {
      return {
        label: t("adminUsers.demoteAnalyst"),
        newRole: "security-analyst",
        className: "h-7 text-xs font-mono border-blue-400/30 text-blue-400 hover:bg-blue-400/10",
      };
    }
    if (u.role === "security-analyst") {
      return {
        label: t("adminUsers.demoteUser"),
        newRole: "user",
        className: "h-7 text-xs font-mono border-red-400/30 text-red-400 hover:bg-red-400/10",
      };
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-mono font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {t("adminUsers.title")}
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">{t("adminUsers.subtitle")}</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-card border border-border rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-mono font-bold text-yellow-400">{adminCount}</p>
              <p className="text-xs text-muted-foreground font-mono">{t("adminUsers.admins")}</p>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-mono font-bold text-blue-400">{analystCount}</p>
              <p className="text-xs text-muted-foreground font-mono">{t("adminUsers.analysts")}</p>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-mono font-bold text-primary">{userCount}</p>
              <p className="text-xs text-muted-foreground font-mono">{t("adminUsers.users")}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
          <p className="text-xs font-mono text-blue-400 font-semibold mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t("adminUsers.hierarchy")}
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
            <span>{t("adminUsers.hierarchyUser")}</span>
            <span className="text-muted-foreground">→</span>
            <span>{t("adminUsers.hierarchyAnalyst")}</span>
            <span className="text-muted-foreground">→</span>
            <span>{t("adminUsers.hierarchyAdmin")}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <p className="text-xs text-muted-foreground font-mono px-4 py-2 border-b border-border">
            {t("common.tableResizeHint")}
          </p>
          <div className="overflow-x-auto">
            <ResizableTable className="text-sm">
              <ResizableColGroup columns={USERS_COLUMNS} widths={widths} />
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <ResizableTh
                    innerClassName="px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider"
                    onResizeStart={(x) => onResizeStart("user", x)}
                  >
                    {t("adminUsers.colUser")}
                  </ResizableTh>
                  <ResizableTh
                    innerClassName="px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider"
                    onResizeStart={(x) => onResizeStart("email", x)}
                  >
                    {t("adminUsers.colEmail")}
                  </ResizableTh>
                  <ResizableTh
                    innerClassName="px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider"
                    onResizeStart={(x) => onResizeStart("role", x)}
                  >
                    {t("adminUsers.colRole")}
                  </ResizableTh>
                  <ResizableTh
                    innerClassName="px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider"
                    onResizeStart={(x) => onResizeStart("loginMethod", x)}
                  >
                    {t("adminUsers.colLoginMethod")}
                  </ResizableTh>
                  <ResizableTh
                    innerClassName="px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider"
                    onResizeStart={(x) => onResizeStart("lastAccess", x)}
                  >
                    {t("adminUsers.colLastAccess")}
                  </ResizableTh>
                  <ResizableTh
                    resizable={false}
                    innerClassName="px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider justify-end"
                  >
                    {t("common.actions")}
                  </ResizableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-mono text-xs">
                      {t("adminUsers.loading")}
                    </td>
                  </tr>
                ) : !users?.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-mono text-xs">
                      {t("adminUsers.empty")}
                    </td>
                  </tr>
                ) : (
                  (users as UserRow[]).map((u) => {
                    const promoteActions = getPromoteActions(u);
                    const demoteAction = getDemoteAction(u);
                    return (
                      <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 overflow-hidden">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                              <RoleIcon role={u.role} />
                            </div>
                            <span className="font-mono text-sm text-foreground truncate">
                              {u.name ?? "—"}
                              {u.id === currentUser?.id && (
                                <span className="ml-1 text-xs text-muted-foreground">{t("common.you")}</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 overflow-hidden">
                          <span className="font-mono text-xs text-muted-foreground truncate block">{u.email ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-muted-foreground capitalize">{u.loginMethod}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatLocaleDateTime(locale, u.lastSignedIn, {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.id !== currentUser?.id ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEdit(u)}
                                  className="h-7 w-7 p-0 border-border text-muted-foreground hover:text-foreground hover:bg-muted/20"
                                  title={t("adminUsers.editUser")}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setResetTarget(u)}
                                  className="h-7 w-7 p-0 border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                                  title={t("adminUsers.resetPassword")}
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </Button>
                                {promoteActions.map((action) => (
                                  <Button
                                    key={action.newRole}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRoleTarget({ user: u, newRole: action.newRole })}
                                    className={action.className}
                                    title={t("adminUsers.changeToRole", { role: roleLabel(action.newRole) })}
                                  >
                                    {action.label}
                                  </Button>
                                ))}
                                {demoteAction && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRoleTarget({ user: u, newRole: demoteAction.newRole })}
                                    className={demoteAction.className}
                                    title={t("adminUsers.demoteToRole", { role: roleLabel(demoteAction.newRole) })}
                                  >
                                    {demoteAction.label}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeleteTarget(u)}
                                  className="h-7 w-7 p-0 border-red-400/30 text-red-400 hover:bg-red-400/10"
                                  title={t("adminUsers.deleteUser")}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 font-mono">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="bg-muted/20 border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-mono">
            <span className="text-primary font-semibold">{t("common.note")}:</span> {t("adminUsers.note")}
          </p>
        </div>
      </div>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono text-foreground flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              {t("adminUsers.editTitle")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("adminUsers.editDesc", { name: editTarget?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-mono text-xs text-muted-foreground">{t("common.name")}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="font-mono text-sm bg-muted/20 border-border"
                placeholder={t("adminUsers.fullNamePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono text-xs text-muted-foreground">{t("common.email")}</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="font-mono text-sm bg-muted/20 border-border"
                placeholder={t("adminUsers.emailPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} className="font-mono">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!editTarget) return;
                updateUserMutation.mutate({ userId: editTarget.id, name: editName || undefined, email: editEmail || undefined });
              }}
              disabled={updateUserMutation.isPending}
              className="font-mono bg-primary hover:bg-primary/90"
            >
              {updateUserMutation.isPending ? t("common.saving") : t("adminUsers.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-foreground flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              {t("adminUsers.resetTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("adminUsers.resetDesc", { name: resetTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetTarget && resetPasswordMutation.mutate({ userId: resetTarget.id })}
              className="bg-blue-600 hover:bg-blue-700 font-mono"
            >
              {resetPasswordMutation.isPending ? t("adminUsers.resetting") : t("adminUsers.confirmReset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-foreground flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              {t("adminUsers.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("adminUsers.deleteDesc", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteUserMutation.mutate({ userId: deleteTarget.id })}
              className="bg-red-600 hover:bg-red-700 font-mono"
            >
              {deleteUserMutation.isPending ? t("adminUsers.deleting") : t("adminUsers.deletePermanent")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-foreground">
              {t("adminUsers.changeRoleTitle", { role: roleLabel(roleTarget?.newRole ?? "user") })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("adminUsers.changeRoleDesc", {
                name: roleTarget?.user.name ?? "",
                from: roleLabel(roleTarget?.user.role ?? "user"),
                to: roleLabel(roleTarget?.newRole ?? "user"),
              })}
              {roleTarget?.newRole === "security-analyst" && (
                <span className="block mt-1 text-xs">{t("adminUsers.analystNote")}</span>
              )}
              {roleTarget?.newRole === "admin" && (
                <span className="block mt-1 text-xs text-yellow-400">{t("adminUsers.adminNote")}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleTarget && updateRoleMutation.mutate({ userId: roleTarget.user.id, role: roleTarget.newRole })}
              className={
                roleTarget?.newRole === "admin"
                  ? "bg-yellow-600 hover:bg-yellow-700 font-mono"
                  : roleTarget?.newRole === "security-analyst"
                    ? "bg-blue-600 hover:bg-blue-700 font-mono"
                    : "bg-red-600 hover:bg-red-700 font-mono"
              }
            >
              {updateRoleMutation.isPending ? t("adminUsers.updating") : t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
