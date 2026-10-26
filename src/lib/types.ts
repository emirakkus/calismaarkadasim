// İstemci tarafı için düz TS tipleri (API yanıtlarıyla eşleşir).

export type Subject = { id: number; name: string; color: string };

export type ScheduleSlot = {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotOrder: number;
  subjectName: string;
  teacher: string | null;
};

export type TaskStatus = "pending" | "in_progress" | "completed" | "postponed";

export type Task = {
  id: number;
  date: string;
  subjectId: number | null;
  subjectName: string;
  topicId: number | null;
  title: string;
  estimatedMinutes: number;
  questionGoal: number;
  status: TaskStatus;
  notes: string | null;
  orderIndex: number;
  priority: "low" | "normal" | "high";
  isPinned: boolean;
  completedAt: string | null;
  source: string;
  slotId: number | null;
};

export type ReviewTask = {
  id: number;
  topicId: number;
  subjectName: string;
  topicName: string;
  stage: number;
  scheduledDate: string;
  status: "pending" | "completed" | "postponed";
  recallRating: string | null;
  completedAt: string | null;
};

export type StudyNote = {
  id: number;
  subjectId: number | null;
  subjectName: string | null;
  topicId: number | null;
  title: string;
  content: string;
  tags: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WrongQuestion = {
  id: number;
  subjectId: number | null;
  subjectName: string | null;
  topicId: number | null;
  questionText: string;
  userAnswer: string | null;
  correctAnswer: string | null;
  mistakeReason: string | null;
  explanation: string | null;
  reviewStatus: "open" | "reviewed";
  createdAt: string;
  updatedAt: string;
};

export type ExamSetting = {
  id: number;
  examName: string;
  examDate: string | null;
  weakThreshold: number;
};

export type StreakInfo = {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  weekActiveDays: number;
};

export type Milestone = {
  id: number;
  goalId: number;
  title: string;
  targetValue: number;
  isCompleted: boolean;
  orderIndex: number;
  reached?: boolean;
};

export type StudyGoal = {
  id: number;
  title: string;
  description: string | null;
  goalType: "questions" | "topics" | "minutes" | "mock" | "review" | "custom";
  startDate: string | null;
  dueDate: string | null;
  targetValue: number;
  manualValue: number;
  tracking: "auto" | "manual";
  status: string;
  currentValue: number;
  percent: number;
  isComplete: boolean;
  overdue: boolean;
  milestones: Milestone[];
};

export type EnergyLog = {
  id: number;
  date: string;
  energy: number;
  motivation: number;
  note: string | null;
};

export type CalendarDay = {
  tasks: number;
  completed: number;
  postponed: number;
  minutes: number;
  reviews: number;
};

export type WeakTopic = {
  topicId: number;
  topicName: string;
  subjectName: string;
  solved: number;
  correct: number;
  wrong: number;
  lastStudyDate: string | null;
  hasEnoughData: boolean;
  accuracy: number | null;
  daysSinceStudy: number | null;
  isWeak: boolean;
  reasons: string[];
  suggestedMinutes: number;
};

export type QuestionLog = {
  id: number;
  date: string;
  subjectId: number | null;
  subjectName: string;
  topicId: number | null;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
};

export type StudySession = {
  id: number;
  date: string;
  subjectId: number | null;
  subjectName: string;
  taskId: number | null;
  minutes: number;
};

export type DailySummary = {
  date: string;
  questionsTotal: number;
  questionsCorrect: number;
  questionsWrong: number;
  questionsBlank: number;
  minutesStudied: number;
  questionGoal: number;
  minutesGoal: number;
  tasksTotal: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksPending: number;
  tasksPostponed: number;
};

export type DayResponse = {
  date: string;
  tasks: Task[];
  questionLogs: QuestionLog[];
  sessions: StudySession[];
  summary: DailySummary;
  nextTask: Task | null;
};

export type WeeklyStats = {
  weekStart: string;
  weekEnd: string;
  perDay: {
    date: string;
    dayName: string;
    questions: number;
    correct: number;
    minutes: number;
  }[];
  perSubjectMinutes: { subjectName: string; minutes: number }[];
  perSubjectQuestions: {
    subjectName: string;
    total: number;
    correct: number;
    wrong: number;
    blank: number;
    accuracy: number | null;
  }[];
  hardestSubjects: { subjectName: string; accuracy: number; total: number }[];
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  totalBlank: number;
  totalMinutes: number;
  accuracy: number | null;
  tasksCompleted: number;
  tasksTotal: number;
  prevWeekQuestions: number;
  prevWeekMinutes: number;
};

export type Settings = {
  id: number;
  userName: string;
  reminderEnabled: boolean;
  reminderTime: string;
  defaultDailyQuestionGoal: number;
  defaultDailyMinutesGoal: number;
};

export type ProgramProgress = {
  totalTopics: number;
  completedTopics: number;
  percent: number;
  perSubject: {
    subjectId: number;
    subjectName: string;
    color: string;
    total: number;
    completed: number;
    percent: number;
  }[];
};

export type OverviewResponse = {
  date: string;
  summary: DailySummary;
  week: WeeklyStats;
  program: ProgramProgress;
  settings: Settings | null;
  tasks: Task[];
  nextTask: Task | null;
  exam: ExamSetting | null;
  examDaysLeft: number | null;
  streak: StreakInfo;
  dueReviews: ReviewTask[];
};

export type CoachMessage = {
  id: number;
  role: string;
  content: string;
  createdAt: string;
};

export type Topic = {
  id: number;
  subjectId: number;
  name: string;
  description: string | null;
  orderIndex: number;
  estimatedMinutes: number;
  status: string;
};
