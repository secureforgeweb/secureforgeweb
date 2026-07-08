ALTER TABLE "checklists" ADD COLUMN IF NOT EXISTS "namePt" varchar(150);--> statement-breakpoint
ALTER TABLE "checklist_categories" ADD COLUMN IF NOT EXISTS "namePt" varchar(100);--> statement-breakpoint
ALTER TABLE "checklist_categories" ADD COLUMN IF NOT EXISTS "descriptionPt" text;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "titlePt" varchar(255);--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "descriptionPt" text;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "sectionNamePt" varchar(255);--> statement-breakpoint
UPDATE "checklist_items"
SET "titlePt" = title, "descriptionPt" = description
WHERE ("externalSource" IS NULL OR "externalSource" = 'local') AND "titlePt" IS NULL;--> statement-breakpoint
UPDATE "checklist_categories" cc
SET "namePt" = cc.name, "descriptionPt" = cc.description
FROM "checklists" c
WHERE cc."checklistId" = c.id AND c.profile = 'essential' AND cc."namePt" IS NULL;
