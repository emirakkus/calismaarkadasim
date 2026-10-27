import { db } from "@/db";
import { reviewTasks, topics, subjects } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { and, asc, eq, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const scope = new URL(req.url).searchParams.get("scope");
    const today = todayISO();
    const rows = scope === "due"
      ? await db.select().from(reviewTasks).where(and(eq(reviewTasks.userId, userId), eq(reviewTasks.status, "pending"), lte(reviewTasks.scheduledDate, today))).orderBy(asc(reviewTasks.scheduledDate), asc(reviewTasks.id))
      : await db.select().from(reviewTasks).where(eq(reviewTasks.userId, userId)).orderBy(asc(reviewTasks.status), asc(reviewTasks.scheduledDate));
    return ok({ reviews: rows });
  } catch {
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    const topicId = asInt(body.topicId);
    if (!topicId) return bad("Konu seçin");
    const [topic] = await db.select().from(topics).where(and(eq(topics.id, topicId), eq(topics.userId, userId))).limit(1);
    if (!topic) return bad("Konu bulunamadı", 404);
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, topic.subjectId)).limit(1);
    const stage = Math.max(1, asInt(body.stage, 1));
    const scheduledDate = body.scheduledDate && isValidDate(body.scheduledDate) ? body.scheduledDate : todayISO();

    try {
      const [created] = await db.insert(reviewTasks).values({
        userId, topicId, subjectName: subject?.name ?? "Genel", topicName: topic.name, stage, scheduledDate, status: "pending",
      }).returning();
      return ok({ review: created }, { status: 201 });
    } catch {
      return bad("Bu konu ve aşama için zaten bir tekrar kaydı var", 409);
    }
  } catch {
    return serverError();
  }
}
