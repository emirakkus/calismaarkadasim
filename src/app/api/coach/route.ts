import { db } from "@/db";
import { coachMessages } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError, isValidDate } from "@/lib/api";
import {
  buildCoachContext,
  contextToText,
  fallbackCoachReply,
  callLLM,
  hasAIKey,
  COACH_SYSTEM_PROMPT,
} from "@/lib/coach";
import { todayISO } from "@/lib/date";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const history = await db
      .select()
      .from(coachMessages)
      .orderBy(desc(coachMessages.id))
      .limit(30);
    return ok({ messages: history.reverse(), aiEnabled: hasAIKey() });
  } catch {
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    await ensureSeed();
    const body = await req.json().catch(() => null);
    const date = body?.date && isValidDate(body.date) ? body.date : todayISO();
    const userMessage = String(body?.message ?? "").trim();
    if (!userMessage) return bad("Mesaj boş olamaz");

    const ctx = await buildCoachContext(date);
    const contextText = contextToText(ctx);

    let reply: string;
    let usedAI = false;
    if (hasAIKey()) {
      try {
        reply = await callLLM(COACH_SYSTEM_PROMPT, contextText, userMessage);
        usedAI = true;
      } catch {
        reply =
          fallbackCoachReply(ctx, userMessage) +
          "\n\n(Yapay zekâ servisine ulaşılamadı; gerçek verilerine dayalı özet gösteriliyor.)";
      }
    } else {
      reply = fallbackCoachReply(ctx, userMessage);
    }

    await db.insert(coachMessages).values([
      { role: "user", content: userMessage },
      { role: "assistant", content: reply },
    ]);

    return ok({ reply, usedAI, aiEnabled: hasAIKey() });
  } catch {
    return serverError();
  }
}
