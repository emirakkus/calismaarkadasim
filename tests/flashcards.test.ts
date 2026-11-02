import { describe, expect, it } from "vitest";
import { getFlashcards } from "../src/lib/flashcards";
import { YKS_EA_CURRICULUM } from "../src/lib/yks-ea-curriculum";

describe("flashcard müfredatı", () => {
  const cards = getFlashcards();

  it("müfredattaki her konu için en az bir bilgi kartı üretir", () => {
    const topicCount = YKS_EA_CURRICULUM.reduce(
      (count, course) => count + course.topics.length,
      0,
    );

    expect(cards.length).toBeGreaterThan(topicCount);
    for (const course of YKS_EA_CURRICULUM) {
      for (const topic of course.topics) {
        expect(
          cards.some((card) => card.subjectName === course.subjectName && card.topicName === topic),
        ).toBe(true);
      }
    }
    expect(cards.every((card) => card.back.trim().length > 0)).toBe(true);
  });

  it("Türkçe TYT kartlarını da içerir", () => {
    const turkishCards = cards.filter((card) => card.subjectName === "Türkçe TYT");

    expect(turkishCards.length).toBeGreaterThan(0);
    expect(turkishCards.some((card) => card.topicName === "Sözel Mantık")).toBe(true);
    expect(
      turkishCards.some((card) => card.back.toLocaleLowerCase("tr").includes("her şey")),
    ).toBe(true);
    expect(
      turkishCards.some((card) => card.back.toLocaleLowerCase("tr").includes("hissetmek")),
    ).toBe(true);
  });
});
