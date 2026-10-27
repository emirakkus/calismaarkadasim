import { db } from "@/db";
import { studySessions, tasks, studyStreak } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { computeStreak } from "@/lib/logic";
import { todayISO } from "@/lib/date";

/** Kullanıcının çalışma günü olan tüm benzersiz tarihleri döndürür. */
export async function getStudyDates(userId: number): Promise<string[]> {
  const sessionDates = await db
    .selectDistinct({ d: studySessions.date })
    .from(studySessions)
    .where(
      and(eq(studySessions.userId, userId), eq(studySessions.status, "completed")),
    );

  const taskDates = await db
    .selectDistinct({ d: tasks.date })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, "completed")));

  const set = new Set<string>();
  for (const r of sessionDates) if (r.d) set.add(r.d as string);
  for (const r of taskDates) if (r.d) set.add(r.d as string);
  return Array.from(set);
}

/** Seriyi gerçek verilerden yeniden hesaplar ve kaydeder. */
export async function recomputeStreak(userId: number): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}> {
  const dates = await getStudyDates(userId);
  const result = computeStreak(dates, todayISO());
  await db
    .insert(studyStreak)
    .values({
      userId,
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
      lastStudyDate: result.lastStudyDate,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: studyStreak.userId,
      set: {
        currentStreak: result.currentStreak,
        longestStreak: result.longestStreak,
        lastStudyDate: result.lastStudyDate,
        updatedAt: new Date(),
      },
    });
  return result;
}

/** Bu hafta çalışılan gün sayısı (Pazartesi-Pazar). */
export async function getWeekActiveDays(
  userId: number,
  weekStart: string,
  weekEnd: string,
): Promise<number> {
  const dates = await getStudyDates(userId);
  return dates.filter((d) => d >= weekStart && d <= weekEnd).length;
}
