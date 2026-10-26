import { db } from "@/db";
import { dailyGoals } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
import { getEffectiveGoals } from "@/lib/stats";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureSeed();
    const date = new URL(req.url).searchParams.get("date");
    if (!isValidDate(date)) return bad("Geçerli bir tarih girin");
    const goals = await getEffectiveGoals(date);
    const override = await db
      .select()
      .from(dailyGoals)
      .where(eq(dailyGoals.date, date))
      .limit(1);
    return ok({ ...goals, hasOverride: override.length > 0 });
  } catch {
    return serverError();
  }
}

export async function PUT(req: Request) {
  try {
    await ensureSeed();
    const body = await req.json().catch(() => null);
    if (!body || !isValidDate(body.date)) return bad("Geçerli bir tarih girin");

    const questionGoal = Math.max(0, asInt(body.questionGoal));
    const minutesGoal = Math.max(0, asInt(body.minutesGoal));

    const [row] = await db
      .insert(dailyGoals)
      .values({ date: body.date, questionGoal, minutesGoal })
      .onConflictDoUpdate({
        target: dailyGoals.date,
        set: { questionGoal, minutesGoal },
      })
      .returning();

    return ok({ goal: row });
  } catch {
    return serverError();
  }
}
