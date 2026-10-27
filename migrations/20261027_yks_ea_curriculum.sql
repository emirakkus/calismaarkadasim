ALTER TABLE "settings"
ADD COLUMN IF NOT EXISTS "curriculum_version" integer DEFAULT 0 NOT NULL;
