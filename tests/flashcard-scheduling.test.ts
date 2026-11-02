import { describe, expect, it } from "vitest";
import {
  addDaysToISODate,
  FLASHCARD_DAILY_GOAL,
  getFlashcardSchedule,
  selectDailyFlashcards,
} from "../src/lib/flashcard-scheduling";

describe("flashcard tekrar planı", () => {
  it("günlük hedefi 10 kart olarak belirler", () => {
    expect(FLASHCARD_DAILY_GOAL).toBe(10);
  });

  it("bildikçe aralığı kademeli büyütür ve üst sınır koyar", () => {
    expect(getFlashcardSchedule("known", 0, 0).intervalDays).toBe(1);
    expect(getFlashcardSchedule("known", 1, 1).intervalDays).toBe(3);
    expect(getFlashcardSchedule("known", 3, 2).intervalDays).toBe(7);
    expect(getFlashcardSchedule("known", 60, 6).intervalDays).toBe(60);
  });

  it("tekrar gereken kartı kısa aralıkla planlar", () => {
    expect(getFlashcardSchedule("repeat", 14, 4)).toEqual({
      intervalDays: 1,
      repetitions: 0,
      status: "review",
    });
  });

  it("ayın ve yılın son günlerini doğru geçer", () => {
    expect(addDaysToISODate("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToISODate("2026-02-27", 2)).toBe("2026-03-01");
  });

  it("yeni kartları öne alırken günlük kümeye tekrar kartlarını da katar", () => {
    const candidates = [
      ...Array.from({ length: 10 }, (_, index) => ({ id: `new-${index}`, status: null })),
      ...Array.from({ length: 4 }, (_, index) => ({ id: `review-${index}`, status: "review" })),
    ];
    const daily = selectDailyFlashcards(candidates, new Set(["new-0"]), 10);

    expect(daily).toHaveLength(10);
    expect(daily.filter((card) => card.status === null)).toHaveLength(7);
    expect(daily.filter((card) => card.status === "review")).toHaveLength(3);
    expect(daily.some((card) => card.id === "new-0")).toBe(false);
  });
});
