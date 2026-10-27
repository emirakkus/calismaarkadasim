import { db } from "@/db";
import {
  tasks,
  topics,
  subjects,
  questionLogs,
  studySessions,
  dailyGoals,
  settings,
} from "@/db/schema";
import { and, eq, gte, lte, sql, asc } from "drizzle-orm";
import { addDays, weekDates, dayNameTR } from "@/lib/date";
import { programProgressPercent } from "@/lib/program-progress";

export type ProgramProgress = {
  totalTopics: number;
  completedTopics: number;
  totalTasks: number;
  completedTasks: number;
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

/** Program ilerlemesi: tamamlanan konu ve ertelenmemiş günlük görevlerin oranı. */
export async function getProgramProgress(
  userId: number,
): Promise<ProgramProgress> {
  const [subs, rows, taskRows] = await Promise.all([
    db.select().from(subjects).orderBy(asc(subjects.name)),
    db
      .select({
        subjectId: topics.subjectId,
        total: sql<number>`count(*)::int`,
        completed: sql<number>`sum(case when ${topics.status} = 'completed' then 1 else 0 end)::int`,
      })
      .from(topics)
      .where(eq(topics.userId, userId))
      .groupBy(topics.subjectId),
    db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${tasks.status} = 'completed')::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), sql`${tasks.status} <> 'postponed'`)),
  ]);

  const byId = new Map(rows.map((r) => [r.subjectId, r]));

  const perSubject = subs
    .map((s) => {
      const r = byId.get(s.id);
      const total = r?.total ?? 0;
      const completed = r?.completed ?? 0;
      return {
        subjectId: s.id,
        subjectName: s.name,
        color: s.color,
        total,
        completed,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.percent - a.percent);

  const totalTopics = perSubject.reduce((a, s) => a + s.total, 0);
  const completedTopics = perSubject.reduce((a, s) => a + s.completed, 0);
  const totalTasks = taskRows[0]?.total ?? 0;
  const completedTasks = taskRows[0]?.completed ?? 0;

  return {
    totalTopics,
    completedTopics,
    totalTasks,
    completedTasks,
    percent: programProgressPercent(
      totalTopics,
      completedTopics,
      totalTasks,
      completedTasks,
    ),
    perSubject,
  };
}

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

export async function getEffectiveGoals(
  userId: number,
  date: string,
): Promise<{ questionGoal: number; minutesGoal: number }> {
  const override = await db
    .select()
    .from(dailyGoals)
    .where(and(eq(dailyGoals.userId, userId), eq(dailyGoals.date, date)))
    .limit(1);
  if (override[0]) {
    return {
      questionGoal: override[0].questionGoal,
      minutesGoal: override[0].minutesGoal,
    };
  }
  const s = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);
  return {
    questionGoal: s[0]?.defaultDailyQuestionGoal ?? 120,
    minutesGoal: s[0]?.defaultDailyMinutesGoal ?? 240,
  };
}

export async function getDailySummary(
  userId: number,
  date: string,
): Promise<DailySummary> {
  const q = await db
    .select({
      total: sql<number>`coalesce(sum(${questionLogs.total}),0)::int`,
      correct: sql<number>`coalesce(sum(${questionLogs.correct}),0)::int`,
      wrong: sql<number>`coalesce(sum(${questionLogs.wrong}),0)::int`,
      blank: sql<number>`coalesce(sum(${questionLogs.blank}),0)::int`,
    })
    .from(questionLogs)
    .where(and(eq(questionLogs.userId, userId), eq(questionLogs.date, date)));

  const m = await db
    .select({
      minutes: sql<number>`coalesce(sum(${studySessions.minutes}),0)::int`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        eq(studySessions.date, date),
        eq(studySessions.status, "completed"),
      ),
    );

  const t = await db
    .select({ status: tasks.status, count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.date, date)))
    .groupBy(tasks.status);

  const counts = { completed: 0, in_progress: 0, pending: 0, postponed: 0 };
  let tasksTotal = 0;
  for (const row of t) {
    tasksTotal += row.count;
    if (row.status in counts) {
      counts[row.status as keyof typeof counts] = row.count;
    }
  }

  const goals = await getEffectiveGoals(userId, date);

  return {
    date,
    questionsTotal: q[0]?.total ?? 0,
    questionsCorrect: q[0]?.correct ?? 0,
    questionsWrong: q[0]?.wrong ?? 0,
    questionsBlank: q[0]?.blank ?? 0,
    minutesStudied: m[0]?.minutes ?? 0,
    questionGoal: goals.questionGoal,
    minutesGoal: goals.minutesGoal,
    tasksTotal,
    tasksCompleted: counts.completed,
    tasksInProgress: counts.in_progress,
    tasksPending: counts.pending,
    tasksPostponed: counts.postponed,
  };
}

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

async function sumQuestions(userId: number, from: string, to: string) {
  const r = await db
    .select({
      total: sql<number>`coalesce(sum(${questionLogs.total}),0)::int`,
    })
    .from(questionLogs)
    .where(
      and(
        eq(questionLogs.userId, userId),
        gte(questionLogs.date, from),
        lte(questionLogs.date, to),
      ),
    );
  return r[0]?.total ?? 0;
}

async function sumMinutes(userId: number, from: string, to: string) {
  const r = await db
    .select({
      minutes: sql<number>`coalesce(sum(${studySessions.minutes}),0)::int`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        eq(studySessions.status, "completed"),
        gte(studySessions.date, from),
        lte(studySessions.date, to),
      ),
    );
  return r[0]?.minutes ?? 0;
}

export async function getWeeklyStats(
  userId: number,
  weekStart: string,
): Promise<WeeklyStats> {
  const dates = weekDates(weekStart);
  const weekEnd = dates[6];

  const perDay = await Promise.all(
    dates.map(async (d) => {
      const q = await db
        .select({
          total: sql<number>`coalesce(sum(${questionLogs.total}),0)::int`,
          correct: sql<number>`coalesce(sum(${questionLogs.correct}),0)::int`,
        })
        .from(questionLogs)
        .where(and(eq(questionLogs.userId, userId), eq(questionLogs.date, d)));
      const m = await db
        .select({
          minutes: sql<number>`coalesce(sum(${studySessions.minutes}),0)::int`,
        })
        .from(studySessions)
        .where(
          and(
            eq(studySessions.userId, userId),
            eq(studySessions.date, d),
            eq(studySessions.status, "completed"),
          ),
        );
      return {
        date: d,
        dayName: dayNameTR(d),
        questions: q[0]?.total ?? 0,
        correct: q[0]?.correct ?? 0,
        minutes: m[0]?.minutes ?? 0,
      };
    }),
  );

  const perSubjectMinutes = await db
    .select({
      subjectName: studySessions.subjectName,
      minutes: sql<number>`coalesce(sum(${studySessions.minutes}),0)::int`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        eq(studySessions.status, "completed"),
        gte(studySessions.date, weekStart),
        lte(studySessions.date, weekEnd),
      ),
    )
    .groupBy(studySessions.subjectName)
    .orderBy(sql`sum(${studySessions.minutes}) desc`);

  const subjectQ = await db
    .select({
      subjectName: questionLogs.subjectName,
      total: sql<number>`coalesce(sum(${questionLogs.total}),0)::int`,
      correct: sql<number>`coalesce(sum(${questionLogs.correct}),0)::int`,
      wrong: sql<number>`coalesce(sum(${questionLogs.wrong}),0)::int`,
      blank: sql<number>`coalesce(sum(${questionLogs.blank}),0)::int`,
    })
    .from(questionLogs)
    .where(
      and(
        eq(questionLogs.userId, userId),
        gte(questionLogs.date, weekStart),
        lte(questionLogs.date, weekEnd),
      ),
    )
    .groupBy(questionLogs.subjectName);

  const perSubjectQuestions = subjectQ.map((s) => {
    const graded = s.correct + s.wrong;
    return {
      ...s,
      accuracy: graded >= 10 ? Math.round((s.correct / graded) * 100) : null,
    };
  });

  const hardestSubjects = perSubjectQuestions
    .filter((s) => s.accuracy !== null)
    .map((s) => ({
      subjectName: s.subjectName,
      accuracy: s.accuracy as number,
      total: s.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  const totals = perSubjectQuestions.reduce(
    (acc, s) => {
      acc.total += s.total;
      acc.correct += s.correct;
      acc.wrong += s.wrong;
      acc.blank += s.blank;
      return acc;
    },
    { total: 0, correct: 0, wrong: 0, blank: 0 },
  );

  const totalMinutes = perSubjectMinutes.reduce((a, s) => a + s.minutes, 0);
  const graded = totals.correct + totals.wrong;

  const taskStats = await db
    .select({ status: tasks.status, count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        gte(tasks.date, weekStart),
        lte(tasks.date, weekEnd),
      ),
    )
    .groupBy(tasks.status);
  let tasksTotal = 0;
  let tasksCompleted = 0;
  for (const row of taskStats) {
    tasksTotal += row.count;
    if (row.status === "completed") tasksCompleted = row.count;
  }

  const prevStart = addDays(weekStart, -7);
  const prevEnd = addDays(weekStart, -1);
  const prevWeekQuestions = await sumQuestions(userId, prevStart, prevEnd);
  const prevWeekMinutes = await sumMinutes(userId, prevStart, prevEnd);

  return {
    weekStart,
    weekEnd,
    perDay,
    perSubjectMinutes,
    perSubjectQuestions,
    hardestSubjects,
    totalQuestions: totals.total,
    totalCorrect: totals.correct,
    totalWrong: totals.wrong,
    totalBlank: totals.blank,
    totalMinutes,
    accuracy: graded >= 10 ? Math.round((totals.correct / graded) * 100) : null,
    tasksCompleted,
    tasksTotal,
    prevWeekQuestions,
    prevWeekMinutes,
  };
}
