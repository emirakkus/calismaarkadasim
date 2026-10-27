import { db } from "@/db";
import { tasks, subjects } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    const date = body.date;
    if (!isValidDate(date)) return bad("Geçerli bir tarih girin");
    const title = String(body.title ?? "").trim();
    if (!title) return bad("Görev başlığı boş olamaz");

    let subjectName = String(body.subjectName ?? "").trim();
    let subjectId: number | null = null;
    if (body.subjectId) {
      const s = await db.select().from(subjects).where(eq(subjects.id, asInt(body.subjectId))).limit(1);
      if (s[0]) { subjectId = s[0].id; subjectName = s[0].name; }
    }
    if (!subjectName) subjectName = "Genel";

    const estimatedMinutes = Math.max(0, asInt(body.estimatedMinutes, 40));
    const questionGoal = Math.max(0, asInt(body.questionGoal, 0));
    const maxOrder = await db.select({ m: sql<number>`coalesce(max(${tasks.orderIndex}),0)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.date, date)));

    const [created] = await db.insert(tasks).values({
      userId, date, subjectId, subjectName,
      topicId: body.topicId ? asInt(body.topicId) : null,
      title, estimatedMinutes, questionGoal, status: "pending",
      notes: body.notes ? String(body.notes) : null,
      orderIndex: (maxOrder[0]?.m ?? 0) + 1, source: "manual",
    }).returning();
    return ok({ task: created }, { status: 201 });
  } catch {
    return serverError();
  }
}
