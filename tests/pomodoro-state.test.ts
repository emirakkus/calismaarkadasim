import { describe, expect, it } from "vitest";
import { getPomodoroState, setPomodoroState } from "@/lib/pomodoro-state";

describe("Pomodoro user state isolation", () => {
  it("keeps timer state separate for each user in memory", () => {
    const firstUserState = {
      mode: "focus" as const,
      phase: "paused" as const,
      endAt: null,
      remainingMs: 300_000,
      subjectId: "1",
      focusMin: 25,
      breakMin: 5,
    };

    setPomodoroState(1, firstUserState);

    expect(getPomodoroState(1)).toEqual(firstUserState);
    expect(getPomodoroState(2)).toBeNull();
  });
});
