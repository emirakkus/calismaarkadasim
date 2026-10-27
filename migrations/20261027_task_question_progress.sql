BEGIN;

ALTER TABLE "question_logs"
  ADD COLUMN IF NOT EXISTS "task_id" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'question_logs_task_id_tasks_id_fk'
      AND conrelid = 'public.question_logs'::regclass
  ) THEN
    ALTER TABLE "question_logs"
      ADD CONSTRAINT "question_logs_task_id_tasks_id_fk"
      FOREIGN KEY ("task_id")
      REFERENCES "public"."tasks"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "question_logs_task_id_unique"
  ON "question_logs" USING btree ("task_id");

COMMIT;
