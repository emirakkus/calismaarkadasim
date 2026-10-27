import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
import { getEffectiveGoals } from "@/lib/stats";
import { addDays } from "@/lib/date";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const [task] = await db.select().from(tasks).where(and(eq(tasks.id, asInt(id)), eq(tasks.userId, userId))).limit(1);
    if (!task) return bad("Görev bulunamadı", 404);

    const targetDate = body?.targetDate && isValidDate(body.targetDate) ? body.targetDate : addDays(task.date as string, 1);
    const load = await db.select({ minutes: sql<number>`coalesce(sum(${tasks.estimatedMinutes}),0)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.date, targetDate)));
    const goals = await getEffectiveGoals(userId, targetDate);
    const projected = (load[0]?.minutes ?? 0) + task.estimatedMinutes;
    const overloaded = goals.minutesGoal > 0 && projected > goals.minutesGoal;
    const maxOrder = await db.select({ m: sql<number>`coalesce(max(${tasks.orderIndex}),0)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.date, targetDate)));

    await db.update(tasks).set({ status: "postponed", updatedAt: new Date() }).where(and(eq(tasks.id, task.id), eq(tasks.userId, userId)));

    const [moved] = await db.insert(tasks).values({
      userId, date: targetDate, subjectId: task.subjectId, subjectName: task.subjectName,
      topicId: task.topicId, title: task.title, estimatedMinutes: task.estimatedMinutes,
      questionGoal: task.questionGoal, status: "pending", notes: task.notes,
      orderIndex: (maxOrder[0]?.m ?? 0) + 1, source: "manual",
    }).returning();

    const warning = overloaded ? `${targetDate} günü planlanan süre (${projected} dk) günlük hedefi (${goals.minutesGoal} dk) aşıyor. Görevi başka bir güne dağıtmayı düşünebilirsin.` : null;
    return ok({ moved, targetDate, overloaded, warning });
  } catch {
    return serverError();
  }
}
