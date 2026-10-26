import { db } from "@/db";
import { studySessions, subjects } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSeed();
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    if (!isValidDate(body.date)) return bad("Geçerli bir tarih girin");

    const sessionType = body.sessionType === "pomodoro" ? "pomodoro" : "manual";
    const durationSeconds = Math.max(0, asInt(body.durationSeconds));
    // Pomodoro için saniyeden dakika türet; aksi halde minutes alanı
    const minutes =
      sessionType === "pomodoro" && durationSeconds > 0
        ? Math.max(1, Math.round(durationSeconds / 60))
        : asInt(body.minutes);

    if (minutes <= 0) return bad("Süre 0 dakikadan büyük olmalı");

    let subjectName = String(body.subjectName ?? "").trim();
    let subjectId: number | null = null;
    if (body.subjectId) {
      const s = await db
        .select()
        .from(subjects)
        .where(eq(subjects.id, asInt(body.subjectId)))
        .limit(1);
      if (s[0]) {
        subjectId = s[0].id;
        subjectName = s[0].name;
      }
    }
    if (!subjectName) return bad("Ders seçin");

    const [created] = await db
      .insert(studySessions)
      .values({
        date: body.date,
        subjectId,
        subjectName,
        taskId: body.taskId ? asInt(body.taskId) : null,
        topicId: body.topicId ? asInt(body.topicId) : null,
        minutes,
        sessionType,
        durationSeconds,
        status: "completed",
      })
      .returning();

    return ok({ session: created }, { status: 201 });
  } catch {
    return serverError();
  }
}
