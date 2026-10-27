import { db } from "@/db";
import { coachMessages } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { ok, bad, serverError, isValidDate } from "@/lib/api";
import { buildCoachContext, contextToText, fallbackCoachReply, callLLM, hasAIKey, COACH_SYSTEM_PROMPT } from "@/lib/coach";
import { todayISO } from "@/lib/date";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const history = await db.select().from(coachMessages).where(eq(coachMessages.userId, userId)).orderBy(desc(coachMessages.id)).limit(30);
    return ok({ messages: history.reverse(), aiEnabled: hasAIKey() });
  } catch {
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const body = await req.json().catch(() => null);
    const date = body?.date && isValidDate(body.date) ? body.date : todayISO();
    const userMessage = String(body?.message ?? "").trim();
    if (!userMessage) return bad("Mesaj boş olamaz");

    const ctx = await buildCoachContext(userId, date);
    const contextText = contextToText(ctx);
    let reply: string;
    if (hasAIKey()) {
      try {
        reply = await callLLM(COACH_SYSTEM_PROMPT, contextText, userMessage);
      } catch {
        reply = fallbackCoachReply(ctx, userMessage) + "\n\n(Yapay zekâ servisine ulaşılamadı; gerçek verilerine dayalı özet gösteriliyor.)";
      }
    } else {
      reply = fallbackCoachReply(ctx, userMessage);
    }

    await db.insert(coachMessages).values([
      { userId, role: "user", content: userMessage },
      { userId, role: "assistant", content: reply },
    ]);
    return ok({ reply, usedAI: hasAIKey(), aiEnabled: hasAIKey() });
  } catch {
    return serverError();
  }
}
