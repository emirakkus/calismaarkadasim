type CompletedTask = {
  id: number;
  userId: number;
  date: string;
  subjectId: number | null;
  subjectName: string;
  topicId: number | null;
  questionGoal: number;
};

export type TaskQuestionBreakdown = {
  correct: number;
  wrong: number;
};

export function isValidTaskQuestionBreakdown(
  questionGoal: number,
  breakdown: TaskQuestionBreakdown,
): boolean {
  return (
    Number.isInteger(breakdown.correct) &&
    Number.isInteger(breakdown.wrong) &&
    breakdown.correct >= 0 &&
    breakdown.wrong >= 0 &&
    breakdown.correct + breakdown.wrong <= questionGoal
  );
}

export function questionLogForCompletedTask(
  task: CompletedTask,
  breakdown?: TaskQuestionBreakdown,
) {
  if (task.questionGoal <= 0) return null;
  if (breakdown && !isValidTaskQuestionBreakdown(task.questionGoal, breakdown)) {
    throw new Error("Doğru ve yanlış soru sayıları hedefi aşamaz");
  }

  return {
    taskId: task.id,
    userId: task.userId,
    date: task.date,
    subjectId: task.subjectId,
    subjectName: task.subjectName,
    topicId: task.topicId,
    total: task.questionGoal,
    correct: breakdown?.correct ?? 0,
    wrong: breakdown?.wrong ?? 0,
    blank: breakdown ? task.questionGoal - breakdown.correct - breakdown.wrong : 0,
    breakdownAvailable: Boolean(breakdown),
    note: null,
  };
}
