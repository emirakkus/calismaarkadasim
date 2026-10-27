import { db } from "@/db";
import { reviewTasks } from "@/db/schema";
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
    if (body.scheduledDate !== undefined) {
      if (!isValidDate(body.scheduledDate)) return bad("Geçersiz tarih");
      update.scheduledDate = body.scheduledDate;
      update.status = "pending";
    }
    if (body.status !== undefined) {
      if (!["pending", "completed", "postponed"].includes(body.status)) return bad("Geçersiz durum");
      update.status = body.status;
    }
    const [updated] = await db.update(reviewTasks).set(update).where(and(eq(reviewTasks.id, asInt(id)), eq(reviewTasks.userId, userId))).returning();
    if (!updated) return bad("Tekrar kaydı bulunamadı", 404);
    return ok({ review: updated });
  } catch {
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const [deleted] = await db.delete(reviewTasks).where(and(eq(reviewTasks.id, asInt(id)), eq(reviewTasks.userId, userId))).returning();
    if (!deleted) return bad("Tekrar kaydı bulunamadı", 404);
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
