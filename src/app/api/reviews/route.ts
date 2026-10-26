import { db } from "@/db";
import { reviewTasks, topics, subjects } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { and, asc, eq, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureSeed();
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope"); // "due" | "all"
    const today = todayISO();

    let rows;
    if (scope === "due") {
      rows = await db
        .select()
        .from(reviewTasks)
        .where(
          and(
            eq(reviewTasks.status, "pending"),
            lte(reviewTasks.scheduledDate, today),
          ),
        )
        .orderBy(asc(reviewTasks.scheduledDate), asc(reviewTasks.id));
    } else {
      rows = await db
        .select()
        .from(reviewTasks)
        .orderBy(asc(reviewTasks.status), asc(reviewTasks.scheduledDate));
    }
    return ok({ reviews: rows });
  } catch {
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    await ensureSeed();
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    const topicId = asInt(body.topicId);
    if (!topicId) return bad("Konu seçin");

    const [topic] = await db
      .select()
      .from(topics)
      .where(eq(topics.id, topicId))
      .limit(1);
    if (!topic) return bad("Konu bulunamadı", 404);

    const [subject] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, topic.subjectId))
      .limit(1);

    const stage = Math.max(1, asInt(body.stage, 1));
    const scheduledDate =
      body.scheduledDate && isValidDate(body.scheduledDate)
        ? body.scheduledDate
        : todayISO();

    // Aynı konu + aynı aşama için mükerrer kayıt engeli
    try {
      const [created] = await db
        .insert(reviewTasks)
        .values({
          topicId,
          subjectName: subject?.name ?? "Genel",
          topicName: topic.name,
          stage,
          scheduledDate,
          status: "pending",
        })
        .returning();
      return ok({ review: created }, { status: 201 });
    } catch {
      return bad("Bu konu ve aşama için zaten bir tekrar kaydı var", 409);
    }
  } catch {
    return serverError();
  }
}
