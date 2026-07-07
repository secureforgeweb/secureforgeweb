CREATE TABLE IF NOT EXISTS "analysis_item_evidence" (
  "id" serial PRIMARY KEY NOT NULL,
  "analysis_id" integer NOT NULL REFERENCES "analyses"("id") ON DELETE CASCADE,
  "item_id" integer NOT NULL,
  "scope" varchar(32) NOT NULL,
  "source" varchar(16) NOT NULL,
  "compliance" "compliance" NOT NULL,
  "confidence" integer NOT NULL,
  "evidence" text NOT NULL,
  "rationale" text NOT NULL,
  "artifacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "assessed_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "analysis_item_evidence_unique" UNIQUE("analysis_id", "item_id", "scope")
);

CREATE INDEX IF NOT EXISTS "analysis_item_evidence_analysis_idx"
  ON "analysis_item_evidence" ("analysis_id");
