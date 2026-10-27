import { db } from "@/db";
import { questionLogs, tasks } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ok, bad, serverError, asInt, TASK_STATUSES } from "@/lib/api";
import { questionLogForCompletedTask } from "@/lib/task-question-log";
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
    if (body.status !== undefined) {
      if (!TASK_STATUSES.includes(body.status)) return bad("Geçersiz durum");
      update.status = body.status;
      update.completedAt = body.status === "completed" ? new Date() : null;
    }
    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (!t) return bad("Başlık boş olamaz");
      update.title = t;
    }
    if (body.estimatedMinutes !== undefined) update.estimatedMinutes = Math.max(0, asInt(body.estimatedMinutes));
    if (body.questionGoal !== undefined) update.questionGoal = Math.max(0, asInt(body.questionGoal));
    if (body.notes !== undefined) update.notes = body.notes ? String(body.notes) : null;
    if (body.priority !== undefined) {
      if (!["low", "normal", "high"].includes(body.priority)) return bad("Geçersiz öncelik");
      update.priority = body.priority;
    }
    if (body.isPinned !== undefined) update.isPinned = Boolean(body.isPinned);
    if (body.orderIndex !== undefined) update.orderIndex = asInt(body.orderIndex);

    const updated = await db.transaction(async (tx) => {
      const [task] = await tx
        .update(tasks)
        .set(update)
        .where(and(eq(tasks.id, asInt(id)), eq(tasks.userId, userId)))
        .returning();
      if (!task) return null;

      const questionLog = task.status === "completed"
        ? questionLogForCompletedTask(task)
        : null;
      if (questionLog) {
        await tx
          .insert(questionLogs)
          .values(questionLog)
          .onConflictDoNothing({ target: questionLogs.taskId });
      } else {
        await tx
          .delete(questionLogs)
          .where(
            and(
              eq(questionLogs.taskId, task.id),
              eq(questionLogs.userId, userId),
            ),
          );
      }
      return task;
    });
    if (!updated) return bad("Görev bulunamadı", 404);
    return ok({ task: updated });
  } catch {
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const [deleted] = await db.delete(tasks).where(and(eq(tasks.id, asInt(id)), eq(tasks.userId, userId))).returning();
    if (!deleted) return bad("Görev bulunamadı", 404);
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
