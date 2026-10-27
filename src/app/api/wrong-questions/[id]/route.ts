import { db } from "@/db";
import { wrongQuestions } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.questionText !== undefined) {
      const t = String(body.questionText).trim();
      if (!t) return bad("Soru açıklaması boş olamaz");
      update.questionText = t;
    }
    for (const f of ["userAnswer", "correctAnswer", "mistakeReason", "explanation"]) {
      if (body[f] !== undefined) update[f] = body[f] ? String(body[f]) : null;
    }
    if (body.reviewStatus !== undefined) {
      if (!["open", "reviewed"].includes(body.reviewStatus)) return bad("Geçersiz durum");
      update.reviewStatus = body.reviewStatus;
    }
    const [updated] = await db.update(wrongQuestions).set(update).where(and(eq(wrongQuestions.id, asInt(id)), eq(wrongQuestions.userId, userId))).returning();
    if (!updated) return bad("Kayıt bulunamadı", 404);
    return ok({ wrongQuestion: updated });
  } catch {
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const [deleted] = await db.delete(wrongQuestions).where(and(eq(wrongQuestions.id, asInt(id)), eq(wrongQuestions.userId, userId))).returning();
    if (!deleted) return bad("Kayıt bulunamadı", 404);
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
