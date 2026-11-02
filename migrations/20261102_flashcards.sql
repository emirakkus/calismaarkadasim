CREATE TABLE IF NOT EXISTS "flashcards" (
  "id" text PRIMARY KEY NOT NULL,
  "exam_type" text NOT NULL,
  "subject_name" text NOT NULL,
  "topic_name" text NOT NULL,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "explanation" text NOT NULL,
  "difficulty" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "flashcard_progress" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "card_id" text NOT NULL REFERENCES "flashcards"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'new' NOT NULL,
  "interval_days" integer DEFAULT 0 NOT NULL,
  "repetitions" integer DEFAULT 0 NOT NULL,
  "due_date" date,
  "last_reviewed_at" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "flashcard_progress_user_card_idx"
  ON "flashcard_progress" ("user_id", "card_id");
CREATE INDEX IF NOT EXISTS "flashcard_progress_user_due_idx"
  ON "flashcard_progress" ("user_id", "due_date");

CREATE TABLE IF NOT EXISTS "flashcard_favorites" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "card_id" text NOT NULL REFERENCES "flashcards"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "flashcard_favorites_user_card_idx"
  ON "flashcard_favorites" ("user_id", "card_id");

CREATE TABLE IF NOT EXISTS "flashcard_daily_study" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "card_id" text NOT NULL REFERENCES "flashcards"("id") ON DELETE CASCADE,
  "study_date" date NOT NULL,
  "rating" text NOT NULL,
  "reviewed_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "flashcard_daily_study_user_date_card_idx"
  ON "flashcard_daily_study" ("user_id", "study_date", "card_id");

CREATE TABLE IF NOT EXISTS "flashcard_review_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "card_id" text NOT NULL REFERENCES "flashcards"("id") ON DELETE CASCADE,
  "rating" text NOT NULL,
  "interval_days" integer NOT NULL,
  "reviewed_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "flashcard_review_history_user_card_idx"
  ON "flashcard_review_history" ("user_id", "card_id", "reviewed_at");
