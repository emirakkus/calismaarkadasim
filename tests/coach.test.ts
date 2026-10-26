import { describe, it, expect } from "vitest";
import { fallbackCoachReply, contextToText, type CoachContext } from "@/lib/coach";

function makeCtx(overrides: Partial<CoachContext> = {}): CoachContext {
  return {
    date: "2026-01-05",
    summary: {
      date: "2026-01-05",
      questionsTotal: 0,
      questionsCorrect: 0,
      questionsWrong: 0,
      questionsBlank: 0,
      minutesStudied: 0,
      questionGoal: 120,
      minutesGoal: 240,
      tasksTotal: 0,
      tasksCompleted: 0,
      tasksInProgress: 0,
      tasksPending: 0,
      tasksPostponed: 0,
    },
    week: {
      weekStart: "2026-01-05",
      weekEnd: "2026-01-11",
      perDay: [],
      perSubjectMinutes: [],
      perSubjectQuestions: [],
      hardestSubjects: [],
      totalQuestions: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalBlank: 0,
      totalMinutes: 0,
      accuracy: null,
      tasksCompleted: 0,
      tasksTotal: 0,
      prevWeekQuestions: 0,
      prevWeekMinutes: 0,
    },
    openTasks: [],
    ...overrides,
  };
}

describe("çalışma koçu (kural tabanlı)", () => {
  it("veri yokken uydurma yapmaz, veri girişine yönlendirir", () => {
    const reply = fallbackCoachReply(makeCtx());
    expect(reply).toMatch(/Henüz/);
    expect(reply).toMatch(/veri/);
  });

  it("gerçek ilerlemeye göre soru hedefini raporlar", () => {
    const ctx = makeCtx();
    ctx.summary.questionsTotal = 60;
    const reply = fallbackCoachReply(ctx);
    expect(reply).toMatch(/60\/120/);
  });

  it("en çok zorlanılan dersi vurgular", () => {
    const ctx = makeCtx();
    ctx.summary.questionsTotal = 50;
    ctx.week.hardestSubjects = [
      { subjectName: "Geometri", accuracy: 40, total: 30 },
    ];
    const reply = fallbackCoachReply(ctx);
    expect(reply).toMatch(/Geometri/);
  });

  it("bağlam metni gerçek sayıları içerir", () => {
    const ctx = makeCtx();
    ctx.summary.minutesStudied = 90;
    const text = contextToText(ctx);
    expect(text).toMatch(/90\/240/);
  });
});
