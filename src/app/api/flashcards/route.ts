import { db } from "@/db";
import {
  flashcardDailyStudy,
  flashcardFavorites,
  flashcardProgress,
  flashcardReviewHistory,
  flashcards,
} from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { bad, ok, serverError } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { getFlashcards } from "@/lib/flashcards";
import {
  addDaysToISODate,
  FLASHCARD_DAILY_GOAL,
  getFlashcardSchedule,
  selectDailyFlashcards,
} from "@/lib/flashcard-scheduling";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

let seeded = false;

async function ensureFlashcardCatalog(): Promise<void> {
  if (seeded) return;
  const catalog = getFlashcards();
  await db
    .insert(flashcards)
    .values(
      catalog.map((card) => ({
        id: card.id,
        examType: card.examType,
        subjectName: card.subjectName,
        topicName: card.topicName,
        question: card.front,
        answer: card.back,
        explanation: card.explanation,
        difficulty: card.difficulty,
      })),
    )
    .onConflictDoNothing({ target: flashcards.id });
  seeded = true;
}

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureFlashcardCatalog();

    const today = todayISO();
    const [rows, completedTodayRows] = await Promise.all([
      db
        .select({
          id: flashcards.id,
          examType: flashcards.examType,
          subjectName: flashcards.subjectName,
          topicName: flashcards.topicName,
          question: flashcards.question,
          answer: flashcards.answer,
          explanation: flashcards.explanation,
          difficulty: flashcards.difficulty,
          status: flashcardProgress.status,
          intervalDays: flashcardProgress.intervalDays,
          dueDate: flashcardProgress.dueDate,
          isFavorite: sql<boolean>`${flashcardFavorites.id} is not null`,
        })
        .from(flashcards)
        .leftJoin(
          flashcardProgress,
          and(
            eq(flashcardProgress.cardId, flashcards.id),
            eq(flashcardProgress.userId, userId),
          ),
        )
        .leftJoin(
          flashcardFavorites,
          and(
            eq(flashcardFavorites.cardId, flashcards.id),
            eq(flashcardFavorites.userId, userId),
          ),
        ),
      db
        .select({ cardId: flashcardDailyStudy.cardId })
        .from(flashcardDailyStudy)
        .where(
          and(
            eq(flashcardDailyStudy.userId, userId),
            eq(flashcardDailyStudy.studyDate, today),
          ),
        ),
    ]);

    const completedToday = new Set(completedTodayRows.map((row) => row.cardId));
    const params = new URL(req.url).searchParams;
    const view = params.get("view") ?? "daily";
    const exam = params.get("exam");
    const subject = params.get("subject");
    const topic = params.get("topic");
    const difficulty = params.get("difficulty");

    let filtered = rows.filter((card) => {
      if (exam && card.examType !== exam) return false;
      if (subject && card.subjectName !== subject) return false;
      if (topic && card.topicName !== topic) return false;
      if (difficulty && card.difficulty !== difficulty) return false;
      if (view === "favorites" && !card.isFavorite) return false;
      if (view === "review" && !(card.dueDate && card.dueDate <= today)) return false;
      if (view === "learned" && card.status !== "learned") return false;
      if (view === "daily" && (completedToday.has(card.id) || (card.status && card.dueDate && card.dueDate > today))) return false;
      if (view === "all" && completedToday.has(card.id)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const aNew = a.status === null;
      const bNew = b.status === null;
      if (aNew !== bNew) return aNew ? -1 : 1;
      return (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.id.localeCompare(b.id);
    });

    const dailyCompleted = completedTodayRows.length;
    const filteredTotal = filtered.length;
    if (view === "daily") {
      filtered = selectDailyFlashcards(
        filtered,
        completedToday,
        Math.max(0, FLASHCARD_DAILY_GOAL - dailyCompleted),
      );
    }

    const learnedCount = rows.filter((row) => row.status === "learned").length;
    const reviewCount = rows.filter(
      (row) => row.status === "review" || (row.dueDate && row.dueDate <= today),
    ).length;

    return ok({
      cards: filtered,
      filteredTotal,
      subjects: [...new Set(rows.filter((card) => !exam || card.examType === exam).map((card) => card.subjectName))]
        .sort((a, b) => a.localeCompare(b, "tr")),
      topics: [...new Set(rows
        .filter((card) => (!exam || card.examType === exam) && (!subject || card.subjectName === subject))
        .map((card) => card.topicName))]
        .sort((a, b) => a.localeCompare(b, "tr")),
      stats: {
        total: rows.length,
        learned: learnedCount,
        review: reviewCount,
        favorites: rows.filter((row) => row.isFavorite).length,
        dailyCompleted,
        dailyGoal: FLASHCARD_DAILY_GOAL,
        dailyPercent: Math.min(100, Math.round((dailyCompleted / FLASHCARD_DAILY_GOAL) * 100)),
      },
    });
  } catch {
    return serverError("Bilgi kartları yüklenemedi");
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureFlashcardCatalog();
    const body = await req.json().catch(() => null);
    if (!body || typeof body.cardId !== "string") return bad("Geçersiz kart isteği");

    const [card] = await db
      .select({ id: flashcards.id })
      .from(flashcards)
      .where(eq(flashcards.id, body.cardId))
      .limit(1);
    if (!card) return bad("Bilgi kartı bulunamadı", 404);

    if (body.action === "favorite") {
      const [existing] = await db
        .select({ id: flashcardFavorites.id })
        .from(flashcardFavorites)
        .where(
          and(
            eq(flashcardFavorites.userId, userId),
            eq(flashcardFavorites.cardId, body.cardId),
          ),
        )
        .limit(1);
      if (existing) {
        await db.delete(flashcardFavorites).where(eq(flashcardFavorites.id, existing.id));
        return ok({ isFavorite: false });
      }
      await db
        .insert(flashcardFavorites)
        .values({ userId, cardId: body.cardId })
        .onConflictDoNothing();
      return ok({ isFavorite: true });
    }

    if (body.action !== "known" && body.action !== "repeat") {
      return bad("Kart yanıtı 'known' veya 'repeat' olmalıdır");
    }
    const rating = body.action as "known" | "repeat";
    const today = todayISO();
    const reviewedAt = new Date();

    const updatedProgress = await db.transaction(async (tx) => {
      const [previous] = await tx
        .select()
        .from(flashcardProgress)
        .where(
          and(
            eq(flashcardProgress.userId, userId),
            eq(flashcardProgress.cardId, body.cardId),
          ),
        )
        .for("update")
        .limit(1);
      const schedule = getFlashcardSchedule(
        rating,
        previous?.intervalDays ?? 0,
        previous?.repetitions ?? 0,
      );
      const { intervalDays, repetitions, status } = schedule;
      const dueDate = addDaysToISODate(today, intervalDays);
      const [progress] = await tx
        .insert(flashcardProgress)
        .values({
          userId,
          cardId: body.cardId,
          status,
          intervalDays,
          repetitions,
          dueDate,
          lastReviewedAt: reviewedAt,
          updatedAt: reviewedAt,
        })
        .onConflictDoUpdate({
          target: [flashcardProgress.userId, flashcardProgress.cardId],
          set: { status, intervalDays, repetitions, dueDate, lastReviewedAt: reviewedAt, updatedAt: reviewedAt },
        })
        .returning();
      await tx.insert(flashcardDailyStudy).values({
        userId,
        cardId: body.cardId,
        studyDate: today,
        rating,
        reviewedAt,
      }).onConflictDoNothing();
      await tx.insert(flashcardReviewHistory).values({
        userId,
        cardId: body.cardId,
        rating,
        intervalDays,
        reviewedAt,
      });
      return progress;
    });

    return ok({ progress: updatedProgress });
  } catch {
    return serverError("Kart ilerlemesi kaydedilemedi");
  }
}
