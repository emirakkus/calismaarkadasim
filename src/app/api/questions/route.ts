import { db } from "@/db";
import { questionLogs, subjects } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function validateCounts(total: number, correct: number, wrong: number, blank: number) {
  if (total < 0 || correct < 0 || wrong < 0 || blank < 0)
    return "Değerler negatif olamaz";
  if (total === 0) return "Toplam soru sayısı 0'dan büyük olmalı";
  if (correct + wrong + blank > total)
    return "Doğru + yanlış + boş toplam soru sayısından fazla olamaz";
  return null;
}

export async function POST(req: Request) {
  try {
    await ensureSeed();
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    if (!isValidDate(body.date)) return bad("Geçerli bir tarih girin");

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

    const total = asInt(body.total);
    const correct = asInt(body.correct);
    const wrong = asInt(body.wrong);
    const blank = asInt(body.blank);
    const err = validateCounts(total, correct, wrong, blank);
    if (err) return bad(err);

    // Dağılım yalnızca kullanıcı girdiğinde "mevcut" sayılır; uydurma yok.
    const breakdownAvailable = correct + wrong + blank > 0;

    const [created] = await db
      .insert(questionLogs)
      .values({
        date: body.date,
        subjectId,
        subjectName,
        topicId: body.topicId ? asInt(body.topicId) : null,
        total,
        correct,
        wrong,
        blank,
        breakdownAvailable,
        note: body.note ? String(body.note).slice(0, 500) : null,
      })
      .returning();

    return ok({ log: created }, { status: 201 });
  } catch {
    return serverError();
  }
}
