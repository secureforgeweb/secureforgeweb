CREATE TABLE IF NOT EXISTS "analysis_assessment_runs" (
  "id" serial PRIMARY KEY NOT NULL,
  "analysis_id" integer NOT NULL REFERENCES "analyses"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "scope" varchar(32) NOT NULL,
  "assessment_mode" varchar(32),
  "provider" varchar(120),
  "items_assessed" integer DEFAULT 0 NOT NULL,
  "context_summary" text,
  "assessed_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "analysis_assessment_runs_analysis_id_idx"
  ON "analysis_assessment_runs" ("analysis_id");

CREATE INDEX IF NOT EXISTS "analysis_assessment_runs_user_id_idx"
  ON "analysis_assessment_runs" ("user_id");
