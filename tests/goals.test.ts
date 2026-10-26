import { describe, it, expect } from "vitest";
import { computeGoalProgress, isOverdue } from "@/lib/goals";

const metrics = {
  questions: 300,
  completedTopics: 5,
  minutes: 1200,
  mockCount: 2,
  completedReviews: 8,
};

describe("computeGoalProgress", () => {
  it("otomatik soru hedefinde kayıt toplamını kullanır", () => {
    const r = computeGoalProgress({
      goalType: "questions",
      tracking: "auto",
      targetValue: 600,
      manualValue: 0,
      metrics,
    });
    expect(r.currentValue).toBe(300);
    expect(r.percent).toBe(50);
    expect(r.isComplete).toBe(false);
  });

  it("hedefe ulaşıldığında tamamlanır ve yüzde 100'de sınırlanır", () => {
    const r = computeGoalProgress({
      goalType: "minutes",
      tracking: "auto",
      targetValue: 1000,
      manualValue: 0,
      metrics,
    });
    expect(r.currentValue).toBe(1200);
    expect(r.percent).toBe(100);
    expect(r.isComplete).toBe(true);
  });

  it("özel hedefte elle değeri kullanır", () => {
    const r = computeGoalProgress({
      goalType: "custom",
      tracking: "manual",
      targetValue: 10,
      manualValue: 4,
      metrics,
    });
    expect(r.currentValue).toBe(4);
    expect(r.percent).toBe(40);
  });

  it("hedef sıfırsa sıfıra bölme hatası vermez", () => {
    const r = computeGoalProgress({
      goalType: "custom",
      tracking: "manual",
      targetValue: 0,
      manualValue: 5,
      metrics,
    });
    expect(r.percent).toBe(0);
    expect(r.isComplete).toBe(false);
  });
});

describe("isOverdue", () => {
  it("son tarih geçmişse ve tamamlanmamışsa gecikmiştir", () => {
    expect(isOverdue("2026-01-01", "2026-01-10", false)).toBe(true);
  });
  it("tamamlanmışsa gecikme sayılmaz", () => {
    expect(isOverdue("2026-01-01", "2026-01-10", true)).toBe(false);
  });
  it("tarih yoksa gecikme yoktur", () => {
    expect(isOverdue(null, "2026-01-10", false)).toBe(false);
  });
});
