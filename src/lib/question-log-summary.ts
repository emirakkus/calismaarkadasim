type QuestionCounts = {
  total: number;
  correct: number;
  wrong: number;
  blank: number;
};

export function summarizeQuestionLogs(
  logs: QuestionCounts[],
): Pick<
  QuestionCounts,
  "total" | "correct" | "wrong" | "blank"
> {
  return logs.reduce(
    (summary, log) => ({
      total: summary.total + log.total,
      correct: summary.correct + log.correct,
      wrong: summary.wrong + log.wrong,
      blank: summary.blank + log.blank,
    }),
    { total: 0, correct: 0, wrong: 0, blank: 0 },
  );
}
