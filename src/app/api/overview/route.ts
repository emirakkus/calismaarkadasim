import { db } from "@/db";
import {
  tasks,
  settings as settingsTable,
  examSettings,
  reviewTasks,
} from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError, isValidDate } from "@/lib/api";
import {
  getDailySummary,
  getWeeklyStats,
  getProgramProgress,
} from "@/lib/stats";
import { recomputeStreak, getWeekActiveDays } from "@/lib/activity";
import { todayISO, startOfWeek, fromISODate, weekDates } from "@/lib/date";
import { and, asc, eq, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

function daysUntil(dateStr: string): number {
  const today = fromISODate(todayISO());
  const target = fromISODate(dateStr);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export async function GET(req: Request) {
  try {
    await ensureSeed();
    const param = new URL(req.url).searchParams.get("date");
    const date = param && isValidDate(param) ? param : todayISO();
    const ws = startOfWeek(todayISO());
    const wd = weekDates(ws);

    const [
      summary,
      week,
      program,
      setRows,
      dayTasks,
      examRows,
      streak,
      weekActiveDays,
      dueReviews,
    ] = await Promise.all([
      getDailySummary(date),
      getWeeklyStats(startOfWeek(date)),
      getProgramProgress(),
      db.select().from(settingsTable).where(eq(settingsTable.id, 1)).limit(1),
      db
        .select()
        .from(tasks)
        .where(eq(tasks.date, date))
        .orderBy(asc(tasks.orderIndex), asc(tasks.id)),
      db.select().from(examSettings).where(eq(examSettings.id, 1)).limit(1),
      recomputeStreak(),
      getWeekActiveDays(wd[0], wd[6]),
      db
        .select()
        .from(reviewTasks)
        .where(
          and(
            eq(reviewTasks.status, "pending"),
            lte(reviewTasks.scheduledDate, todayISO()),
          ),
        )
        .orderBy(asc(reviewTasks.scheduledDate)),
    ]);

    const nextTask =
      dayTasks.find((t) => t.status === "in_progress") ??
      dayTasks.find((t) => t.status === "pending") ??
      null;

    const exam = examRows[0] ?? null;
    const examDaysLeft =
      exam?.examDate ? daysUntil(exam.examDate as string) : null;

    return ok({
      date,
      summary,
      week,
      program,
      settings: setRows[0] ?? null,
      tasks: dayTasks,
      nextTask,
      exam,
      examDaysLeft,
      streak: { ...streak, weekActiveDays },
      dueReviews,
    });
  } catch {
    return serverError();
  }
}
