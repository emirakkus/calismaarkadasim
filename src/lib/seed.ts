import { db } from "@/db";
import {
  subjects,
  scheduleSlots,
  settings,
  examSettings,
  studyStreak,
} from "@/db/schema";
import { buildTimetable, distinctSubjects } from "@/lib/timetable";
import { and, eq, isNull, sql } from "drizzle-orm";

let globalSeeded = false;
export const DEFAULT_EXAM_DATE = "2027-06-19";

/**
 * Global (tüm kullanıcılar için ortak) veri: dersler ve haftalık ders programı.
 * Yalnızca eksikse eklenir; tekrar çağrılması veriyi çoğaltmaz.
 */
export async function ensureGlobalSeed(): Promise<void> {
  if (globalSeeded) return;

  const subs = [...distinctSubjects(), { name: "Paragraf", color: "#0d9488" }];
  for (const s of subs) {
    await db
      .insert(subjects)
      .values({ name: s.name, color: s.color })
      .onConflictDoNothing({ target: subjects.name });
  }

  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scheduleSlots);
  if ((existing[0]?.count ?? 0) === 0) {
    const entries = buildTimetable();
    if (entries.length > 0) {
      await db.insert(scheduleSlots).values(entries);
    }
  }

  globalSeeded = true;
}

/**
 * Kullanıcıya özel tekil kayıtlar (ayarlar, sınav, seri) yoksa oluşturur.
 */
export async function ensureUserData(
  userId: number,
  userName = "",
): Promise<void> {
  await ensureGlobalSeed();

  const s = await db
    .select({ id: settings.id })
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);
  if (!s[0]) {
    await db.insert(settings).values({ userId, userName }).onConflictDoNothing();
  }

  const e = await db
    .select({ id: examSettings.id })
    .from(examSettings)
    .where(eq(examSettings.userId, userId))
    .limit(1);
  if (!e[0]) {
    await db
      .insert(examSettings)
      .values({ userId, examName: "YKS", examDate: DEFAULT_EXAM_DATE })
      .onConflictDoNothing();
  } else {
    await db
      .update(examSettings)
      .set({ examName: "YKS", examDate: DEFAULT_EXAM_DATE })
      .where(
        and(
          eq(examSettings.userId, userId),
          eq(examSettings.examName, ""),
          isNull(examSettings.examDate),
        ),
      );
  }

  const st = await db
    .select({ id: studyStreak.id })
    .from(studyStreak)
    .where(eq(studyStreak.userId, userId))
    .limit(1);
  if (!st[0]) {
    await db.insert(studyStreak).values({ userId }).onConflictDoNothing();
  }
}
