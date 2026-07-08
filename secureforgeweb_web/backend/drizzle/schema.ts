import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["user", "security-analyst", "admin"]);

export const incidentCategoryEnum = pgEnum("incident_category", [
  "phishing",
  "malware",
  "brute_force",
  "ddos",
  "vazamento_de_dados",
  "engenharia_social",
  "unknown",
]);

export const riskLevelEnum = pgEnum("risk_level", ["critical", "high", "medium", "low"]);

export const incidentStatusEnum = pgEnum("incident_status", ["open", "in_progress", "resolved"]);

export const historyActionEnum = pgEnum("history_action", [
  "status_changed",
  "notes_updated",
  "category_changed",
  "risk_changed",
  "created",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "reclassification",
  "status_changed",
  "risk_changed",
  "system",
]);

// ─── Users ─────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn", { mode: "date" }).defaultNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Incidents ─────────────────────────────────────────────────────────────
export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: incidentCategoryEnum("category").default("unknown").notNull(),
  riskLevel: riskLevelEnum("riskLevel").default("medium").notNull(),
  confidence: real("confidence").default(0),
  status: incidentStatusEnum("status").default("open").notNull(),
  notes: text("notes"),
  resolvedAt: timestamp("resolvedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = typeof incidents.$inferInsert;

// ─── Categories ────────────────────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 32 }).default("#22d3ee"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ─── Incident History ────────────────────────────────────────────────────────
export const incidentHistory = pgTable("incident_history", {
  id: serial("id").primaryKey(),
  incidentId: integer("incidentId").notNull(),
  userId: integer("userId").notNull(),
  action: historyActionEnum("action").notNull(),
  fromValue: varchar("fromValue", { length: 255 }),
  toValue: varchar("toValue", { length: 255 }),
  comment: text("comment"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
export type IncidentHistory = typeof incidentHistory.$inferSelect;
export type InsertIncidentHistory = typeof incidentHistory.$inferInsert;

// ─── In-App Notifications ─────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  incidentId: integer("incidentId"),
  findingId: integer("findingId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Password Reset Tokens ──────────────────────────────────────────────────
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  usedAt: timestamp("usedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// ─── PosturaWeb: Applications & Checklist ───────────────────────────────────
export const severityEnum = pgEnum("severity", ["critical", "high", "medium", "low"]);

export const checklistProfileEnum = pgEnum("checklist_profile", [
  "essential",
  "asvs_l1",
  "asvs_l2",
  "asvs_l3",
  "asvs_full",
]);

export const checklistSourceEnum = pgEnum("checklist_source", ["local", "owasp_asvs"]);

export const automationProfileEnum = pgEnum("automation_profile", ["http", "git", "ai", "manual"]);

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  baseUrl: varchar("baseUrl", { length: 500 }),
  repositoryUrl: varchar("repositoryUrl", { length: 500 }),
  description: text("description"),
  techStack: varchar("techStack", { length: 255 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  profile: checklistProfileEnum("profile").default("essential").notNull(),
  source: checklistSourceEnum("source").default("local").notNull(),
  sourceVersion: varchar("sourceVersion", { length: 20 }),
  externalId: varchar("externalId", { length: 64 }),
  isActive: boolean("isActive").default(true).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  itemCount: integer("itemCount").default(0).notNull(),
  syncedAt: timestamp("syncedAt", { mode: "date" }),
  namePt: varchar("namePt", { length: 150 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
export type Checklist = typeof checklists.$inferSelect;
export type InsertChecklist = typeof checklists.$inferInsert;

export const checklistCategories = pgTable(
  "checklist_categories",
  {
    id: serial("id").primaryKey(),
    checklistId: integer("checklistId").references(() => checklists.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 32 }).default("#22d3ee"),
    sortOrder: integer("sortOrder").default(0).notNull(),
    chapterId: varchar("chapterId", { length: 10 }),
    externalSectionId: varchar("externalSectionId", { length: 20 }),
    namePt: varchar("namePt", { length: 100 }),
    descriptionPt: text("descriptionPt"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [unique("checklist_categories_checklist_name_unique").on(table.checklistId, table.name)]
);
export type ChecklistCategory = typeof checklistCategories.$inferSelect;
export type InsertChecklistCategory = typeof checklistCategories.$inferInsert;

export const checklistItems = pgTable(
  "checklist_items",
  {
    id: serial("id").primaryKey(),
    checklistId: integer("checklistId").notNull(),
    categoryId: integer("categoryId").notNull(),
    code: varchar("code", { length: 32 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    owaspRef: varchar("owaspRef", { length: 100 }),
    asvsId: varchar("asvsId", { length: 32 }),
    verificationLevel: integer("verificationLevel"),
    sectionName: varchar("sectionName", { length: 255 }),
    sectionNamePt: varchar("sectionNamePt", { length: 255 }),
    automationProfile: automationProfileEnum("automationProfile"),
    essentialCode: varchar("essentialCode", { length: 20 }),
    externalSource: varchar("externalSource", { length: 32 }).default("local"),
    titlePt: varchar("titlePt", { length: 255 }),
    descriptionPt: text("descriptionPt"),
    suggestedSeverity: severityEnum("suggestedSeverity").default("medium").notNull(),
    sortOrder: integer("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [unique("checklist_items_checklist_code_unique").on(table.checklistId, table.code)]
);
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

export const defaultRecommendations = pgTable("default_recommendations", {
  id: serial("id").primaryKey(),
  itemId: integer("itemId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  action: text("action").notNull(),
  reference: varchar("reference", { length: 255 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
export type DefaultRecommendation = typeof defaultRecommendations.$inferSelect;
export type InsertDefaultRecommendation = typeof defaultRecommendations.$inferInsert;

// ─── PosturaWeb: Analyses & Checklist Responses (Fase 2) ────────────────────
export const complianceEnum = pgEnum("compliance", [
  "conforme",
  "parcial",
  "nao_conforme",
  "nao_aplicavel",
]);

export const analysisStatusEnum = pgEnum("analysis_status", [
  "rascunho",
  "em_andamento",
  "concluida",
]);

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  applicationId: integer("applicationId").notNull(),
  userId: integer("userId").notNull(),
  checklistId: integer("checklistId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: analysisStatusEnum("status").default("rascunho").notNull(),
  startedAt: timestamp("startedAt", { mode: "date" }).defaultNow().notNull(),
  completedAt: timestamp("completedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;

export const checklistResponses = pgTable("checklist_responses", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysisId").notNull(),
  itemId: integer("itemId").notNull(),
  compliance: complianceEnum("compliance").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type ChecklistResponse = typeof checklistResponses.$inferSelect;
export type InsertChecklistResponse = typeof checklistResponses.$inferInsert;

// ─── PosturaWeb: Findings (Fase 3) ───────────────────────────────────────────
export const findingStatusEnum = pgEnum("finding_status", [
  "aberto",
  "em_correcao",
  "resolvido",
  "aceito_risco",
]);

export const priorityEnum = pgEnum("priority", [
  "imediata",
  "curto_prazo",
  "medio_prazo",
  "baixa",
]);

export const findingHistoryActionEnum = pgEnum("finding_history_action", [
  "status_changed",
  "notes_updated",
  "severity_changed",
  "created",
]);

export const findings = pgTable("findings", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysisId").notNull(),
  itemId: integer("itemId"),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  severity: severityEnum("severity").default("medium").notNull(),
  priority: priorityEnum("priority").default("medio_prazo").notNull(),
  status: findingStatusEnum("status").default("aberto").notNull(),
  evidence: text("evidence"),
  notes: text("notes"),
  recommendationTitle: varchar("recommendationTitle", { length: 255 }),
  recommendationDescription: text("recommendationDescription"),
  recommendationAction: text("recommendationAction"),
  recommendationReference: varchar("recommendationReference", { length: 255 }),
  resolvedAt: timestamp("resolvedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type Finding = typeof findings.$inferSelect;
export type InsertFinding = typeof findings.$inferInsert;

export const findingHistory = pgTable("finding_history", {
  id: serial("id").primaryKey(),
  findingId: integer("findingId").notNull(),
  userId: integer("userId").notNull(),
  action: findingHistoryActionEnum("action").notNull(),
  fromValue: varchar("fromValue", { length: 255 }),
  toValue: varchar("toValue", { length: 255 }),
  comment: text("comment"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
export type FindingHistory = typeof findingHistory.$inferSelect;
export type InsertFindingHistory = typeof findingHistory.$inferInsert;

// ─── Assistente IA por usuário ───────────────────────────────────────────────
export const userAiAssistantConfigs = pgTable("user_ai_assistant_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 32 }).default("openai").notNull(),
  apiKey: text("api_key").notNull(),
  model: varchar("model", { length: 120 }).notNull(),
  baseUrl: text("base_url").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type UserAiAssistantConfig = typeof userAiAssistantConfigs.$inferSelect;
export type InsertUserAiAssistantConfig = typeof userAiAssistantConfigs.$inferInsert;

// ─── Registro de avaliações automáticas (benchmark admin) ─────────────────────
export const analysisAssessmentRuns = pgTable("analysis_assessment_runs", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  scope: varchar("scope", { length: 32 }).notNull(),
  assessmentMode: varchar("assessment_mode", { length: 32 }),
  provider: varchar("provider", { length: 120 }),
  itemsAssessed: integer("items_assessed").default(0).notNull(),
  contextSummary: text("context_summary"),
  assessedAt: timestamp("assessed_at", { mode: "date" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
export type AnalysisAssessmentRun = typeof analysisAssessmentRuns.$inferSelect;
export type InsertAnalysisAssessmentRun = typeof analysisAssessmentRuns.$inferInsert;

// ─── Evidências por item de checklist (scanner / IA) ─────────────────────────
export const analysisItemEvidence = pgTable(
  "analysis_item_evidence",
  {
    id: serial("id").primaryKey(),
    analysisId: integer("analysis_id")
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    itemId: integer("item_id").notNull(),
    scope: varchar("scope", { length: 32 }).notNull(),
    source: varchar("source", { length: 16 }).notNull(),
    compliance: complianceEnum("compliance").notNull(),
    confidence: integer("confidence").notNull(),
    evidence: text("evidence").notNull(),
    rationale: text("rationale").notNull(),
    artifacts: jsonb("artifacts").$type<unknown[]>().default([]).notNull(),
    assessedAt: timestamp("assessed_at", { mode: "date" }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueItemScope: unique("analysis_item_evidence_unique").on(
      table.analysisId,
      table.itemId,
      table.scope
    ),
  })
);
export type AnalysisItemEvidence = typeof analysisItemEvidence.$inferSelect;
export type InsertAnalysisItemEvidence = typeof analysisItemEvidence.$inferInsert;
