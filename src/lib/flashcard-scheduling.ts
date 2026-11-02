export type FlashcardRating = "known" | "repeat";

export function getFlashcardSchedule(
  rating: FlashcardRating,
  previousIntervalDays: number,
  previousRepetitions: number,
): { intervalDays: number; repetitions: number; status: "learned" | "review" } {
  if (rating === "repeat") {
    return {
      intervalDays: 1,
      repetitions: 0,
      status: "review",
    };
  }

  const intervalDays =
    previousRepetitions === 0
      ? 1
      : previousRepetitions === 1
        ? 3
        : previousRepetitions === 2
          ? 7
          : Math.min(60, Math.max(1, previousIntervalDays) * 2);

  return {
    intervalDays,
    repetitions: previousRepetitions + 1,
    status: "learned",
  };
}

export function addDaysToISODate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}`;
}

export const FLASHCARD_DAILY_GOAL = 10;

export function selectDailyFlashcards<T extends { id: string; status: string | null }>(
  candidates: T[],
  alreadyStudiedIds: ReadonlySet<string>,
  remaining: number,
  reviewSlots = 3,
): T[] {
  const available = candidates.filter((card) => !alreadyStudiedIds.has(card.id));
  const newCards = available.filter((card) => card.status === null);
  const reviews = available.filter((card) => card.status !== null);
  const takeReviews = Math.min(reviewSlots, remaining, reviews.length);
  const takeNew = Math.min(remaining - takeReviews, newCards.length);
  const selected = [...newCards.slice(0, takeNew), ...reviews.slice(0, takeReviews)];
  const selectedIds = new Set(selected.map((card) => card.id));

  if (selected.length < remaining) {
    selected.push(
      ...available
        .filter((card) => !selectedIds.has(card.id))
        .slice(0, remaining - selected.length),
    );
  }
  return selected;
}
