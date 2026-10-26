import { db } from "@/db";
import { reviewTasks } from "@/db/schema";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { nextReviewPlan } from "@/lib/logic";
import { todayISO } from "@/lib/date";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Tekrarı tamamlar, hatırlama değerlendirmesine göre bir sonraki tekrarı planlar.
 * Aynı konu+aşama için mükerrer kayıt oluşmaz (onConflictDoNothing).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const rating = ["easy", "medium", "hard"].includes(body?.rating)
      ? (body.rating as "easy" | "medium" | "hard")
      : "medium";

    const [review] = await db
      .select()
      .from(reviewTasks)
      .where(eq(reviewTasks.id, asInt(id)))
      .limit(1);
    if (!review) return bad("Tekrar kaydı bulunamadı", 404);
    if (review.status === "completed")
      return bad("Bu tekrar zaten tamamlanmış", 409);

    await db
      .update(reviewTasks)
      .set({
        status: "completed",
        recallRating: rating,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reviewTasks.id, review.id));

    const today = todayISO();
    const plan = nextReviewPlan(review.stage, rating, today);

    let nextReview = null;
    const [created] = await db
      .insert(reviewTasks)
      .values({
        topicId: review.topicId,
        subjectName: review.subjectName,
        topicName: review.topicName,
        stage: plan.nextStage,
        scheduledDate: plan.nextDate,
        status: "pending",
      })
      .onConflictDoNothing({
        target: [reviewTasks.topicId, reviewTasks.stage],
      })
      .returning();
    nextReview = created ?? null;

    return ok({
      completed: true,
      nextReview,
      nextDate: plan.nextDate,
      intervalDays: plan.intervalDays,
    });
  } catch {
    return serverError();
  }
}
