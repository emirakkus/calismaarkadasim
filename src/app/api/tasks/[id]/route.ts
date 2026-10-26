import { db } from "@/db";
import { tasks } from "@/db/schema";
import { ok, bad, serverError, asInt, TASK_STATUSES } from "@/lib/api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const taskId = asInt(id);
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");

    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.status !== undefined) {
      if (!TASK_STATUSES.includes(body.status)) return bad("Geçersiz durum");
      update.status = body.status;
      // Tamamlanma zamanını yönet; mükerrer sayımı önlemek için durum bazlı.
      update.completedAt = body.status === "completed" ? new Date() : null;
    }
    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (!t) return bad("Başlık boş olamaz");
      update.title = t;
    }
    if (body.estimatedMinutes !== undefined)
      update.estimatedMinutes = Math.max(0, asInt(body.estimatedMinutes));
    if (body.questionGoal !== undefined)
      update.questionGoal = Math.max(0, asInt(body.questionGoal));
    if (body.notes !== undefined)
      update.notes = body.notes ? String(body.notes) : null;
    if (body.priority !== undefined) {
      if (!["low", "normal", "high"].includes(body.priority))
        return bad("Geçersiz öncelik");
      update.priority = body.priority;
    }
    if (body.isPinned !== undefined) update.isPinned = Boolean(body.isPinned);
    if (body.orderIndex !== undefined)
      update.orderIndex = asInt(body.orderIndex);

    const [updated] = await db
      .update(tasks)
      .set(update)
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updated) return bad("Görev bulunamadı", 404);
    return ok({ task: updated });
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
      .delete(tasks)
      .where(eq(tasks.id, asInt(id)))
      .returning();
    if (!deleted) return bad("Görev bulunamadı", 404);
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
