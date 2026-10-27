import { db } from "@/db";
import { dailyGoals, questionLogs, tasks } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ok, bad, serverError, asInt, TASK_STATUSES } from "@/lib/api";
import {
  isValidTaskQuestionBreakdown,
  questionLogForCompletedTask,
} from "@/lib/task-question-log";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    const hasQuestionBreakdown =
      body.correct !== undefined || body.wrong !== undefined;
    if (hasQuestionBreakdown && body.status !== "completed") {
      return bad("Soru dağılımı yalnızca görev tamamlanırken gönderilebilir");
    }
    const breakdown = hasQuestionBreakdown
      ? {
          correct: Number(body.correct),
          wrong: Number(body.wrong),
        }
      : undefined;
    if (
      breakdown &&
      (!Number.isInteger(breakdown.correct) ||
        !Number.isInteger(breakdown.wrong) ||
        breakdown.correct < 0 ||
        breakdown.wrong < 0)
    ) {
      return bad("Doğru ve yanlış soru sayıları geçerli, negatif olmayan tam sayılar olmalı");
    }
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

    const result = await db.transaction(async (tx) => {
      const [existingTask] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, asInt(id)), eq(tasks.userId, userId)))
        .limit(1);
      if (!existingTask) return { task: null, invalidBreakdown: false };
      if (
        breakdown &&
        !isValidTaskQuestionBreakdown(existingTask.questionGoal, breakdown)
      ) {
        return { task: null, invalidBreakdown: true };
      }

      const [task] = await tx
        .update(tasks)
        .set(update)
        .where(and(eq(tasks.id, asInt(id)), eq(tasks.userId, userId)))
        .returning();
      if (!task) return { task: null, invalidBreakdown: false };

      const questionLog = task.status === "completed"
        ? questionLogForCompletedTask(task, breakdown)
        : null;
      if (questionLog) {
        const insert = tx.insert(questionLogs).values(questionLog);
        if (breakdown) {
          await insert.onConflictDoUpdate({
            target: questionLogs.taskId,
            set: {
              total: questionLog.total,
              correct: questionLog.correct,
              wrong: questionLog.wrong,
              blank: questionLog.blank,
              breakdownAvailable: true,
              updatedAt: new Date(),
            },
          });
        } else {
          await insert.onConflictDoNothing({ target: questionLogs.taskId });
        }
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
      return { task, invalidBreakdown: false };
    });
    if (result.invalidBreakdown) {
      return bad("Doğru ve yanlış toplamı görev soru hedefini aşamaz");
    }
    if (!result.task) return bad("Görev bulunamadı", 404);
    return ok({ task: result.task });
  } catch {
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const deleted = await db.transaction(async (tx) => {
      const [task] = await tx
        .delete(tasks)
        .where(and(eq(tasks.id, asInt(id)), eq(tasks.userId, userId)))
        .returning();
      if (!task) return null;

      if (task.questionGoal > 0) {
        await tx
          .update(dailyGoals)
          .set({
            questionGoal: sql`greatest(${dailyGoals.questionGoal} - ${task.questionGoal}, 0)`,
          })
          .where(
            and(
              eq(dailyGoals.userId, userId),
              eq(dailyGoals.date, task.date),
            ),
          );
      }
      return task;
    });
    if (!deleted) return bad("Görev bulunamadı", 404);
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
