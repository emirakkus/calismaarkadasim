// Hedef ilerleme hesaplama — saf fonksiyonlar (birim testli).

import { safePercent } from "@/lib/logic";

export type GoalType =
  | "questions"
  | "topics"
  | "minutes"
  | "mock"
  | "review"
  | "custom";

export type GoalProgressInput = {
  goalType: GoalType;
  tracking: "auto" | "manual";
  targetValue: number;
  manualValue: number;
  // Otomatik kaynak toplamları (hedef döneminde)
  metrics: {
    questions: number;
    completedTopics: number;
    minutes: number;
    mockCount: number;
    completedReviews: number;
  };
};

export type GoalProgress = {
  currentValue: number;
  targetValue: number;
  percent: number;
  isComplete: boolean;
};

/** Hedefin mevcut değerini türüne göre seçer (manuel veya otomatik). */
export function computeGoalProgress(input: GoalProgressInput): GoalProgress {
  let currentValue: number;
  if (input.tracking === "manual" || input.goalType === "custom") {
    currentValue = input.manualValue;
  } else {
    switch (input.goalType) {
      case "questions":
        currentValue = input.metrics.questions;
        break;
      case "topics":
        currentValue = input.metrics.completedTopics;
        break;
      case "minutes":
        currentValue = input.metrics.minutes;
        break;
      case "mock":
        currentValue = input.metrics.mockCount;
        break;
      case "review":
        currentValue = input.metrics.completedReviews;
        break;
      default:
        currentValue = input.manualValue;
    }
  }

  const percent = safePercent(currentValue, input.targetValue);
  return {
    currentValue,
    targetValue: input.targetValue,
    percent,
    isComplete: input.targetValue > 0 && currentValue >= input.targetValue,
  };
}

export function isOverdue(
  dueDate: string | null,
  today: string,
  isComplete: boolean,
): boolean {
  if (!dueDate || isComplete) return false;
  return dueDate < today;
}
