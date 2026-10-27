export type PomodoroState = {
  mode: "focus" | "break";
  phase: "idle" | "running" | "paused";
  endAt: number | null;
  remainingMs: number;
  subjectId: string;
  focusMin: number;
  breakMin: number;
};

const states = new Map<number, PomodoroState>();

export function getPomodoroState(userId: number): PomodoroState | null {
  return states.get(userId) ?? null;
}

export function setPomodoroState(userId: number, state: PomodoroState): void {
  states.set(userId, state);
}
