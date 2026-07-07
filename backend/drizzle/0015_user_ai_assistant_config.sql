CREATE TABLE IF NOT EXISTS "user_ai_assistant_configs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" varchar(32) DEFAULT 'openai' NOT NULL,
  "api_key" text NOT NULL,
  "model" varchar(120) NOT NULL,
  "base_url" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_ai_assistant_configs_user_id_idx"
  ON "user_ai_assistant_configs" ("user_id");
