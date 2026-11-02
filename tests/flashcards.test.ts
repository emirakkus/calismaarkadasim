import { describe, expect, it } from "vitest";
import { getFlashcards } from "../src/lib/flashcards";
import { YKS_EA_CURRICULUM } from "../src/lib/yks-ea-curriculum";

describe("flashcard müfredatı", () => {
  const cards = getFlashcards();

  it("müfredattaki her konu için bir kısa bilgi kartı üretir", () => {
    const topicCount = YKS_EA_CURRICULUM.reduce(
      (count, course) => count + course.topics.length,
      0,
    );

    expect(cards).toHaveLength(topicCount);
    expect(
      new Set(cards.map((card) => `${card.subjectName}\u0000${card.topicName}`)).size,
    ).toBe(topicCount);
    expect(cards.every((card) => card.back.trim().length > 0)).toBe(true);
  });

  it("Türkçe TYT kartlarını da içerir", () => {
    const turkishCards = cards.filter((card) => card.subjectName === "Türkçe TYT");

    expect(turkishCards.length).toBeGreaterThan(0);
    expect(turkishCards.some((card) => card.topicName === "Sözel Mantık")).toBe(true);
  });
});
