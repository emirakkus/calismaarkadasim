import { db } from "@/db";
import {
  topics, tasks, questionLogs, studySessions, dailyGoals, reviewTasks,
  studyNotes, wrongQuestions, studyGoals, milestones, energyLogs, examSettings, settings, subjects,
} from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { serverError } from "@/lib/api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const SCHEMA_VERSION = 2;

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);

    const [
      subjectsData, topicsData, tasksData, questionLogsData, studySessionsData, dailyGoalsData,
      reviewTasksData, studyNotesData, wrongQuestionsData, studyGoalsData, milestonesData, energyLogsData, examRows, settingsRows,
    ] = await Promise.all([
      db.select().from(subjects),
      db.select().from(topics).where(eq(topics.userId, userId)),
      db.select().from(tasks).where(eq(tasks.userId, userId)),
      db.select().from(questionLogs).where(eq(questionLogs.userId, userId)),
      db.select().from(studySessions).where(eq(studySessions.userId, userId)),
      db.select().from(dailyGoals).where(eq(dailyGoals.userId, userId)),
      db.select().from(reviewTasks).where(eq(reviewTasks.userId, userId)),
      db.select().from(studyNotes).where(eq(studyNotes.userId, userId)),
      db.select().from(wrongQuestions).where(eq(wrongQuestions.userId, userId)),
      db.select().from(studyGoals).where(eq(studyGoals.userId, userId)),
      db.select().from(milestones).where(eq(milestones.userId, userId)),
      db.select().from(energyLogs).where(eq(energyLogs.userId, userId)),
      db.select().from(examSettings).where(eq(examSettings.userId, userId)),
      db.select().from(settings).where(eq(settings.userId, userId)),
    ]);

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
        subjects: subjectsData, topics: topicsData, tasks: tasksData, questionLogs: questionLogsData,
        studySessions: studySessionsData, dailyGoals: dailyGoalsData, reviewTasks: reviewTasksData,
        studyNotes: studyNotesData, wrongQuestions: wrongQuestionsData, studyGoals: studyGoalsData,
        milestones: milestonesData, energyLogs: energyLogsData,
        exam: exam ? { examName: exam.examName, examDate: exam.examDate, weakThreshold: exam.weakThreshold } : null,
        settings: setting,
      },
    };

    const filename = `calisma-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${filename}"` },
    });
  } catch {
    return serverError();
  }
}
