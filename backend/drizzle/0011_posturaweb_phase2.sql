CREATE TYPE "public"."compliance" AS ENUM('conforme', 'parcial', 'nao_conforme', 'nao_aplicavel');--> statement-breakpoint
CREATE TYPE "public"."analysis_status" AS ENUM('rascunho', 'em_andamento', 'concluida');--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicationId" integer NOT NULL,
	"userId" integer NOT NULL,
	"checklistId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" "analysis_status" DEFAULT 'rascunho' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysisId" integer NOT NULL,
	"itemId" integer NOT NULL,
	"compliance" "compliance" NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_responses_analysis_item_unique" ON "checklist_responses" ("analysisId","itemId");
