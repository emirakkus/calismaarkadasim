import { db } from "@/db";
import { tasks, questionLogs, studySessions } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError, isValidDate } from "@/lib/api";
import { getDailySummary } from "@/lib/stats";
import { todayISO } from "@/lib/date";
import { and, asc, eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureSeed();
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? todayISO();
    if (!isValidDate(date)) return bad("Geçersiz tarih");

    const dayTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.date, date))
      .orderBy(asc(tasks.orderIndex), asc(tasks.id));

    const logs = await db
      .select()
      .from(questionLogs)
      .where(eq(questionLogs.date, date))
      .orderBy(desc(questionLogs.id));

    const sessions = await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.date, date))
      .orderBy(desc(studySessions.id));

    const summary = await getDailySummary(date);

    // Bir sonraki görev: tamamlanmamış ilk görev
    const nextTask =
      dayTasks.find((t) => t.status === "in_progress") ??
      dayTasks.find((t) => t.status === "pending") ??
      null;

    return ok({ date, tasks: dayTasks, questionLogs: logs, sessions, summary, nextTask });
  } catch {
    return serverError();
  }
}
