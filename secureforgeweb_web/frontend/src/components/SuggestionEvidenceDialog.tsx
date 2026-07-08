import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Download,
  FileCode2,
  FileSearch,
  Globe,
  GitBranch,
  Brain,
  ScanSearch,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  type AssessmentEvidenceArtifact,
  type AssessmentScope,
  downloadDataUrl,
  exportEvidencePng,
  sortArtifactsForDisplay,
} from "@/lib/assessmentEvidence";
import { useLocale } from "@/contexts/ChecklistLocaleContext";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import type { MessageKey } from "@/i18n/messages";

export type SuggestionEvidenceEntry = {
  scope: AssessmentScope;
  source?: "auto" | "ai";
  confidence: number;
  compliance?: string;
  evidence: string;
  rationale: string;
  artifacts?: AssessmentEvidenceArtifact[];
  assessedAt?: string;
};

type SuggestionEvidenceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCode: string;
  itemTitle: string;
  entries: SuggestionEvidenceEntry[];
};

type TranslateFn = (key: MessageKey, params?: Record<string, string | number>) => string;

const COMPLIANCE_STYLES: Record<string, string> = {
  conforme: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  parcial: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  nao_conforme: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  nao_aplicavel: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
};

const SCOPE_ICONS: Record<AssessmentScope, typeof Globe> = {
  http_headers: Globe,
  git_repo: GitBranch,
  ai_agent: Brain,
};

function CodeBlock({ artifact, t }: { artifact: AssessmentEvidenceArtifact; t: TranslateFn }) {
  const [copied, setCopied] = useState(false);
  const lines = artifact.content.split("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden bg-slate-950 shadow-inner">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-[11px] font-mono text-slate-300 truncate">
            {artifact.filePath ?? t("evidence.detectedSnippet")}
            {artifact.lineStart ? (
              <span className="text-cyan-400/80">
                :{artifact.lineStart}
                {artifact.lineEnd && artifact.lineEnd !== artifact.lineStart ? `–${artifact.lineEnd}` : ""}
              </span>
            ) : null}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] font-mono text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1 text-emerald-400" /> {t("evidence.copied")}
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" /> {t("evidence.copy")}
            </>
          )}
        </Button>
      </div>
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <pre className="text-[11px] leading-5 font-mono p-0 m-0">
          {lines.map((line, i) => {
            const isMatch = line.startsWith(">");
            return (
              <div
                key={i}
                className={`flex ${isMatch ? "bg-amber-500/15 border-l-2 border-amber-400" : "border-l-2 border-transparent"}`}
              >
                <code className={`block px-3 py-px whitespace-pre ${isMatch ? "text-amber-100" : "text-slate-400"}`}>
                  {line || " "}
                </code>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

function HttpHeadersBlock({
  artifact,
  t,
}: {
  artifact: AssessmentEvidenceArtifact;
  t: TranslateFn;
}) {
  const presentMarker = t("evidence.present");
  const rows = artifact.content.split("\n\n").filter(Boolean);

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <div className="px-3 py-2 bg-cyan-500/10 border-b border-cyan-500/20 flex items-center gap-2">
        <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        <span className="text-xs font-mono text-cyan-800 dark:text-cyan-200">{artifact.title}</span>
      </div>
      <div className="divide-y divide-border/40">
        {rows.map((row, i) => {
          const [headerLine, ...valueLines] = row.split("\n");
          const isPresent = headerLine?.includes(presentMarker) || headerLine?.includes("[presente]");
          const headerName = headerLine?.split("[")[0]?.trim() ?? headerLine;
          const value = valueLines.join("\n").replace(/^\s+/, "") || "—";
          return (
            <div key={i} className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <div className="flex items-center gap-2 sm:w-52 shrink-0">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${isPresent ? "bg-emerald-500" : "bg-red-500"}`}
                />
                <span className="text-[11px] font-mono text-foreground break-all">{headerName}</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground break-all flex-1">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScanSummaryBlock({
  artifact,
  t,
}: {
  artifact: AssessmentEvidenceArtifact;
  t: TranslateFn;
}) {
  const [open, setOpen] = useState(false);
  const filesLabel = t("evidence.filesAnalyzed");
  const preview = useMemo(() => {
    const lines = artifact.content.split("\n").filter(Boolean);
    const filesLine = lines.find((l) => l.includes(filesLabel) || l.includes("Arquivos analisados"));
    const repoLine = lines.find((l) => l.startsWith("Repositório:") || l.startsWith("Repository:"));
    return [repoLine, filesLine].filter(Boolean).join(" · ");
  }, [artifact.content, filesLabel]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ScanSearch className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono text-muted-foreground truncate">
              {preview || t("evidence.scanDetails")}
            </span>
          </div>
          {open ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-2 text-[11px] font-mono text-muted-foreground rounded-lg border border-border/40 bg-muted/10 p-3 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
          {artifact.content}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TextBlock({ artifact }: { artifact: AssessmentEvidenceArtifact }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2.5">
      <p className="text-[11px] font-mono text-muted-foreground mb-1">{artifact.title}</p>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{artifact.content}</p>
    </div>
  );
}

function ArtifactView({ artifact, t }: { artifact: AssessmentEvidenceArtifact; t: TranslateFn }) {
  if (artifact.kind === "code") return <CodeBlock artifact={artifact} t={t} />;
  if (artifact.kind === "http_headers") return <HttpHeadersBlock artifact={artifact} t={t} />;
  if (artifact.kind === "scan_summary") return <ScanSummaryBlock artifact={artifact} t={t} />;
  return <TextBlock artifact={artifact} />;
}

function EvidenceEntryPanel({
  entry,
  onExport,
  t,
  labels,
}: {
  entry: SuggestionEvidenceEntry;
  onExport: () => void;
  t: TranslateFn;
  labels: ReturnType<typeof useEnumLabels>;
}) {
  const artifacts = sortArtifactsForDisplay(entry.artifacts ?? []);
  const primaryCode = artifacts.find((a) => a.kind === "code");
  const secondaryArtifacts = artifacts.filter((a) => a !== primaryCode);
  const ScopeIcon = SCOPE_ICONS[entry.scope];
  const evidenceIsFileRef = /^[^\s:]+\.[a-z0-9]+:\d+/i.test(entry.evidence.trim());

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl border px-4 py-3 ${
          entry.compliance ? COMPLIANCE_STYLES[entry.compliance] ?? "bg-muted/30 border-border/50" : "bg-muted/20 border-border/50"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <ScopeIcon className="w-4 h-4 shrink-0 opacity-80" />
          <span className="text-sm font-medium">{labels.scope(entry.scope)}</span>
          <Badge variant="secondary" className="font-mono text-[10px] h-5">
            {t("evidence.confidence", { percent: entry.confidence })}
          </Badge>
          {entry.compliance && (
            <Badge variant="outline" className="font-mono text-[10px] h-5">
              {labels.compliance(entry.compliance)}
            </Badge>
          )}
        </div>
        <p className="text-sm leading-relaxed">{entry.rationale}</p>
        {!evidenceIsFileRef && (
          <p className="text-xs text-muted-foreground mt-2 font-mono">{entry.evidence}</p>
        )}
        {evidenceIsFileRef && !primaryCode && (
          <p className="text-xs font-mono mt-2 flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300">
            <FileCode2 className="w-3 h-3" />
            {entry.evidence}
          </p>
        )}
      </div>

      {primaryCode && (
        <div className="space-y-2">
          <p className="text-xs font-mono text-primary flex items-center gap-1.5">
            <FileCode2 className="w-3.5 h-3.5" />
            {t("evidence.supportingSnippet")}
          </p>
          <CodeBlock artifact={primaryCode} t={t} />
        </div>
      )}

      {secondaryArtifacts.length > 0 && (
        <div className="space-y-3">
          {secondaryArtifacts.length === 1 && secondaryArtifacts[0].kind !== "scan_summary" ? null : (
            <p className="text-xs font-mono text-muted-foreground">{t("evidence.additionalContext")}</p>
          )}
          {secondaryArtifacts.map((artifact, i) => (
            <ArtifactView key={`${artifact.kind}-${i}`} artifact={artifact} t={t} />
          ))}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-mono text-xs h-8"
          onClick={onExport}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          {t("evidence.exportPng")}
        </Button>
      </div>
    </div>
  );
}

export default function SuggestionEvidenceDialog({
  open,
  onOpenChange,
  itemCode,
  itemTitle,
  entries,
}: SuggestionEvidenceDialogProps) {
  const { t } = useLocale();
  const labels = useEnumLabels();

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const ta = a.assessedAt ? Date.parse(a.assessedAt) : 0;
        const tb = b.assessedAt ? Date.parse(b.assessedAt) : 0;
        return tb - ta;
      }),
    [entries]
  );

  const defaultTab = sortedEntries[0]?.scope ?? "git_repo";

  const handleExport = (entry: SuggestionEvidenceEntry) => {
    const dataUrl = exportEvidencePng({
      itemCode,
      itemTitle,
      scope: entry.scope,
      confidence: entry.confidence,
      evidence: entry.evidence,
      rationale: entry.rationale,
      artifacts: entry.artifacts ?? [],
      labels: {
        header: t("evidence.pngHeader", { code: itemCode }),
        scopeLine: `${labels.scope(entry.scope)} · ${t("evidence.confidence", { percent: entry.confidence })}`,
        evidenceTitle: t("common.evidence"),
        rationaleTitle: t("evidence.rationale"),
      },
    });
    if (dataUrl) {
      downloadDataUrl(dataUrl, `evidencia-${itemCode}-${entry.scope}.png`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50 shrink-0">
          <DialogTitle className="font-mono text-base flex items-center gap-2 pr-6">
            <FileSearch className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{t("evidence.title", { code: itemCode })}</span>
          </DialogTitle>
          <DialogDescription className="text-sm">{itemTitle}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4">
            {sortedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("evidence.empty")}</p>
            ) : sortedEntries.length === 1 ? (
              <EvidenceEntryPanel
                entry={sortedEntries[0]}
                onExport={() => handleExport(sortedEntries[0])}
                t={t}
                labels={labels}
              />
            ) : (
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 mb-4">
                  {sortedEntries.map((entry) => {
                    const Icon = SCOPE_ICONS[entry.scope];
                    return (
                      <TabsTrigger
                        key={entry.scope}
                        value={entry.scope}
                        className="font-mono text-xs flex-1 min-w-[7rem] gap-1.5"
                      >
                        <Icon className="w-3 h-3" />
                        {labels.scopeShort(entry.scope)}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {sortedEntries.map((entry) => (
                  <TabsContent key={entry.scope} value={entry.scope} className="mt-0">
                    <EvidenceEntryPanel
                      entry={entry}
                      onExport={() => handleExport(entry)}
                      t={t}
                      labels={labels}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </ScrollArea>

        {sortedEntries.length > 0 && (
          <div className="px-5 py-2.5 border-t border-border/50 bg-muted/15 text-[10px] text-muted-foreground font-mono shrink-0">
            {t("evidence.validateManually")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EvidenceIconButton({
  onClick,
  title,
}: {
  onClick: () => void;
  title?: string;
}) {
  const { t } = useLocale();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 px-2 font-mono text-[10px] text-cyan-700 dark:text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
      title={title ?? t("evidence.viewSuggestion")}
      onClick={onClick}
    >
      <FileSearch className="w-3 h-3 mr-1" />
      {t("common.evidence")}
    </Button>
  );
}
