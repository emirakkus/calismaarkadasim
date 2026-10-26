import { describe, it, expect } from "vitest";
import {
  toISODate,
  fromISODate,
  isoDayOfWeek,
  addDays,
  startOfWeek,
  weekDates,
} from "@/lib/date";

describe("date yardımcıları", () => {
  it("ISO biçimine çevirir", () => {
    expect(toISODate(new Date(2026, 0, 5, 10, 0))).toBe("2026-01-05");
  });

  it("ISO'dan tarih okur ve gün döndürür", () => {
    // 2026-01-05 Pazartesi
    expect(isoDayOfWeek("2026-01-05")).toBe(1);
    // 2026-01-11 Pazar
    expect(isoDayOfWeek("2026-01-11")).toBe(7);
  });

  it("gün ekler", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("haftanın pazartesisini bulur", () => {
    expect(startOfWeek("2026-01-07")).toBe("2026-01-05"); // Çarşamba -> Pazartesi
    expect(startOfWeek("2026-01-11")).toBe("2026-01-05"); // Pazar -> Pazartesi
  });

  it("hafta tarihlerini üretir", () => {
    const w = weekDates("2026-01-05");
    expect(w).toHaveLength(7);
    expect(w[0]).toBe("2026-01-05");
    expect(w[6]).toBe("2026-01-11");
  });

  it("gidiş-dönüş tutarlı", () => {
    const s = "2026-03-15";
    expect(toISODate(fromISODate(s))).toBe(s);
  });
});
