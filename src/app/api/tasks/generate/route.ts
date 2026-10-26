import { db } from "@/db";
import { tasks, scheduleSlots, subjects, dailyGoals } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError, isValidDate } from "@/lib/api";
import { getEffectiveGoals } from "@/lib/stats";
import { isoDayOfWeek } from "@/lib/date";
import { and, asc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Her ders için günlük soru hedefi.
const QUESTION_GOAL_PER_SUBJECT = 50;
// Her güne eklenen paragraf çözme hedefi.
const PARAGRAF_GOAL = 20;
const EST_MINUTES = 50;
// Soru çözülmeyen/ölçülmeyen dersler görevlendirmeye dahil edilmez.
const EXCLUDED_SUBJECTS = new Set(["Rehberlik"]);

/**
 * Belirtilen tarih için haftalık programdan GÜN BAZINDA görevleri oluşturur.
 * Saatler dikkate alınmaz: o gün işlenen her DERS için tek bir görev ve
 * 50 soru hedefi; ayrıca her güne bir paragraf çözme hedefi eklenir.
 * Aynı dersten (schedule kaynaklı) görev tekrar oluşturulmaz.
 */
export async function POST(req: Request) {
  try {
    await ensureSeed();
    const body = await req.json().catch(() => null);
    const date = body?.date;
    if (!isValidDate(date)) return bad("Geçerli bir tarih girin");

    const dow = isoDayOfWeek(date);
    const slots = await db
      .select()
      .from(scheduleSlots)
      .where(eq(scheduleSlots.dayOfWeek, dow))
      .orderBy(asc(scheduleSlots.slotOrder));

    if (slots.length === 0) {
      return ok({ created: 0, message: "Bu gün için programda ders yok." });
    }

    // O günkü benzersiz dersler (program sırasına göre)
    const seen = new Set<string>();
    const daySubjects: string[] = [];
    for (const slot of slots) {
      if (EXCLUDED_SUBJECTS.has(slot.subjectName)) continue;
      if (seen.has(slot.subjectName)) continue;
      seen.add(slot.subjectName);
      daySubjects.push(slot.subjectName);
    }

    // Üretilecek hedefler: her ders 50 soru + her güne paragraf hedefi
    const planned: { subjectName: string; questionGoal: number; title: string }[] =
      daySubjects.map((name) => ({
        subjectName: name,
        questionGoal: QUESTION_GOAL_PER_SUBJECT,
        title: `${name} — ${QUESTION_GOAL_PER_SUBJECT} soru`,
      }));
    planned.push({
      subjectName: "Paragraf",
      questionGoal: PARAGRAF_GOAL,
      title: `Paragraf Çözümü — ${PARAGRAF_GOAL} soru`,
    });

    // Daha önce bu tarihte program kaynaklı oluşturulmuş dersleri tekrar ekleme
    const existing = await db
      .select({ subjectName: tasks.subjectName })
      .from(tasks)
      .where(and(eq(tasks.date, date), eq(tasks.source, "schedule")));
    const existingNames = new Set(existing.map((e) => e.subjectName));

    const subs = await db.select().from(subjects);
    const subByName = new Map(subs.map((s) => [s.name, s]));

    const maxOrder = await db
      .select({ m: sql<number>`coalesce(max(${tasks.orderIndex}),0)::int` })
      .from(tasks)
      .where(eq(tasks.date, date));
    let order = maxOrder[0]?.m ?? 0;

    const toInsert = planned
      .filter((p) => !existingNames.has(p.subjectName))
      .map((p) => {
        order += 1;
        const sub = subByName.get(p.subjectName);
        return {
          date,
          subjectId: sub?.id ?? null,
          subjectName: p.subjectName,
          topicId: null,
          title: p.title,
          estimatedMinutes: EST_MINUTES,
          questionGoal: p.questionGoal,
          status: "pending",
          notes: null,
          orderIndex: order,
          source: "schedule",
          slotId: null,
        };
      });

    if (toInsert.length === 0) {
      return ok({
        created: 0,
        message: "Bugünün görevleri zaten oluşturulmuş.",
      });
    }

    await db.insert(tasks).values(toInsert);

    // Günlük soru hedefini, o günkü tüm görevlerin soru hedefleri toplamına ayarla
    const totals = await db
      .select({
        q: sql<number>`coalesce(sum(${tasks.questionGoal}),0)::int`,
      })
      .from(tasks)
      .where(eq(tasks.date, date));
    const questionGoal = totals[0]?.q ?? 0;
    const effective = await getEffectiveGoals(date);

    await db
      .insert(dailyGoals)
      .values({
        date,
        questionGoal,
        minutesGoal: effective.minutesGoal,
      })
      .onConflictDoUpdate({
        target: dailyGoals.date,
        set: { questionGoal },
      });

    return ok({ created: toInsert.length, dailyQuestionGoal: questionGoal });
  } catch {
    return serverError();
  }
}
