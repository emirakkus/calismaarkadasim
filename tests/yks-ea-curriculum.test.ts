import { describe, expect, it } from "vitest";
import {
  getMissingYksEaTopics,
  YKS_EA_CURRICULUM,
} from "../src/lib/yks-ea-curriculum";

const subjects = YKS_EA_CURRICULUM.map((course, index) => ({
  id: index + 1,
  name: course.subjectName,
}));

describe("YKS EA curriculum seed", () => {
  it("creates every catalog topic with unique names per subject", () => {
    const topics = getMissingYksEaTopics([], subjects);

    expect(topics).toHaveLength(
      YKS_EA_CURRICULUM.reduce((count, course) => count + course.topics.length, 0),
    );
    expect(
      new Set(topics.map((topic) => `${topic.subjectId}\u0000${topic.name}`)).size,
    ).toBe(topics.length);
  });

  it("does not recreate topics that were already seeded", () => {
    const seededTopics = getMissingYksEaTopics([], subjects);
    const existing = seededTopics.map(({ subjectId, name, orderIndex }) => ({
      subjectId,
      name,
      orderIndex,
    }));

    expect(getMissingYksEaTopics(existing, subjects)).toEqual([]);
  });

  it("preserves existing topics and starts new order after them", () => {
    const existing = [{ subjectId: 1, name: "Sözcükte Anlam", orderIndex: 7 }];
    const topics = getMissingYksEaTopics(existing, subjects);

    expect(
      topics.some(
        (topic) =>
          topic.subjectId === 1 &&
          topic.name === "Sözcükte Anlam",
      ),
    ).toBe(false);
    expect(topics.find((topic) => topic.subjectId === 1)?.orderIndex).toBe(8);
  });

  it("fails explicitly when a curriculum subject is missing", () => {
    expect(() => getMissingYksEaTopics([], [])).toThrow(
      "YKS müfredat dersi bulunamadı: Türkçe",
    );
  });
});
