import { db } from "@/db";
import { tasks, studySessions, reviewTasks } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError } from "@/lib/api";
import { and, gte, lte, sql, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Bir ay için günlük özet: görev, tamamlanan, tekrar, oturum dakikası. */
export async function GET(req: Request) {
  try {
    await ensureSeed();
    const url = new URL(req.url);
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month")); // 1-12
    if (!Number.isFinite(year) || month < 1 || month > 12)
      return bad("Geçersiz ay/yıl");

    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const taskRows = await db
      .select({
        date: tasks.date,
        total: sql<number>`count(*)::int`,
        completed: sql<number>`sum(case when ${tasks.status}='completed' then 1 else 0 end)::int`,
        postponed: sql<number>`sum(case when ${tasks.status}='postponed' then 1 else 0 end)::int`,
      })
      .from(tasks)
      .where(and(gte(tasks.date, start), lte(tasks.date, end)))
      .groupBy(tasks.date);

    const sessionRows = await db
      .select({
        date: studySessions.date,
        minutes: sql<number>`coalesce(sum(${studySessions.minutes}),0)::int`,
      })
      .from(studySessions)
      .where(
        and(
          eq(studySessions.status, "completed"),
          gte(studySessions.date, start),
          lte(studySessions.date, end),
        ),
      )
      .groupBy(studySessions.date);

    const reviewRows = await db
      .select({
        date: reviewTasks.scheduledDate,
        count: sql<number>`count(*)::int`,
      })
      .from(reviewTasks)
      .where(
        and(
          eq(reviewTasks.status, "pending"),
          gte(reviewTasks.scheduledDate, start),
          lte(reviewTasks.scheduledDate, end),
        ),
      )
      .groupBy(reviewTasks.scheduledDate);

    const days: Record<
      string,
      { tasks: number; completed: number; postponed: number; minutes: number; reviews: number }
    > = {};
    const ensure = (d: string) => {
      if (!days[d])
        days[d] = { tasks: 0, completed: 0, postponed: 0, minutes: 0, reviews: 0 };
      return days[d];
    };
    for (const r of taskRows) {
      const e = ensure(r.date as string);
      e.tasks = r.total;
      e.completed = r.completed;
      e.postponed = r.postponed;
    }
    for (const r of sessionRows) ensure(r.date as string).minutes = r.minutes;
    for (const r of reviewRows) ensure(r.date as string).reviews = r.count;

    return ok({ year, month, start, end, days });
  } catch {
    return serverError();
  }
}
