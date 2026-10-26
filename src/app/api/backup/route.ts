import { db } from "@/db";
import {
  subjects,
  topics,
  tasks,
  questionLogs,
  studySessions,
  dailyGoals,
  reviewTasks,
  studyNotes,
  wrongQuestions,
  studyGoals,
  milestones,
  energyLogs,
  examSettings,
  settings,
} from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

export const SCHEMA_VERSION = 2;

/** Tüm kullanıcı verisini JSON olarak dışa aktarır. Sırlar dahil edilmez. */
export async function GET() {
  try {
    await ensureSeed();
    const [
      subjectsData,
      topicsData,
      tasksData,
      questionLogsData,
      studySessionsData,
      dailyGoalsData,
      reviewTasksData,
      studyNotesData,
      wrongQuestionsData,
      studyGoalsData,
      milestonesData,
      energyLogsData,
      examRows,
      settingsRows,
    ] = await Promise.all([
      db.select().from(subjects),
      db.select().from(topics),
      db.select().from(tasks),
      db.select().from(questionLogs),
      db.select().from(studySessions),
      db.select().from(dailyGoals),
      db.select().from(reviewTasks),
      db.select().from(studyNotes),
      db.select().from(wrongQuestions),
      db.select().from(studyGoals),
      db.select().from(milestones),
      db.select().from(energyLogs),
      db.select().from(examSettings),
      db.select().from(settings),
    ]);

    // Sırlar/anahtarlar yedeğe konmaz; yalnızca kullanıcı tercihleri.
    const exam = examRows[0] ?? null;
    const setting = settingsRows[0]
      ? {
          userName: settingsRows[0].userName,
          reminderEnabled: settingsRows[0].reminderEnabled,
          reminderTime: settingsRows[0].reminderTime,
          defaultDailyQuestionGoal: settingsRows[0].defaultDailyQuestionGoal,
          defaultDailyMinutesGoal: settingsRows[0].defaultDailyMinutesGoal,
        }
      : null;

    const payload = {
      app: "Çalışma Yol Arkadaşım",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        subjects: subjectsData,
        topics: topicsData,
        tasks: tasksData,
        questionLogs: questionLogsData,
        studySessions: studySessionsData,
        dailyGoals: dailyGoalsData,
        reviewTasks: reviewTasksData,
        studyNotes: studyNotesData,
        wrongQuestions: wrongQuestionsData,
        studyGoals: studyGoalsData,
        milestones: milestonesData,
        energyLogs: energyLogsData,
        exam: exam
          ? {
              examName: exam.examName,
              examDate: exam.examDate,
              weakThreshold: exam.weakThreshold,
            }
          : null,
        settings: setting,
      },
    };

    const filename = `calisma-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return serverError();
  }
}
