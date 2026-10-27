import { describe, expect, it } from "vitest";
import { questionLogForCompletedTask } from "../src/lib/task-question-log";

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
  it("creates a question log for the task goal without inventing answer counts", () => {
    expect(questionLogForCompletedTask(task)).toEqual({
      taskId: 12,
      userId: 7,
      date: "2026-10-27",
      subjectId: 3,
      subjectName: "Matematik",
      topicId: null,
      total: 50,
      correct: 0,
      wrong: 0,
      blank: 0,
      breakdownAvailable: false,
      note: null,
    });
  });

  it("does not create a question log when the task has no question goal", () => {
    expect(questionLogForCompletedTask({ ...task, questionGoal: 0 })).toBeNull();
  });
});
