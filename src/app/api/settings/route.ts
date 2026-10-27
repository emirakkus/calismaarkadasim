import { db } from "@/db";
import { settings } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId))
      .limit(1);
    return ok({ settings: row });
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
    if (!body) return bad("Geçersiz istek");

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.userName !== undefined)
      update.userName = String(body.userName).slice(0, 40);
    if (body.reminderEnabled !== undefined)
      update.reminderEnabled = Boolean(body.reminderEnabled);
    if (body.reminderTime !== undefined) {
      const t = String(body.reminderTime);
      if (!/^\d{2}:\d{2}$/.test(t)) return bad("Geçersiz saat biçimi");
      update.reminderTime = t;
    }
    if (body.defaultDailyQuestionGoal !== undefined)
      update.defaultDailyQuestionGoal = Math.max(0, asInt(body.defaultDailyQuestionGoal));
    if (body.defaultDailyMinutesGoal !== undefined)
      update.defaultDailyMinutesGoal = Math.max(0, asInt(body.defaultDailyMinutesGoal));

    const [row] = await db
      .update(settings)
      .set(update)
      .where(eq(settings.userId, userId))
      .returning();
    return ok({ settings: row });
  } catch {
    return serverError();
  }
}
