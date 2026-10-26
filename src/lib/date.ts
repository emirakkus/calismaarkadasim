// Tarih yardımcıları — tutarlı YYYY-MM-DD biçimi ve Türkçe gösterim.

export const TR_DAYS = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

export const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/** Date -> "YYYY-MM-DD" (yerel saat) */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" -> Date (yerel saat, öğlen) */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** 1 = Pazartesi ... 7 = Pazar */
export function isoDayOfWeek(s: string): number {
  const d = fromISODate(s);
  const js = d.getDay(); // 0=Pazar
  return js === 0 ? 7 : js;
}

export function addDays(s: string, n: number): string {
  const d = fromISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Verilen tarihin içinde bulunduğu haftanın Pazartesi gününü döndürür. */
export function startOfWeek(s: string): string {
  const dow = isoDayOfWeek(s); // 1..7
  return addDays(s, -(dow - 1));
}

export function weekDates(mondayISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayISO, i));
}

export function formatLongTR(s: string): string {
  const d = fromISODate(s);
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${TR_DAYS[d.getDay()]}`;
}

export function formatShortTR(s: string): string {
  const d = fromISODate(s);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function dayNameTR(s: string): string {
  return TR_DAYS[fromISODate(s).getDay()];
}
