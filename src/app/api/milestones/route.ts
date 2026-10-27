import { db } from "@/db";
import { milestones, studyGoals } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { and, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    const goalId = asInt(body.goalId);
    const title = String(body.title ?? "").trim();
    if (!title) return bad("Başlık boş olamaz");
    const targetValue = Math.max(0, asInt(body.targetValue));
    const [goal] = await db.select().from(studyGoals).where(and(eq(studyGoals.id, goalId), eq(studyGoals.userId, userId))).limit(1);
    if (!goal) return bad("Hedef bulunamadı", 404);
    const maxOrder = await db.select({ m: sql<number>`coalesce(max(${milestones.orderIndex}),0)::int` }).from(milestones).where(eq(milestones.goalId, goalId));
    const [created] = await db.insert(milestones).values({ userId, goalId, title, targetValue, orderIndex: (maxOrder[0]?.m ?? 0) + 1 }).returning();
    return ok({ milestone: created }, { status: 201 });
  } catch {
    return serverError();
  }
}
