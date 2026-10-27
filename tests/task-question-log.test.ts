import { describe, expect, it } from "vitest";
import {
  isValidTaskQuestionBreakdown,
  questionLogForCompletedTask,
} from "../src/lib/task-question-log";

const task = {
  id: 12,
  userId: 7,
  date: "2026-10-27",
  subjectId: 3,
  subjectName: "Matematik",
  topicId: null,
  questionGoal: 50,
};

describe("questionLogForCompletedTask", () => {
  it("does not create a question log without actual answer counts", () => {
    expect(questionLogForCompletedTask(task)).toBeNull();
  });

  it("does not create a question log when the task has no question goal", () => {
    expect(questionLogForCompletedTask({ ...task, questionGoal: 0 })).toBeNull();
  });

  it("records correct, wrong, and remaining questions as blank", () => {
    expect(questionLogForCompletedTask(task, { correct: 35, wrong: 10 })).toEqual({
      taskId: 12,
      userId: 7,
      date: "2026-10-27",
      subjectId: 3,
      subjectName: "Matematik",
      topicId: null,
      total: 50,
      correct: 35,
      wrong: 10,
      blank: 5,
      breakdownAvailable: true,
      note: null,
    });
  });

  it("rejects counts that exceed the task goal or are not whole numbers", () => {
    expect(isValidTaskQuestionBreakdown(50, { correct: 30, wrong: 20 })).toBe(true);
    expect(isValidTaskQuestionBreakdown(50, { correct: 30, wrong: 21 })).toBe(false);
    expect(isValidTaskQuestionBreakdown(50, { correct: 30.5, wrong: 10 })).toBe(false);
  });
});
