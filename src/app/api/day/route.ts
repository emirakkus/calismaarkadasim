import { db } from "@/db";
import { tasks, questionLogs, studySessions } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { ok, bad, serverError, isValidDate } from "@/lib/api";
import { getDailySummary } from "@/lib/stats";
import { todayISO } from "@/lib/date";
import { and, asc, eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);

    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? todayISO();
    if (!isValidDate(date)) return bad("Geçersiz tarih");

    const dayTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.date, date)))
      .orderBy(asc(tasks.orderIndex), asc(tasks.id));

    const logs = await db
      .select()
      .from(questionLogs)
      .where(and(eq(questionLogs.userId, userId), eq(questionLogs.date, date)))
      .orderBy(desc(questionLogs.id));

    const sessions = await db
      .select()
      .from(studySessions)
      .where(and(eq(studySessions.userId, userId), eq(studySessions.date, date)))
      .orderBy(desc(studySessions.id));

    const summary = await getDailySummary(userId, date);

    const nextTask =
      dayTasks.find((t) => t.status === "in_progress") ??
      dayTasks.find((t) => t.status === "pending") ??
      null;

    return ok({ date, tasks: dayTasks, questionLogs: logs, sessions, summary, nextTask });
  } catch {
    return serverError();
  }
}
