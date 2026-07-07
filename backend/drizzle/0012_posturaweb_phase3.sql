CREATE TYPE "public"."finding_status" AS ENUM('aberto', 'em_correcao', 'resolvido', 'aceito_risco');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('imediata', 'curto_prazo', 'medio_prazo', 'baixa');--> statement-breakpoint
CREATE TYPE "public"."finding_history_action" AS ENUM('status_changed', 'notes_updated', 'severity_changed', 'created');--> statement-breakpoint
CREATE TABLE "findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysisId" integer NOT NULL,
	"itemId" integer,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"severity" "severity" DEFAULT 'medium' NOT NULL,
	"priority" "priority" DEFAULT 'medio_prazo' NOT NULL,
	"status" "finding_status" DEFAULT 'aberto' NOT NULL,
	"evidence" text,
	"notes" text,
	"recommendationTitle" varchar(255),
	"recommendationDescription" text,
	"recommendationAction" text,
	"recommendationReference" varchar(255),
	"resolvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finding_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"findingId" integer NOT NULL,
	"userId" integer NOT NULL,
	"action" "finding_history_action" NOT NULL,
	"fromValue" varchar(255),
	"toValue" varchar(255),
	"comment" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "findings_analysis_item_unique" ON "findings" ("analysisId","itemId") WHERE "itemId" IS NOT NULL;
