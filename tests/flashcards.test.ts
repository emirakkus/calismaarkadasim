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

    expect(cards).toHaveLength(268);
    expect(cards.length).toBeGreaterThan(topicCount);
    for (const course of YKS_EA_CURRICULUM) {
      for (const topic of course.topics) {
        expect(
          cards.some((card) => card.topicName === topic),
        ).toBe(true);
      }
    }
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    expect(cards.every((card) =>
      card.examType &&
      card.question.trim() &&
      card.answer.trim() &&
      card.explanation.trim() &&
      ["easy", "medium", "hard"].includes(card.difficulty),
    )).toBe(true);
    expect(cards.every((card) => card.back.trim().length > 0)).toBe(true);
  });

  it("Türkçe TYT kartlarını da içerir", () => {
    const turkishCards = cards.filter((card) => card.subjectName === "Türkçe");

    expect(turkishCards.length).toBeGreaterThan(0);
    expect(turkishCards.some((card) => card.topicName === "Sözel Mantık")).toBe(true);
    expect(turkishCards.some((card) => card.back.includes("Her şey"))).toBe(true);
    expect(
      turkishCards.some((card) => card.back.toLocaleLowerCase("tr").includes("hissetmek")),
    ).toBe(true);
  });

  it("TYT ve AYT ders listelerindeki tüm kategoriler için içerik sunar", () => {
    const tytSubjects = ["Türkçe", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü"];
    const aytSubjects = ["Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Edebiyat", "Tarih-1", "Coğrafya-1", "Tarih-2", "Coğrafya-2", "Felsefe Grubu", "Din Kültürü"];

    for (const subject of tytSubjects) {
      expect(cards.some((card) => card.examType === "TYT" && card.subjectName === subject)).toBe(true);
    }
    for (const subject of aytSubjects) {
      expect(cards.some((card) => card.examType === "AYT" && card.subjectName === subject)).toBe(true);
    }
  });
});
