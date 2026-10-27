import { db } from "@/db";
import { topics, subjects } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { and, asc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const subjectId = new URL(req.url).searchParams.get("subjectId");
    const rows = subjectId
      ? await db.select().from(topics).where(and(eq(topics.userId, userId), eq(topics.subjectId, asInt(subjectId)))).orderBy(asc(topics.orderIndex), asc(topics.id))
      : await db.select().from(topics).where(eq(topics.userId, userId)).orderBy(asc(topics.subjectId), asc(topics.orderIndex), asc(topics.id));
    return ok({ topics: rows });
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
    const subjectId = asInt(body.subjectId);
    const name = String(body.name ?? "").trim();
    if (!name) return bad("Konu adı boş olamaz");
    const sub = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
    if (!sub[0]) return bad("Geçersiz ders");
    const maxOrder = await db.select({ m: sql<number>`coalesce(max(${topics.orderIndex}),0)::int` }).from(topics).where(and(eq(topics.userId, userId), eq(topics.subjectId, subjectId)));
    const [created] = await db.insert(topics).values({
      userId, subjectId, name,
      orderIndex: body.orderIndex !== undefined ? asInt(body.orderIndex) : (maxOrder[0]?.m ?? 0) + 1,
      status: "pending",
    }).returning();
    return ok({ topic: created }, { status: 201 });
  } catch {
    return serverError();
  }
}
