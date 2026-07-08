import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { ResizableColGroup, ResizableTable, ResizableTh } from "@/components/ResizableTable";
import {
  resolveCategoryName,
  resolveItemDescription,
  resolveItemTitle,
} from "@shared/checklistLocale";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "border-red-400/30 text-red-400",
  high: "border-orange-400/30 text-orange-400",
  medium: "border-yellow-400/30 text-yellow-400",
  low: "border-emerald-400/30 text-emerald-400",
};

type ChecklistColumnKey = "code" | "requirement" | "level" | "ref" | "auto" | "severity" | "actions";

const CHECKLIST_COLUMN_WIDTHS: Record<ChecklistColumnKey, number> = {
  code: 88,
  requirement: 520,
  level: 56,
  ref: 120,
  auto: 96,
  severity: 112,
  actions: 88,
};

const CHECKLIST_COLUMNS: ChecklistColumnKey[] = [
  "code",
  "requirement",
  "level",
  "ref",
  "auto",
  "severity",
  "actions",
];

type CatalogItem = {
  id: number;
  code: string;
  categoryName: string;
  categoryNamePt?: string | null;
  owaspRef?: string | null;
  verificationLevel?: number | null;
  essentialCode?: string | null;
  suggestedSeverity: "critical" | "high" | "medium" | "low";
  title: string;
  titlePt?: string | null;
  description: string;
  descriptionPt?: string | null;
};

type CategoryGroup = {
  name: string;
  namePt?: string | null;
  items: CatalogItem[];
};

function categorySlug(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function textsDiffer(a: string, b: string): boolean {
  return a.trim().toLowerCase() !== b.trim().toLowerCase();
}

export default function AdminChecklistItems() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const labels = useEnumLabels();
  const { widths, onResizeStart } = useResizableColumns("admin-checklist", CHECKLIST_COLUMN_WIDTHS);
  const utils = trpc.useUtils();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [checklistId, setChecklistId] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "1" | "2" | "3">("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [activeChapter, setActiveChapter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: checklists } = trpc.admin.listChecklists.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const activeChecklistId =
    checklistId ?? checklists?.find((c) => c.isDefault)?.id ?? checklists?.[0]?.id;

  const { data: catalog, isLoading } = trpc.admin.listChecklistItems.useQuery(
    { checklistId: activeChecklistId },
    { enabled: user?.role === "admin" && activeChecklistId != null }
  );

  const updateItem = trpc.admin.updateChecklistItem.useMutation({
    onSuccess: () => {
      utils.admin.listChecklistItems.invalidate();
      setEditingId(null);
      toast.success(t("adminChecklist.itemUpdated"));
    },
    onError: (e) => toast.error(e.message),
  });

  const syncAsvs = trpc.admin.syncAsvsCatalog.useMutation({
    onSuccess: (result) => {
      utils.admin.listChecklists.invalidate();
      utils.admin.listChecklistItems.invalidate();
      const details = result.results
        .map((r) => `${r.profile}: ${r.itemCount} ${t("common.items")}`)
        .join(", ");
      toast.success(t("adminChecklist.syncSuccess", { details }));
    },
    onError: (e) => toast.error(e.message),
  });

  const items = (catalog?.items ?? []) as CatalogItem[];

  const categories = useMemo((): CategoryGroup[] => {
    const map = new Map<string, CategoryGroup>();
    for (const item of items) {
      const key = item.categoryName;
      if (!map.has(key)) {
        map.set(key, { name: item.categoryName, namePt: item.categoryNamePt, items: [] });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [items]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => {
          if (levelFilter !== "all" && String(item.verificationLevel ?? "") !== levelFilter) {
            return false;
          }
          if (severityFilter !== "all" && item.suggestedSeverity !== severityFilter) {
            return false;
          }
          if (!q) return true;
          const title = resolveItemTitle(item, locale).toLowerCase();
          const desc = resolveItemDescription(item, locale).toLowerCase();
          return (
            item.code.toLowerCase().includes(q) ||
            title.includes(q) ||
            desc.includes(q) ||
            (item.owaspRef?.toLowerCase().includes(q) ?? false) ||
            (item.essentialCode?.toLowerCase().includes(q) ?? false)
          );
        }),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, searchQuery, levelFilter, severityFilter, locale]);

  const visibleCategories = useMemo(() => {
    if (activeChapter === "all") return filteredCategories;
    return filteredCategories.filter(
      (cat) => categorySlug(resolveCategoryName(cat, locale)) === activeChapter
    );
  }, [filteredCategories, activeChapter, locale]);

  const filteredCount = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  const totalCount = items.length;

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrollToChapter = (slug: string) => {
    setActiveChapter(slug === "all" ? "all" : slug);
    if (slug !== "all") {
      requestAnimationFrame(() => {
        sectionRefs.current[slug]?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono">{t("common.adminOnly")}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 min-h-0">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/admin")}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground font-mono truncate">
                {t("adminChecklist.title")}
              </h1>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {catalog?.checklist
                  ? `${(locale === "pt" && catalog.checklist.namePt) || catalog.checklist.name} v${catalog.checklist.version}`
                  : t("adminChecklist.catalog")}{" "}
                · {totalCount} {t("common.items")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {checklists && checklists.length > 0 && (
              <Select
                value={activeChecklistId != null ? String(activeChecklistId) : undefined}
                onValueChange={(v) => {
                  setChecklistId(Number(v));
                  setActiveChapter("all");
                }}
              >
                <SelectTrigger className="w-56 font-mono text-xs h-9">
                  <SelectValue placeholder={t("adminChecklist.checklistPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {checklists.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="font-mono text-xs">
                      {(locale === "pt" && c.namePt) || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              disabled={syncAsvs.isPending}
              onClick={() => syncAsvs.mutate({ force: true })}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncAsvs.isPending ? "animate-spin" : ""}`} />
              {t("adminChecklist.syncAsvs")}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col xl:flex-row gap-3 bg-card border border-border rounded-xl p-3 shrink-0">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveChapter("all");
              }}
              placeholder={t("wizard.searchPlaceholder")}
              className="pl-9 font-mono text-xs h-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={levelFilter}
              onValueChange={(v) => {
                setLevelFilter(v as "all" | "1" | "2" | "3");
                setActiveChapter("all");
              }}
            >
              <SelectTrigger className="w-full sm:w-40 font-mono text-xs h-9">
                <SelectValue placeholder={t("wizard.asvsLevel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-mono text-xs">
                  {t("wizard.allLevels")}
                </SelectItem>
                <SelectItem value="1" className="font-mono text-xs">
                  {t("wizard.level", { level: 1 })}
                </SelectItem>
                <SelectItem value="2" className="font-mono text-xs">
                  {t("wizard.level", { level: 2 })}
                </SelectItem>
                <SelectItem value="3" className="font-mono text-xs">
                  {t("wizard.level", { level: 3 })}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={severityFilter}
              onValueChange={(v) => {
                setSeverityFilter(v as typeof severityFilter);
                setActiveChapter("all");
              }}
            >
              <SelectTrigger className="w-full sm:w-40 font-mono text-xs h-9">
                <SelectValue placeholder={t("common.severity")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-mono text-xs">
                  {t("adminChecklist.allSeverities")}
                </SelectItem>
                {labels.severityOptions().map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground font-mono self-center xl:ml-auto whitespace-nowrap">
            {t("adminChecklist.showingCount", { shown: filteredCount, total: totalCount })}
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground font-mono">{t("adminChecklist.loading")}</p>
        ) : filteredCount === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">{t("adminChecklist.noResults")}</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1">
            {/* Chapter navigation */}
            <aside className="lg:w-56 xl:w-64 shrink-0">
              <div className="bg-card border border-border rounded-xl overflow-hidden lg:sticky lg:top-4">
                <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
                  <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("adminChecklist.chapters")}
                  </p>
                </div>
                <ScrollArea className="h-[min(420px,50vh)] lg:h-[calc(100vh-16rem)]">
                  <nav className="p-1.5 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => scrollToChapter("all")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors ${
                        activeChapter === "all"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {t("adminChecklist.allChapters")}
                      <span className="ml-1 opacity-60">({filteredCount})</span>
                    </button>
                    {filteredCategories.map((cat) => {
                      const slug = categorySlug(resolveCategoryName(cat, locale));
                      const label = resolveCategoryName(cat, locale);
                      return (
                        <button
                          key={slug}
                          type="button"
                          onClick={() => scrollToChapter(slug)}
                          title={label}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors truncate ${
                            activeChapter === slug
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          {label}
                          <span className="ml-1 opacity-60">({cat.items.length})</span>
                        </button>
                      );
                    })}
                  </nav>
                </ScrollArea>
              </div>
            </aside>

            {/* Items table */}
            <div className="flex-1 min-w-0">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <p className="text-xs text-muted-foreground font-mono px-3 py-2 border-b border-border">
                  {t("common.tableResizeHint")}
                </p>
                <div className="overflow-x-auto">
                  <ResizableTable className="text-xs font-mono" minWidth={720}>
                    <ResizableColGroup columns={CHECKLIST_COLUMNS} widths={widths} />
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                        <ResizableTh
                          innerClassName="px-3 py-2 text-left"
                          onResizeStart={(x) => onResizeStart("code", x)}
                        >
                          {t("adminChecklist.colCode")}
                        </ResizableTh>
                        <ResizableTh
                          innerClassName="px-3 py-2 text-left"
                          onResizeStart={(x) => onResizeStart("requirement", x)}
                        >
                          {t("adminChecklist.colRequirement")}
                        </ResizableTh>
                        <ResizableTh
                          innerClassName="px-3 py-2 text-left hidden md:flex"
                          className="hidden md:table-cell"
                          onResizeStart={(x) => onResizeStart("level", x)}
                        >
                          {t("adminChecklist.colLevel")}
                        </ResizableTh>
                        <ResizableTh
                          innerClassName="px-3 py-2 text-left hidden lg:flex"
                          className="hidden lg:table-cell"
                          onResizeStart={(x) => onResizeStart("ref", x)}
                        >
                          {t("adminChecklist.colRef")}
                        </ResizableTh>
                        <ResizableTh
                          innerClassName="px-3 py-2 text-left hidden xl:flex"
                          className="hidden xl:table-cell"
                          onResizeStart={(x) => onResizeStart("auto", x)}
                        >
                          {t("adminChecklist.colAuto")}
                        </ResizableTh>
                        <ResizableTh
                          innerClassName="px-3 py-2 text-left"
                          onResizeStart={(x) => onResizeStart("severity", x)}
                        >
                          {t("common.severity")}
                        </ResizableTh>
                        <ResizableTh
                          resizable={false}
                          innerClassName="px-3 py-2 text-right justify-end"
                        >
                          {t("adminChecklist.colActions")}
                        </ResizableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCategories.map((cat) => {
                        const slug = categorySlug(resolveCategoryName(cat, locale));
                        const categoryLabel = resolveCategoryName(cat, locale);
                        return (
                          <CategorySection
                            key={slug}
                            slug={slug}
                            categoryLabel={categoryLabel}
                            items={cat.items}
                            locale={locale}
                            t={t}
                            labels={labels}
                            editingId={editingId}
                            expandedIds={expandedIds}
                            sectionRefs={sectionRefs}
                            onToggleExpanded={toggleExpanded}
                            onEdit={setEditingId}
                            onCancelEdit={() => setEditingId(null)}
                            onUpdateSeverity={(id, severity) =>
                              updateItem.mutate({ id, suggestedSeverity: severity })
                            }
                            isUpdating={updateItem.isPending}
                          />
                        );
                      })}
                    </tbody>
                  </ResizableTable>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

type CategorySectionProps = {
  slug: string;
  categoryLabel: string;
  items: CatalogItem[];
  locale: "pt" | "en";
  t: (key: import("@/i18n/messages").MessageKey, params?: Record<string, string | number>) => string;
  labels: ReturnType<typeof useEnumLabels>;
  editingId: number | null;
  expandedIds: Set<number>;
  sectionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onToggleExpanded: (id: number) => void;
  onEdit: (id: number) => void;
  onCancelEdit: () => void;
  onUpdateSeverity: (id: number, severity: "critical" | "high" | "medium" | "low") => void;
  isUpdating: boolean;
};

function CategorySection({
  slug,
  categoryLabel,
  items,
  locale,
  t,
  labels,
  editingId,
  expandedIds,
  sectionRefs,
  onToggleExpanded,
  onEdit,
  onCancelEdit,
  onUpdateSeverity,
  isUpdating,
}: CategorySectionProps) {
  return (
    <>
      <tr className="bg-muted/25 border-b border-border/50">
        <td colSpan={7} className="px-0 py-0">
          <div
            ref={(el) => {
              sectionRefs.current[slug] = el;
            }}
            className="flex items-center gap-2 px-3 py-2 scroll-mt-4"
          >
            <ClipboardList className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">{categoryLabel}</span>
            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
              {items.length} {t("common.items")}
            </span>
          </div>
        </td>
      </tr>
      {items.map((item) => {
        const title = resolveItemTitle(item, locale);
        const description = resolveItemDescription(item, locale);
        const hasExtraDescription = textsDiffer(title, description);
        const isExpanded = expandedIds.has(item.id);

        return (
          <tr
            key={item.id}
            className="border-b border-border/30 hover:bg-muted/20 transition-colors group"
          >
            <td className="px-3 py-1.5 align-top">
              <span className="text-primary font-semibold">{item.code}</span>
            </td>
            <td className="px-3 py-1.5 align-top min-w-0">
              <div className="flex items-start gap-1 min-w-0">
                {hasExtraDescription ? (
                  <button
                    type="button"
                    onClick={() => onToggleExpanded(item.id)}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={isExpanded ? t("adminChecklist.collapse") : t("adminChecklist.expand")}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className={`text-foreground leading-snug ${isExpanded ? "" : "line-clamp-2"}`}>
                    {title}
                  </p>
                  {hasExtraDescription && isExpanded && (
                    <p className="text-muted-foreground mt-1 leading-snug">{description}</p>
                  )}
                </div>
              </div>
            </td>
            <td className="px-3 py-1.5 align-top hidden md:table-cell">
              {item.verificationLevel != null ? (
                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                  L{item.verificationLevel}
                </Badge>
              ) : (
                <span className="text-muted-foreground/40">—</span>
              )}
            </td>
            <td className="px-3 py-1.5 align-top hidden lg:table-cell">
              {item.owaspRef ? (
                <span className="text-muted-foreground truncate block max-w-[7rem]" title={item.owaspRef}>
                  {item.owaspRef}
                </span>
              ) : (
                <span className="text-muted-foreground/40">—</span>
              )}
            </td>
            <td className="px-3 py-1.5 align-top hidden xl:table-cell">
              {item.essentialCode ? (
                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                  {item.essentialCode}
                </Badge>
              ) : (
                <span className="text-muted-foreground/40">—</span>
              )}
            </td>
            <td className="px-3 py-1.5 align-top">
              {editingId === item.id ? (
                <Select
                  defaultValue={item.suggestedSeverity}
                  onValueChange={(v) =>
                    onUpdateSeverity(item.id, v as "critical" | "high" | "medium" | "low")
                  }
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-full font-mono text-[10px] h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {labels.severityOptions().map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] px-1.5 py-0 ${SEVERITY_COLORS[item.suggestedSeverity] ?? ""}`}
                >
                  {labels.severity(item.suggestedSeverity)}
                </Badge>
              )}
            </td>
            <td className="px-3 py-1.5 align-top text-right">
              {editingId === item.id ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-mono text-[10px] h-7 px-2"
                  onClick={onCancelEdit}
                >
                  {t("common.cancel")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono text-[10px] h-7 px-2 opacity-80 group-hover:opacity-100"
                  onClick={() => onEdit(item.id)}
                >
                  {t("common.edit")}
                </Button>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}
