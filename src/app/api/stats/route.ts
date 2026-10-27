import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { ok, bad, serverError, isValidDate } from "@/lib/api";
import { getWeeklyStats } from "@/lib/stats";
import { startOfWeek, todayISO } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const param = new URL(req.url).searchParams.get("weekStart");
    const weekStart = param && isValidDate(param) ? param : startOfWeek(todayISO());
    if (!isValidDate(weekStart)) return bad("Geçersiz hafta");
    const stats = await getWeeklyStats(userId, weekStart);
    return ok(stats);
  } catch {
    return serverError();
  }
}
