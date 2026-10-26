// Küçük API yardımcıları ve doğrulama fonksiyonları.

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function serverError(message = "Sunucu hatası") {
  return Response.json({ error: message }, { status: 500 });
}

export function asInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "postponed",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
