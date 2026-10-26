// Basit fetch yardımcısı. Hata mesajlarını Türkçe olarak yüzeye çıkarır.

export async function api<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data.error as string)) || "Bir hata oluştu";
    throw new Error(msg);
  }
  return data as T;
}

export function formatMinutes(min: number): string {
  if (min <= 0) return "0 dk";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

export function pct(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((value / goal) * 100));
}
