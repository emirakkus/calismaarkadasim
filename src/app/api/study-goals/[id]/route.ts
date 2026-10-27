import { db } from "@/db";
import { studyGoals } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
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
    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (!t) return bad("Başlık boş olamaz");
      update.title = t;
    }
    if (body.description !== undefined) update.description = body.description ? String(body.description) : null;
    if (body.targetValue !== undefined) update.targetValue = Math.max(0, asInt(body.targetValue));
    if (body.manualValue !== undefined) update.manualValue = Math.max(0, asInt(body.manualValue));
    if (body.status !== undefined) {
      if (!["active", "completed", "archived"].includes(body.status)) return bad("Geçersiz durum");
      update.status = body.status;
    }
    for (const f of ["startDate", "dueDate"] as const) {
      if (body[f] !== undefined) {
        if (body[f] === null || body[f] === "") update[f] = null;
        else if (isValidDate(body[f])) update[f] = body[f];
        else return bad("Geçersiz tarih");
      }
    }
    const [updated] = await db.update(studyGoals).set(update).where(and(eq(studyGoals.id, asInt(id)), eq(studyGoals.userId, userId))).returning();
    if (!updated) return bad("Hedef bulunamadı", 404);
    return ok({ goal: updated });
  } catch {
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const [deleted] = await db.delete(studyGoals).where(and(eq(studyGoals.id, asInt(id)), eq(studyGoals.userId, userId))).returning();
    if (!deleted) return bad("Hedef bulunamadı", 404);
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
