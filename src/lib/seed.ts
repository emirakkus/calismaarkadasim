import { db } from "@/db";
import {
  subjects,
  scheduleSlots,
  settings,
  examSettings,
  studyStreak,
} from "@/db/schema";
import { buildTimetable, distinctSubjects } from "@/lib/timetable";
import { sql } from "drizzle-orm";

let seeded = false;

/**
 * Programı (dersler + haftalık ders programı) ve varsayılan ayarları
 * yalnızca eksikse ekler. Tekrar çağrılması veriyi çoğaltmaz.
 */
export async function ensureSeed(): Promise<void> {
  if (seeded) return;

  // Dersler (programdaki dersler + günlük paragraf hedefi için "Paragraf")
  const subs = [...distinctSubjects(), { name: "Paragraf", color: "#0d9488" }];
  for (const s of subs) {
    await db
      .insert(subjects)
      .values({ name: s.name, color: s.color })
      .onConflictDoNothing({ target: subjects.name });
  }

  // Haftalık ders programı — yalnızca tamamen boşsa yükle
  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scheduleSlots);
  if ((existing[0]?.count ?? 0) === 0) {
    const entries = buildTimetable();
    if (entries.length > 0) {
      await db.insert(scheduleSlots).values(entries);
    }
  }

  // Ayarlar tekil kaydı
  await db
    .insert(settings)
    .values({ id: 1 })
    .onConflictDoNothing({ target: settings.id });

  // Sınav ayarı tekil kaydı
  await db
    .insert(examSettings)
    .values({ id: 1 })
    .onConflictDoNothing({ target: examSettings.id });

  // Çalışma serisi tekil kaydı
  await db
    .insert(studyStreak)
    .values({ id: 1 })
    .onConflictDoNothing({ target: studyStreak.id });

  seeded = true;
}
