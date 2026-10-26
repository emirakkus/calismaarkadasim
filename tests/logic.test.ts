import { describe, it, expect } from "vitest";
import {
  computeStreak,
  nextReviewPlan,
  classifyWeakTopic,
  safePercent,
  DEFAULT_REVIEW_INTERVALS,
} from "@/lib/logic";

describe("computeStreak", () => {
  it("veri yokken sıfır döndürür", () => {
    expect(computeStreak([], "2026-01-10")).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
    });
  });

  it("aynı gün birden fazla giriş seriyi bir kez artırır (benzersizleştirir)", () => {
    const r = computeStreak(
      ["2026-01-10", "2026-01-10", "2026-01-09"],
      "2026-01-10",
    );
    expect(r.currentStreak).toBe(2);
  });

  it("bugün çalışılmadıysa ama dün çalışıldıysa seri devam eder", () => {
    const r = computeStreak(["2026-01-08", "2026-01-09"], "2026-01-10");
    expect(r.currentStreak).toBe(2);
  });

  it("boşluk varsa mevcut seri sıfırlanır ama en uzun korunur", () => {
    const r = computeStreak(
      ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-09"],
      "2026-01-10",
    );
    expect(r.longestStreak).toBe(3);
    expect(r.currentStreak).toBe(1); // 09 -> dün
  });

  it("çok eski son çalışmada mevcut seri sıfırdır", () => {
    const r = computeStreak(["2026-01-01"], "2026-01-10");
    expect(r.currentStreak).toBe(0);
    expect(r.longestStreak).toBe(1);
  });
});

describe("nextReviewPlan", () => {
  it("orta değerlendirmede bir sonraki aşamaya geçer", () => {
    const p = nextReviewPlan(1, "medium", "2026-01-10");
    expect(p.nextStage).toBe(2);
    expect(p.intervalDays).toBe(DEFAULT_REVIEW_INTERVALS[1]); // 3
    expect(p.nextDate).toBe("2026-01-13");
  });

  it("zor değerlendirmede daha erken tekrar önerir, aşama ilerlemez", () => {
    const p = nextReviewPlan(3, "hard", "2026-01-10");
    expect(p.nextStage).toBe(3);
    expect(p.intervalDays).toBeLessThanOrEqual(DEFAULT_REVIEW_INTERVALS[2]);
    expect(p.intervalDays).toBeGreaterThanOrEqual(1);
  });

  it("kolay değerlendirmede aralık uzar", () => {
    const easy = nextReviewPlan(1, "easy", "2026-01-10");
    const medium = nextReviewPlan(1, "medium", "2026-01-10");
    expect(easy.intervalDays).toBeGreaterThan(medium.intervalDays);
  });
});

describe("classifyWeakTopic", () => {
  const base = { today: "2026-01-20", threshold: 60 };

  it("yetersiz veride kesin yargı vermez", () => {
    const r = classifyWeakTopic({
      solved: 5,
      correct: 3,
      wrong: 2,
      lastStudyDate: "2026-01-19",
      ...base,
    });
    expect(r.hasEnoughData).toBe(false);
    expect(r.accuracy).toBeNull();
  });

  it("düşük doğru oranını zayıf işaretler ve nedenini açıklar", () => {
    const r = classifyWeakTopic({
      solved: 20,
      correct: 8,
      wrong: 12,
      lastStudyDate: "2026-01-19",
      ...base,
    });
    expect(r.hasEnoughData).toBe(true);
    expect(r.accuracy).toBe(40);
    expect(r.isWeak).toBe(true);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("uzun süredir çalışılmayan konuyu sinyal olarak ekler", () => {
    const r = classifyWeakTopic({
      solved: 30,
      correct: 25,
      wrong: 5,
      lastStudyDate: "2025-12-01",
      ...base,
    });
    expect(r.reasons.some((x) => x.includes("tekrar edilmemiş"))).toBe(true);
  });

  it("iyi performansta zayıf değildir", () => {
    const r = classifyWeakTopic({
      solved: 20,
      correct: 18,
      wrong: 2,
      lastStudyDate: "2026-01-19",
      ...base,
    });
    expect(r.isWeak).toBe(false);
    expect(r.reasons).toHaveLength(0);
  });
});

describe("safePercent", () => {
  it("sıfır hedefte sıfıra bölme hatası vermez", () => {
    expect(safePercent(10, 0)).toBe(0);
  });
  it("yüzdeyi 100 ile sınırlar", () => {
    expect(safePercent(150, 100)).toBe(100);
    expect(safePercent(25, 100)).toBe(25);
  });
});
