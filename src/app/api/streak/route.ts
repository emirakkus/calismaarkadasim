import { ensureSeed } from "@/lib/seed";
import { ok, serverError } from "@/lib/api";
import { recomputeStreak, getWeekActiveDays } from "@/lib/activity";
import { startOfWeek, todayISO, weekDates } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const streak = await recomputeStreak();
    const ws = startOfWeek(todayISO());
    const dates = weekDates(ws);
    const weekActiveDays = await getWeekActiveDays(dates[0], dates[6]);
    return ok({ ...streak, weekActiveDays });
  } catch {
    return serverError();
  }
}
