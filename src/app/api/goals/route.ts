import { db } from "@/db";
import { dailyGoals } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
import { getEffectiveGoals } from "@/lib/stats";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const date = new URL(req.url).searchParams.get("date");
    if (!isValidDate(date)) return bad("Geçerli bir tarih girin");
    const goals = await getEffectiveGoals(userId, date);
    const override = await db.select().from(dailyGoals).where(and(eq(dailyGoals.userId, userId), eq(dailyGoals.date, date))).limit(1);
    return ok({ ...goals, hasOverride: override.length > 0 });
  } catch {
    return serverError();
  }
}

export async function PUT(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const body = await req.json().catch(() => null);
    if (!body || !isValidDate(body.date)) return bad("Geçerli bir tarih girin");
    const questionGoal = Math.max(0, asInt(body.questionGoal));
    const minutesGoal = Math.max(0, asInt(body.minutesGoal));

    const existing = await db.select().from(dailyGoals).where(and(eq(dailyGoals.userId, userId), eq(dailyGoals.date, body.date))).limit(1);
    let row;
    if (existing[0]) {
      [row] = await db.update(dailyGoals).set({ questionGoal, minutesGoal }).where(and(eq(dailyGoals.userId, userId), eq(dailyGoals.date, body.date))).returning();
    } else {
      [row] = await db.insert(dailyGoals).values({ userId, date: body.date, questionGoal, minutesGoal }).returning();
    }
    return ok({ goal: row });
  } catch {
    return serverError();
  }
}
