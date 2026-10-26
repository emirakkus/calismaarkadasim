import { db } from "@/db";
import { tasks } from "@/db/schema";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
import { getEffectiveGoals } from "@/lib/stats";
import { addDays } from "@/lib/date";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Görevi erteler: orijinali "postponed" yapar ve hedef güne (varsayılan ertesi
 * gün) yeni bir bekleyen görev kopyalar. Hedef gün aşırı yüklüyse uyarı döner.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const taskId = asInt(id);
    const body = await req.json().catch(() => ({}));

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task) return bad("Görev bulunamadı", 404);

    const targetDate =
      body?.targetDate && isValidDate(body.targetDate)
        ? body.targetDate
        : addDays(task.date as string, 1);

    // Hedef günün mevcut yükü
    const load = await db
      .select({
        count: sql<number>`count(*)::int`,
        minutes: sql<number>`coalesce(sum(${tasks.estimatedMinutes}),0)::int`,
      })
      .from(tasks)
      .where(eq(tasks.date, targetDate));
    const goals = await getEffectiveGoals(targetDate);
    const existingMinutes = load[0]?.minutes ?? 0;
    const projected = existingMinutes + task.estimatedMinutes;
    const overloaded = goals.minutesGoal > 0 && projected > goals.minutesGoal;

    const maxOrder = await db
      .select({ m: sql<number>`coalesce(max(${tasks.orderIndex}),0)::int` })
      .from(tasks)
      .where(eq(tasks.date, targetDate));

    await db
      .update(tasks)
      .set({ status: "postponed", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    const [moved] = await db
      .insert(tasks)
      .values({
        date: targetDate,
        subjectId: task.subjectId,
        subjectName: task.subjectName,
        topicId: task.topicId,
        title: task.title,
        estimatedMinutes: task.estimatedMinutes,
        questionGoal: task.questionGoal,
        status: "pending",
        notes: task.notes,
        orderIndex: (maxOrder[0]?.m ?? 0) + 1,
        source: "manual",
      })
      .returning();

    let warning: string | null = null;
    if (overloaded) {
      warning = `${targetDate} günü planlanan süre (${projected} dk) günlük hedefi (${goals.minutesGoal} dk) aşıyor. Görevi başka bir güne dağıtmayı düşünebilirsin.`;
    }

    return ok({ moved, targetDate, overloaded, warning });
  } catch {
    return serverError();
  }
}
