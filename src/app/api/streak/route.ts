import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { ok, serverError } from "@/lib/api";
import { recomputeStreak, getWeekActiveDays } from "@/lib/activity";
import { startOfWeek, todayISO, weekDates } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const streak = await recomputeStreak(userId);
    const dates = weekDates(startOfWeek(todayISO()));
    const weekActiveDays = await getWeekActiveDays(userId, dates[0], dates[6]);
    return ok({ ...streak, weekActiveDays });
  } catch {
    return serverError();
  }
}
