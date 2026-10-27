import { db } from "@/db";
import { studyNotes, subjects } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const rows = await db.select().from(studyNotes).where(eq(studyNotes.userId, userId)).orderBy(desc(studyNotes.isPinned), desc(studyNotes.updatedAt));
    return ok({ notes: rows });
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
    const title = String(body.title ?? "").trim();
    if (!title) return bad("Başlık boş olamaz");
    let subjectId: number | null = null;
    let subjectName: string | null = null;
    if (body.subjectId) {
      const [s] = await db.select().from(subjects).where(eq(subjects.id, asInt(body.subjectId))).limit(1);
      if (s) { subjectId = s.id; subjectName = s.name; }
    }
    const [created] = await db.insert(studyNotes).values({
      userId, subjectId, subjectName, topicId: body.topicId ? asInt(body.topicId) : null,
      title, content: String(body.content ?? ""), tags: String(body.tags ?? "").trim(), isPinned: Boolean(body.isPinned),
    }).returning();
    return ok({ note: created }, { status: 201 });
  } catch {
    return serverError();
  }
}
