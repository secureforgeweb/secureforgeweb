import fs from "node:fs";
import path from "node:path";
import {
  buildFullChecklistAiSuggestions,
  AI_ORCHESTRATED_ITEM_CODES,
  type AiAssessmentContext,
} from "../backend/src/services/aiChecklistAssessor.js";
import type { GitRepositorySnapshot } from "../backend/src/services/gitRepoAssessor.js";

const root = path.resolve(import.meta.dirname, "..");
const files: { path: string; content: string }[] = [];
const want = [
  "backend/src/middleware/security.ts",
  "backend/src/controllers/app.router.ts",
  "backend/src/_core/trpc.ts",
  "backend/src/lib/validation.ts",
  "backend/src/lib/logRedact.ts",
  "backend/src/lib/htmlEscape.ts",
  "backend/src/lib/trpcErrors.ts",
  "backend/src/services/email.ts",
  "backend/src/services/gitRepoAssessor.ts",
  "backend/src/services/checklistAssessor.ts",
  "backend/src/services/aiChecklistAssessor.ts",
  "package.json",
  ".gitignore",
  ".env.example",
];
for (const rel of want) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) files.push({ path: rel, content: fs.readFileSync(abs, "utf8") });
}

const gitignorePaths = [
  path.join(root, ".gitignore"),
  path.join(root, "..", ".gitignore"),
];
let gitignore = "";
for (const gp of gitignorePaths) {
  if (fs.existsSync(gp)) gitignore += fs.readFileSync(gp, "utf8") + "\n";
}
if (!files.some((f) => f.path.endsWith(".gitignore")) && gitignore) {
  files.push({ path: ".gitignore", content: gitignore });
}

const gitSnapshot: GitRepositorySnapshot = {
  repositoryUrl: "https://github.com/secureforgeweb/secureforgeweb.git",
  filesScanned: files.length,
  files,
  gitignoreContent: gitignore,
};

const httpSnapshot = {
  requestedUrl: "https://localhost:3000/",
  finalUrl: "https://localhost:3000/",
  statusCode: 200,
  headers: {
    "content-security-policy": "default-src 'self'; frame-ancestors 'self'",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "x-frame-options": "SAMEORIGIN",
    "x-content-type-options": "nosniff",
  },
};

const items = AI_ORCHESTRATED_ITEM_CODES.map((code, i) => ({
  id: i + 1,
  code,
  title: code,
  description: code,
}));

const ctx: AiAssessmentContext = {
  application: {
    name: "SecureForge Web",
    baseUrl: "https://localhost:3000",
    repositoryUrl: gitSnapshot.repositoryUrl,
    techStack: "TypeScript",
    description: null,
  },
  httpSnapshot,
  gitSnapshot,
  npmAuditSummary: { critical: 0, high: 0, moderate: 1, low: 2, total: 3 },
  corpus: files.map((f) => f.content).join("\n"),
};

const suggestions = buildFullChecklistAiSuggestions(ctx, items);
const counts = { conforme: 0, parcial: 0, nao_conforme: 0, nao_aplicavel: 0 };
for (const s of suggestions) counts[s.compliance]++;
const score = Math.round(((counts.conforme + counts.nao_aplicavel) / suggestions.length) * 100);
const findings = suggestions
  .filter((s) => s.compliance === "nao_conforme" || s.compliance === "parcial")
  .map((f) => ({
    code: f.itemCode,
    compliance: f.compliance,
    confidence: f.confidence,
    evidence: f.evidence.slice(0, 160),
  }));

console.log(JSON.stringify({ score, total: suggestions.length, counts, findings }, null, 2));
