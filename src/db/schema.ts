import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Kullanıcılar
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Oturumlar (httpOnly cookie içindeki token ile eşleşir)
export const authSessions = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Dersler (haftalık sabit program herkes için ortaktır -> global)
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#2563eb"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Haftalık sabit ders programı (programdan birebir alınır)
export const scheduleSlots = pgTable("schedule_slots", {
  id: serial("id").primaryKey(),
  // 1 = Pazartesi ... 7 = Pazar
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(), // "10.00"
  endTime: text("end_time").notNull(), // "10.40"
  slotOrder: integer("slot_order").notNull(), // gün içindeki sıra
  subjectName: text("subject_name").notNull(),
  teacher: text("teacher"),
});

// Konular ve programdaki sıraları (kullanıcı tarafından eklenir)
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(60),
  // pending | in_progress | completed
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Günlük çalışma görevleri
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(), // YYYY-MM-DD
  subjectId: integer("subject_id").references(() => subjects.id, {
    onDelete: "set null",
  }),
  subjectName: text("subject_name").notNull(),
  topicId: integer("topic_id").references(() => topics.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull().default(40),
  questionGoal: integer("question_goal").notNull().default(0),
  // pending | in_progress | completed | postponed
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  orderIndex: integer("order_index").notNull().default(0),
  // low | normal | high
  priority: text("priority").notNull().default("normal"),
  isPinned: boolean("is_pinned").notNull().default(false),
  completedAt: timestamp("completed_at"),
  // schedule | manual
  source: text("source").notNull().default("manual"),
  // programdan türetilen görevler için tekrar oluşturmayı engeller
  slotId: integer("slot_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Çözülen soru kayıtları (doğru/yanlış/boş kullanıcı tarafından girilir)
export const questionLogs = pgTable("question_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  subjectId: integer("subject_id").references(() => subjects.id, {
    onDelete: "set null",
  }),
  subjectName: text("subject_name").notNull(),
  topicId: integer("topic_id").references(() => topics.id, {
    onDelete: "set null",
  }),
  total: integer("total").notNull().default(0),
  correct: integer("correct").notNull().default(0),
  wrong: integer("wrong").notNull().default(0),
  blank: integer("blank").notNull().default(0),
  // Kullanıcı yalnızca toplamı mı girdi, yoksa dağılımı da mı?
  breakdownAvailable: boolean("breakdown_available").notNull().default(false),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Çalışma oturumları ve süreleri
export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  subjectId: integer("subject_id").references(() => subjects.id, {
    onDelete: "set null",
  }),
  subjectName: text("subject_name").notNull(),
  taskId: integer("task_id").references(() => tasks.id, {
    onDelete: "set null",
  }),
  topicId: integer("topic_id").references(() => topics.id, {
    onDelete: "set null",
  }),
  minutes: integer("minutes").notNull().default(0),
  // manual | pomodoro
  sessionType: text("session_type").notNull().default("manual"),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  // completed | cancelled
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Günlük hedefler (varsayılanı ezmek için)
export const dailyGoals = pgTable(
  "daily_goals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    questionGoal: integer("question_goal").notNull().default(0),
    minutesGoal: integer("minutes_goal").notNull().default(0),
  },
  (table) => ({
    userDateIdx: uniqueIndex("daily_goals_user_date_idx").on(
      table.userId,
      table.date,
    ),
  }),
);

// Uygulama ayarları + hatırlatma tercihleri (kullanıcı başına bir kayıt)
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull().default(""),
  reminderEnabled: boolean("reminder_enabled").notNull().default(false),
  reminderTime: text("reminder_time").notNull().default("19:00"),
  defaultDailyQuestionGoal: integer("default_daily_question_goal")
    .notNull()
    .default(120),
  defaultDailyMinutesGoal: integer("default_daily_minutes_goal")
    .notNull()
    .default(240),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Yapay zekâ koçu etkileşimleri
export const coachMessages = pgTable("coach_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // user | assistant
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Sınav ayarı (tekil kayıt)
export const examSettings = pgTable("exam_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  examName: text("exam_name").notNull().default(""),
  examDate: date("exam_date"),
  weakThreshold: integer("weak_threshold").notNull().default(60),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Çalışma serisi (tekil kayıt, kayıtlardan yeniden hesaplanabilir)
export const studyStreak = pgTable("study_streak", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastStudyDate: date("last_study_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Akıllı tekrar görevleri
export const reviewTasks = pgTable(
  "review_tasks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    subjectName: text("subject_name").notNull(),
    topicName: text("topic_name").notNull(),
    // kaçıncı tekrar aşaması (1,2,3,...)
    stage: integer("stage").notNull().default(1),
    scheduledDate: date("scheduled_date").notNull(),
    // pending | completed | postponed
    status: text("status").notNull().default("pending"),
    // easy | medium | hard (tamamlanınca)
    recallRating: text("recall_rating"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // Aynı konu + aynı aşama için bekleyen mükerrer kayıt engeli
    topicStageIdx: uniqueIndex("review_topic_stage_idx").on(
      table.topicId,
      table.stage,
    ),
  }),
);

// Kişisel notlar
export const studyNotes = pgTable("study_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjects.id, {
    onDelete: "set null",
  }),
  subjectName: text("subject_name"),
  topicId: integer("topic_id").references(() => topics.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  tags: text("tags").notNull().default(""),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Yanlış defteri
export const wrongQuestions = pgTable("wrong_questions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjects.id, {
    onDelete: "set null",
  }),
  subjectName: text("subject_name"),
  topicId: integer("topic_id").references(() => topics.id, {
    onDelete: "set null",
  }),
  questionText: text("question_text").notNull(),
  userAnswer: text("user_answer"),
  correctAnswer: text("correct_answer"),
  mistakeReason: text("mistake_reason"),
  explanation: text("explanation"),
  // open | reviewed
  reviewStatus: text("review_status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Subject = typeof subjects.$inferSelect;
export type ScheduleSlot = typeof scheduleSlots.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type QuestionLog = typeof questionLogs.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type DailyGoal = typeof dailyGoals.$inferSelect;
// Hedefler
export const studyGoals = pgTable("study_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  // questions | topics | minutes | mock | review | custom
  goalType: text("goal_type").notNull().default("questions"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  targetValue: integer("target_value").notNull().default(0),
  // custom türü için elle güncellenen değer
  manualValue: integer("manual_value").notNull().default(0),
  // auto | manual — otomatik türlerde ilerleme kayıtlardan hesaplanır
  tracking: text("tracking").notNull().default("auto"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Kilometre taşları (bir hedefin ara aşamaları)
export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => studyGoals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  targetValue: integer("target_value").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Günlük enerji / motivasyon kayıtları
export const energyLogs = pgTable("energy_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  energy: integer("energy").notNull(), // 1-5
  motivation: integer("motivation").notNull(), // 1-5
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Settings = typeof settings.$inferSelect;
export type CoachMessage = typeof coachMessages.$inferSelect;
export type ExamSetting = typeof examSettings.$inferSelect;
export type StudyStreak = typeof studyStreak.$inferSelect;
export type ReviewTask = typeof reviewTasks.$inferSelect;
export type StudyNote = typeof studyNotes.$inferSelect;
export type WrongQuestion = typeof wrongQuestions.$inferSelect;
export type StudyGoal = typeof studyGoals.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type EnergyLog = typeof energyLogs.$inferSelect;
export type User = typeof users.$inferSelect;
export type AuthSession = typeof authSessions.$inferSelect;
