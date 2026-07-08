DO $$ BEGIN
  CREATE TYPE "checklist_profile" AS ENUM('essential', 'asvs_l1', 'asvs_l2', 'asvs_l3', 'asvs_full');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "checklist_source" AS ENUM('local', 'owasp_asvs');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "automation_profile" AS ENUM('http', 'git', 'ai', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "checklists" ADD COLUMN IF NOT EXISTS "profile" "checklist_profile" DEFAULT 'essential' NOT NULL;--> statement-breakpoint
ALTER TABLE "checklists" ADD COLUMN IF NOT EXISTS "source" "checklist_source" DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "checklists" ADD COLUMN IF NOT EXISTS "sourceVersion" varchar(20);--> statement-breakpoint
ALTER TABLE "checklists" ADD COLUMN IF NOT EXISTS "externalId" varchar(64);--> statement-breakpoint
ALTER TABLE "checklists" ADD COLUMN IF NOT EXISTS "isDefault" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "checklists" ADD COLUMN IF NOT EXISTS "itemCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "checklists" ADD COLUMN IF NOT EXISTS "syncedAt" timestamp;--> statement-breakpoint
UPDATE "checklists" SET "profile" = 'essential', "source" = 'local', "isDefault" = true WHERE "version" = '1.0' AND "isDefault" = false;--> statement-breakpoint
ALTER TABLE "checklist_categories" ADD COLUMN IF NOT EXISTS "checklistId" integer REFERENCES "checklists"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "checklist_categories" ADD COLUMN IF NOT EXISTS "chapterId" varchar(10);--> statement-breakpoint
ALTER TABLE "checklist_categories" ADD COLUMN IF NOT EXISTS "externalSectionId" varchar(20);--> statement-breakpoint
UPDATE "checklist_categories" cc
SET "checklistId" = (SELECT id FROM "checklists" WHERE "version" = '1.0' ORDER BY id LIMIT 1)
WHERE "checklistId" IS NULL;--> statement-breakpoint
ALTER TABLE "checklist_categories" DROP CONSTRAINT IF EXISTS "checklist_categories_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "checklist_categories_checklist_name_unique"
  ON "checklist_categories" ("checklistId", "name");--> statement-breakpoint
ALTER TABLE "checklist_items" ALTER COLUMN "code" TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "asvsId" varchar(32);--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "verificationLevel" integer;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "sectionName" varchar(255);--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "automationProfile" "automation_profile";--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "essentialCode" varchar(20);--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "externalSource" varchar(32) DEFAULT 'local';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "checklist_items_checklist_code_unique"
  ON "checklist_items" ("checklistId", "code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checklist_items_asvs_id_idx"
  ON "checklist_items" ("asvsId") WHERE "asvsId" IS NOT NULL;
