import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError, isValidDate } from "@/lib/api";
import { buildCoachContext, fallbackCoachReply, hasAIKey } from "@/lib/coach";
import { todayISO } from "@/lib/date";

export const dynamic = "force-dynamic";

/** Ana panel için kısa, gerçek verilere dayalı koç önerisi (LLM kullanmaz). */
export async function GET(req: Request) {
  try {
    await ensureSeed();
    const param = new URL(req.url).searchParams.get("date");
    const date = param && isValidDate(param) ? param : todayISO();
    const ctx = await buildCoachContext(date);
    const full = fallbackCoachReply(ctx);
    const tip = full.split("\n\n").slice(0, 2).join(" ");
    return ok({ tip, aiEnabled: hasAIKey() });
  } catch {
    return serverError();
  }
}
