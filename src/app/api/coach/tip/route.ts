import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { ok, serverError, isValidDate } from "@/lib/api";
import { buildCoachContext, fallbackCoachReply, hasAIKey } from "@/lib/coach";
import { todayISO } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const param = new URL(req.url).searchParams.get("date");
    const date = param && isValidDate(param) ? param : todayISO();
    const ctx = await buildCoachContext(userId, date);
    const full = fallbackCoachReply(ctx);
    const tip = full.split("\n\n").slice(0, 2).join(" ");
    return ok({ tip, aiEnabled: hasAIKey() });
  } catch {
    return serverError();
  }
}
