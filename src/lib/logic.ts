// Saf (yan etkisiz) iş mantığı fonksiyonları — birim testleriyle doğrulanır.

import { addDays } from "@/lib/date";

/**
 * Çalışma günü = en az bir geçerli çalışma oturumu VEYA tamamlanmış görev olan gün.
 * Verilen benzersiz çalışma tarihlerinden (YYYY-MM-DD) seriyi hesaplar.
 * Aynı gün birden fazla oturum seriyi yalnızca bir kez artırır (girdi benzersiz olmalı).
 */
export function computeStreak(
  studyDates: string[],
  today: string,
): { currentStreak: number; longestStreak: number; lastStudyDate: string | null } {
  const unique = Array.from(new Set(studyDates)).sort();
  if (unique.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  }

  // En uzun seri
  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    if (addDays(unique[i - 1], 1) === unique[i]) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }

  // Mevcut seri: bugünden veya dünden başlayan kesintisiz zincir
  const last = unique[unique.length - 1];
  let current = 0;
  if (last === today || last === addDays(today, -1)) {
    current = 1;
    for (let i = unique.length - 1; i > 0; i--) {
      if (addDays(unique[i - 1], 1) === unique[i]) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return { currentStreak: current, longestStreak: longest, lastStudyDate: last };
}

// Yapılandırılabilir başlangıç tekrar aralıkları (gün). Bilimsel garanti değildir.
export const DEFAULT_REVIEW_INTERVALS = [1, 3, 7, 14, 30];

/**
 * Bir sonraki tekrar tarihini hesaplar.
 * - zor: aralık kısaltılır (bir önceki/erken aralık), en az 1 gün sonra.
 * - orta: planlanan aşama aralığı.
 * - kolay: aşama atlanarak aralık uzatılır.
 */
export function nextReviewPlan(
  stage: number,
  rating: "easy" | "medium" | "hard",
  fromDate: string,
  intervals: number[] = DEFAULT_REVIEW_INTERVALS,
): { nextStage: number; nextDate: string; intervalDays: number } {
  const idx = Math.max(0, Math.min(stage - 1, intervals.length - 1));
  let nextStage: number;
  let intervalDays: number;

  if (rating === "hard") {
    // Daha erken tekrar: mevcut aşamanın bir öncesi (en az 1 gün)
    nextStage = stage; // aşama ilerlemez
    const prevIdx = Math.max(0, idx - 1);
    intervalDays = Math.max(1, intervals[prevIdx]);
  } else if (rating === "easy") {
    nextStage = stage + 2 <= intervals.length ? stage + 2 : intervals.length;
    const nIdx = Math.min(nextStage - 1, intervals.length - 1);
    intervalDays = intervals[nIdx];
  } else {
    nextStage = Math.min(stage + 1, intervals.length);
    const nIdx = Math.min(nextStage - 1, intervals.length - 1);
    intervalDays = intervals[nIdx];
  }

  return { nextStage, nextDate: addDays(fromDate, intervalDays), intervalDays };
}

export type WeakTopicInput = {
  solved: number;
  correct: number;
  wrong: number;
  lastStudyDate: string | null;
  today: string;
  threshold: number; // doğru oranı eşiği (%)
};

export type WeakTopicResult = {
  hasEnoughData: boolean;
  accuracy: number | null;
  daysSinceStudy: number | null;
  isWeak: boolean;
  reasons: string[];
};

/** Bir konunun zayıf olup olmadığını birden çok sinyale göre değerlendirir. */
export function classifyWeakTopic(input: WeakTopicInput): WeakTopicResult {
  const graded = input.correct + input.wrong;
  const hasEnoughData = graded >= 10;
  const accuracy = hasEnoughData
    ? Math.round((input.correct / graded) * 100)
    : null;

  let daysSinceStudy: number | null = null;
  if (input.lastStudyDate) {
    const a = new Date(input.lastStudyDate + "T00:00:00");
    const b = new Date(input.today + "T00:00:00");
    daysSinceStudy = Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  const reasons: string[] = [];
  if (hasEnoughData && accuracy !== null && accuracy < input.threshold) {
    reasons.push(
      `Doğru oranı %${accuracy}, hedef eşiğin (%${input.threshold}) altında.`,
    );
  }
  if (input.wrong >= 10 && input.wrong > input.correct) {
    reasons.push(`Yanlış sayısı yüksek (${input.wrong} yanlış).`);
  }
  if (daysSinceStudy !== null && daysSinceStudy >= 14) {
    reasons.push(`${daysSinceStudy} gündür tekrar edilmemiş.`);
  }

  return {
    hasEnoughData,
    accuracy,
    daysSinceStudy,
    isWeak: reasons.length > 0,
    reasons,
  };
}

/** Sıfıra bölme güvenli yüzde. */
export function safePercent(value: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round((value / goal) * 100));
}
