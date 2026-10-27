type CompletedTask = {
  id: number;
  userId: number;
  date: string;
  subjectId: number | null;
  subjectName: string;
  topicId: number | null;
  questionGoal: number;
};

export function questionLogForCompletedTask(task: CompletedTask) {
  if (task.questionGoal <= 0) return null;

  return {
    taskId: task.id,
    userId: task.userId,
    date: task.date,
    subjectId: task.subjectId,
    subjectName: task.subjectName,
    topicId: task.topicId,
    total: task.questionGoal,
    correct: 0,
    wrong: 0,
    blank: 0,
    breakdownAvailable: false,
    note: null,
  };
}
