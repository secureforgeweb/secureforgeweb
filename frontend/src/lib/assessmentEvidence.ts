export type AssessmentEvidenceArtifact = {
  kind: "code" | "http_headers" | "scan_summary" | "text";
  title: string;
  content: string;
  language?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
};

export type AssessmentScope = "http_headers" | "git_repo" | "ai_agent";

export const SCOPE_LABELS: Record<AssessmentScope, string> = {
  http_headers: "Análise HTTP",
  git_repo: "Análise Git",
  ai_agent: "Assistente IA",
};

const ARTIFACT_DISPLAY_ORDER: Record<AssessmentEvidenceArtifact["kind"], number> = {
  code: 0,
  http_headers: 1,
  text: 2,
  scan_summary: 3,
};

export function sortArtifactsForDisplay(
  artifacts: AssessmentEvidenceArtifact[]
): AssessmentEvidenceArtifact[] {
  return [...artifacts].sort(
    (a, b) => (ARTIFACT_DISPLAY_ORDER[a.kind] ?? 9) - (ARTIFACT_DISPLAY_ORDER[b.kind] ?? 9)
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

export function exportEvidencePng(input: {
  itemCode: string;
  itemTitle: string;
  scope: AssessmentScope;
  confidence: number;
  evidence: string;
  rationale: string;
  artifacts: AssessmentEvidenceArtifact[];
}): string {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 22px ui-monospace, monospace";
  ctx.fillText(`SecureForge — Evidência ${input.itemCode}`, 32, 48);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "16px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(input.itemTitle, 32, 78);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "13px ui-monospace, monospace";
  ctx.fillText(`${SCOPE_LABELS[input.scope]} · ${input.confidence}% confiança`, 32, 102);

  let y = 132;
  const sections = [
    { title: "Evidência", body: input.evidence },
    { title: "Racional", body: input.rationale },
    ...input.artifacts.map((a) => ({ title: a.title, body: a.content })),
  ];

  for (const section of sections) {
    if (y > canvas.height - 48) break;
    ctx.fillStyle = "#67e8f9";
    ctx.font = "bold 14px ui-monospace, monospace";
    ctx.fillText(section.title, 32, y);
    y += 22;

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "12px ui-monospace, monospace";
    const lines = section.body.split("\n").slice(0, 18);
    for (const line of lines) {
      if (y > canvas.height - 24) break;
      const clipped = line.length > 110 ? `${line.slice(0, 107)}…` : line;
      ctx.fillText(clipped, 32, y);
      y += 16;
    }
    y += 10;
  }

  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}
