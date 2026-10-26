import { db } from "@/db";
import { questionLogs } from "@/db/schema";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const logId = asInt(id);
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");

    const [existing] = await db
      .select()
      .from(questionLogs)
      .where(eq(questionLogs.id, logId))
      .limit(1);
    if (!existing) return bad("Kayıt bulunamadı", 404);

    const total = body.total !== undefined ? asInt(body.total) : existing.total;
    const correct =
      body.correct !== undefined ? asInt(body.correct) : existing.correct;
    const wrong = body.wrong !== undefined ? asInt(body.wrong) : existing.wrong;
    const blank = body.blank !== undefined ? asInt(body.blank) : existing.blank;

    if (total <= 0) return bad("Toplam soru sayısı 0'dan büyük olmalı");
    if (correct < 0 || wrong < 0 || blank < 0)
      return bad("Değerler negatif olamaz");
    if (correct + wrong + blank > total)
      return bad("Doğru + yanlış + boş toplam soru sayısından fazla olamaz");

    const [updated] = await db
      .update(questionLogs)
      .set({ total, correct, wrong, blank, updatedAt: new Date() })
      .where(eq(questionLogs.id, logId))
      .returning();

    return ok({ log: updated });
  } catch {
    return serverError();
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(questionLogs)
      .where(eq(questionLogs.id, asInt(id)))
      .returning();
    if (!deleted) return bad("Kayıt bulunamadı", 404);
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
