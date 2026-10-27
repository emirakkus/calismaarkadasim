import { describe, expect, it } from "vitest";
import { summarizeQuestionLogs } from "../src/lib/question-log-summary";

describe("summarizeQuestionLogs", () => {
  it("adds manual and task-generated question logs", () => {
    expect(
      summarizeQuestionLogs([
        { total: 20, correct: 14, wrong: 4, blank: 2 },
        { total: 50, correct: 0, wrong: 0, blank: 0 },
      ]),
    ).toEqual({ total: 70, correct: 14, wrong: 4, blank: 2 });
  });

  it("returns zero counts when there are no logs", () => {
    expect(summarizeQuestionLogs([])).toEqual({
      total: 0,
      correct: 0,
      wrong: 0,
      blank: 0,
    });
  });
});
