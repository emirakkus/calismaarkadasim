import { db } from "@/db";
import { milestones, studyGoals } from "@/db/schema";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    const goalId = asInt(body.goalId);
    const title = String(body.title ?? "").trim();
    if (!title) return bad("Başlık boş olamaz");
    const targetValue = Math.max(0, asInt(body.targetValue));

    const [goal] = await db
      .select()
      .from(studyGoals)
      .where(eq(studyGoals.id, goalId))
      .limit(1);
    if (!goal) return bad("Hedef bulunamadı", 404);

    const maxOrder = await db
      .select({ m: sql<number>`coalesce(max(${milestones.orderIndex}),0)::int` })
      .from(milestones)
      .where(eq(milestones.goalId, goalId));

    const [created] = await db
      .insert(milestones)
      .values({
        goalId,
        title,
        targetValue,
        orderIndex: (maxOrder[0]?.m ?? 0) + 1,
      })
      .returning();
    return ok({ milestone: created }, { status: 201 });
  } catch {
    return serverError();
  }
}
