// Yedek doğrulama — saf fonksiyon (birim testli).

export const CURRENT_SCHEMA_VERSION = 2;

export type BackupValidation = {
  valid: boolean;
  errors: string[];
  schemaVersion: number | null;
  counts: Record<string, number>;
};

const EXPECTED_KEYS = [
  "subjects",
  "topics",
  "tasks",
  "questionLogs",
  "studySessions",
  "dailyGoals",
  "reviewTasks",
  "studyNotes",
  "wrongQuestions",
  "studyGoals",
  "milestones",
  "energyLogs",
];

export function validateBackup(input: unknown): BackupValidation {
  const errors: string[] = [];
  const counts: Record<string, number> = {};
  let schemaVersion: number | null = null;

  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Dosya içeriği geçersiz (JSON nesnesi değil)."], schemaVersion, counts };
  }
  const obj = input as Record<string, unknown>;

  if (obj.app !== "Çalışma Yol Arkadaşım") {
    errors.push("Bu dosya Çalışma Yol Arkadaşım yedeği değil.");
  }
  if (typeof obj.schemaVersion === "number") {
    schemaVersion = obj.schemaVersion;
    if (obj.schemaVersion > CURRENT_SCHEMA_VERSION) {
      errors.push(
        `Yedek şema sürümü (${obj.schemaVersion}) bu uygulamadan yeni. Güncelleme gerekli.`,
      );
    }
  } else {
    errors.push("Şema sürümü bulunamadı.");
  }

  const data = obj.data;
  if (!data || typeof data !== "object") {
    errors.push("Veri bölümü bulunamadı.");
    return { valid: false, errors, schemaVersion, counts };
  }
  const d = data as Record<string, unknown>;
  for (const key of EXPECTED_KEYS) {
    if (d[key] === undefined) continue; // eksik anahtar tolere edilir (boş sayılır)
    if (!Array.isArray(d[key])) {
      errors.push(`"${key}" bir dizi olmalı.`);
    } else {
      counts[key] = (d[key] as unknown[]).length;
    }
  }

  return { valid: errors.length === 0, errors, schemaVersion, counts };
}
