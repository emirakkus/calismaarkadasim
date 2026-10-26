// Programdan birebir çıkarılan haftalık ders programı.
// Kaynak: kullanıcının sağladığı program görseli.
// Değiştirilmeden/eksiltmeden yapılandırılmıştır.

export type TimetableEntry = {
  dayOfWeek: number; // 1 = Pazartesi ... 7 = Pazar
  startTime: string;
  endTime: string;
  slotOrder: number;
  subjectName: string;
  teacher: string | null;
};

export const TIME_SLOTS: { start: string; end: string }[] = [
  { start: "10.00", end: "10.40" },
  { start: "10.50", end: "11.30" },
  { start: "11.40", end: "12.20" },
  { start: "12.30", end: "13.10" },
  { start: "13.50", end: "14.30" },
  { start: "14.40", end: "15.20" },
];

// Gün -> 6 slot. null = boş.
type Cell = { subject: string; teacher: string | null } | null;

const GRID: Record<number, Cell[]> = {
  // Pazartesi
  1: [
    { subject: "Türk Dili ve Edebiyatı", teacher: "Ömer Ertekin" },
    { subject: "Türk Dili ve Edebiyatı", teacher: "Ömer Ertekin" },
    { subject: "Coğrafya", teacher: "Erdem Karaoğlu" },
    { subject: "Coğrafya", teacher: "Erdem Karaoğlu" },
    { subject: "Matematik TYT", teacher: "Cansu Sefer" },
    { subject: "Soru Çözümü", teacher: "Cansu Sefer" },
  ],
  // Salı
  2: [
    { subject: "Geometri", teacher: "Serkan Doğan" },
    { subject: "Geometri", teacher: "Serkan Doğan" },
    { subject: "Türkçe", teacher: "Ömer Ertekin" },
    { subject: "Matematik AYT", teacher: "Mustafa Demir" },
    { subject: "Matematik AYT", teacher: "Mustafa Demir" },
    { subject: "Felsefe", teacher: "Ayşenur Cicili" },
  ],
  // Çarşamba
  3: [
    { subject: "Tarih", teacher: "Gözde Orhan" },
    { subject: "Tarih", teacher: "Gözde Orhan" },
    { subject: "Matematik TYT", teacher: "Cansu Sefer" },
    { subject: "Matematik TYT", teacher: "Cansu Sefer" },
    { subject: "Türkçe", teacher: "Ömer Ertekin" },
    { subject: "Matematik AYT", teacher: "Mustafa Demir" },
  ],
  // Perşembe
  4: [
    { subject: "Tarih", teacher: "Gözde Orhan" },
    { subject: "Rehberlik", teacher: "Ayşegül Kibaroğlu" },
    { subject: "Soru Çözümü", teacher: "Cansu Sefer" },
    { subject: "Soru Çözümü", teacher: "Behime İrem Bulut" },
    { subject: "Soru Çözümü", teacher: "Behime İrem Bulut" },
    { subject: "Coğrafya", teacher: "Erdem Karaoğlu" },
  ],
  // Cuma, Cumartesi, Pazar — programda boş
  5: [null, null, null, null, null, null],
  6: [null, null, null, null, null, null],
  7: [null, null, null, null, null, null],
};

export function buildTimetable(): TimetableEntry[] {
  const entries: TimetableEntry[] = [];
  for (let day = 1; day <= 7; day++) {
    const cells = GRID[day];
    cells.forEach((cell, i) => {
      if (!cell) return;
      entries.push({
        dayOfWeek: day,
        startTime: TIME_SLOTS[i].start,
        endTime: TIME_SLOTS[i].end,
        slotOrder: i + 1,
        subjectName: cell.subject,
        teacher: cell.teacher,
      });
    });
  }
  return entries;
}

export function distinctSubjects(): { name: string; color: string }[] {
  const palette: Record<string, string> = {
    "Türk Dili ve Edebiyatı": "#db2777",
    Türkçe: "#e11d48",
    Coğrafya: "#16a34a",
    "Matematik TYT": "#2563eb",
    "Matematik AYT": "#1d4ed8",
    Geometri: "#0891b2",
    Tarih: "#b45309",
    Felsefe: "#7c3aed",
    Rehberlik: "#4b5563",
    "Soru Çözümü": "#ea580c",
  };
  const seen = new Set<string>();
  const list: { name: string; color: string }[] = [];
  for (const e of buildTimetable()) {
    if (seen.has(e.subjectName)) continue;
    seen.add(e.subjectName);
    list.push({ name: e.subjectName, color: palette[e.subjectName] ?? "#2563eb" });
  }
  return list;
}
