import { db } from "@/db";
import { studySessions } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ok, serverError, isValidDate } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const param = new URL(req.url).searchParams.get("date");
    const date = param && isValidDate(param) ? param : todayISO();
    const r = await db
      .select({
        minutes: sql<number>`coalesce(sum(${studySessions.minutes}),0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(studySessions)
      .where(and(eq(studySessions.userId, userId), eq(studySessions.date, date), eq(studySessions.sessionType, "pomodoro"), eq(studySessions.status, "completed")));
    return ok({ pomodoroMinutes: r[0]?.minutes ?? 0, pomodoroCount: r[0]?.count ?? 0 });
  } catch {
    return serverError();
  }
}
