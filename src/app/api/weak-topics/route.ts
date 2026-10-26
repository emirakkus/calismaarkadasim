import { db } from "@/db";
import { questionLogs, topics, subjects, examSettings } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, serverError } from "@/lib/api";
import { classifyWeakTopic } from "@/lib/logic";
import { todayISO } from "@/lib/date";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Konu bazında performans analizi. Soru kayıtlarında konu (topicId) seçilmiş
 * veriler değerlendirilir. Yeterli veri yoksa kesin başarı yargısı verilmez.
 */
export async function GET() {
  try {
    await ensureSeed();
    const [exam] = await db
      .select()
      .from(examSettings)
      .where(eq(examSettings.id, 1))
      .limit(1);
    const threshold = exam?.weakThreshold ?? 60;
    const today = todayISO();

    const rows = await db
      .select({
        topicId: questionLogs.topicId,
        solved: sql<number>`coalesce(sum(${questionLogs.total}),0)::int`,
        correct: sql<number>`coalesce(sum(${questionLogs.correct}),0)::int`,
        wrong: sql<number>`coalesce(sum(${questionLogs.wrong}),0)::int`,
        lastDate: sql<string | null>`max(${questionLogs.date})`,
      })
      .from(questionLogs)
      .where(sql`${questionLogs.topicId} is not null`)
      .groupBy(questionLogs.topicId);

    const topicRows = await db
      .select({
        id: topics.id,
        name: topics.name,
        subjectId: topics.subjectId,
      })
      .from(topics);
    const topicMap = new Map(topicRows.map((t) => [t.id, t]));
    const subRows = await db.select().from(subjects);
    const subMap = new Map(subRows.map((s) => [s.id, s.name]));

    const analysis = rows
      .filter((r) => r.topicId != null && topicMap.has(r.topicId))
      .map((r) => {
        const topic = topicMap.get(r.topicId as number)!;
        const result = classifyWeakTopic({
          solved: r.solved,
          correct: r.correct,
          wrong: r.wrong,
          lastStudyDate: r.lastDate,
          today,
          threshold,
        });
        return {
          topicId: r.topicId,
          topicName: topic.name,
          subjectName: subMap.get(topic.subjectId) ?? "Genel",
          solved: r.solved,
          correct: r.correct,
          wrong: r.wrong,
          lastStudyDate: r.lastDate,
          ...result,
          // Önerilen çalışma süresi: zayıflık sinyali sayısına göre kabaca.
          suggestedMinutes: result.isWeak ? 30 + result.reasons.length * 15 : 0,
        };
      });

    const weak = analysis
      .filter((a) => a.isWeak)
      .sort((a, b) => {
        const aa = a.accuracy ?? 101;
        const ba = b.accuracy ?? 101;
        return aa - ba;
      });
    const insufficient = analysis.filter((a) => !a.hasEnoughData);

    return ok({ threshold, analysis, weak, insufficient });
  } catch {
    return serverError();
  }
}
