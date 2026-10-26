import { describe, it, expect } from "vitest";
import { buildTimetable, distinctSubjects, TIME_SLOTS } from "@/lib/timetable";

describe("ders programı", () => {
  const entries = buildTimetable();

  it("Pazartesi-Perşembe 6'şar dolu slot içerir (24 ders)", () => {
    const filledDays = entries.filter((e) => e.dayOfWeek <= 4);
    expect(filledDays).toHaveLength(24);
  });

  it("Cuma, Cumartesi, Pazar boştur", () => {
    expect(entries.filter((e) => e.dayOfWeek >= 5)).toHaveLength(0);
  });

  it("Pazartesi ilk ders Türk Dili ve Edebiyatı / Ömer Ertekin", () => {
    const first = entries.find((e) => e.dayOfWeek === 1 && e.slotOrder === 1);
    expect(first?.subjectName).toBe("Türk Dili ve Edebiyatı");
    expect(first?.teacher).toBe("Ömer Ertekin");
  });

  it("zaman dilimleri doğru", () => {
    expect(TIME_SLOTS[0]).toEqual({ start: "10.00", end: "10.40" });
    expect(TIME_SLOTS[5]).toEqual({ start: "14.40", end: "15.20" });
  });

  it("programdaki tüm dersleri benzersiz çıkarır", () => {
    const subs = distinctSubjects().map((s) => s.name);
    expect(subs).toContain("Matematik TYT");
    expect(subs).toContain("Matematik AYT");
    expect(subs).toContain("Geometri");
    expect(subs).toContain("Rehberlik");
    // Benzersiz olmalı
    expect(new Set(subs).size).toBe(subs.length);
  });
});
