import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getOrCreateSettings(userId: number) {
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return { user: null, settings: null };

  const [existing] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);
  if (existing) return { user, settings: existing };

  const [created] = await db
    .insert(settings)
    .values({ userId, userName: user.name })
    .onConflictDoNothing({ target: settings.userId })
    .returning();
  if (created) return { user, settings: created };

  const [raced] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);
  return { user, settings: raced ?? null };
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const result = await getOrCreateSettings(userId);
    if (!result.user) return unauthorized();
    if (!result.settings) return serverError("Kullanıcı ayarları bulunamadı");
    return ok({
      settings: { ...result.settings, userName: result.user.name ?? result.settings.userName },
    });
  } catch (error) {
    console.error("[settings] GET failed", error);
    return serverError();
  }
}

export async function PUT(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const result = await getOrCreateSettings(userId);
    if (!result.user) return unauthorized();
    if (!result.settings) return serverError("Kullanıcı ayarları bulunamadı");
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");

    const userName =
      body.userName === undefined
        ? result.user.name ?? ""
        : String(body.userName).trim().slice(0, 40);

    const update: Record<string, unknown> = {
      updatedAt: new Date(),
      userName,
    };
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

    const row = await db.transaction(async (tx) => {
      if (body.userName !== undefined) {
        await tx.update(users).set({ name: userName }).where(eq(users.id, userId));
      }

      const [updatedSettings] = await tx
        .update(settings)
        .set(update)
        .where(eq(settings.userId, userId))
        .returning();
      return updatedSettings;
    });
    return ok({ settings: row });
  } catch (error) {
    console.error("[settings] PUT failed", error);
    return serverError();
  }
}
