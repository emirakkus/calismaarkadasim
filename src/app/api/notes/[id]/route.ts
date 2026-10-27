import { db } from "@/db";
import { studyNotes, subjects } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (!t) return bad("Başlık boş olamaz");
      update.title = t;
    }
    if (body.content !== undefined) update.content = String(body.content);
    if (body.tags !== undefined) update.tags = String(body.tags).trim();
    if (body.isPinned !== undefined) update.isPinned = Boolean(body.isPinned);
    if (body.subjectId !== undefined) {
      if (body.subjectId === null) { update.subjectId = null; update.subjectName = null; }
      else {
        const [s] = await db.select().from(subjects).where(eq(subjects.id, asInt(body.subjectId))).limit(1);
        if (s) { update.subjectId = s.id; update.subjectName = s.name; }
      }
    }
    const [updated] = await db.update(studyNotes).set(update).where(and(eq(studyNotes.id, asInt(id)), eq(studyNotes.userId, userId))).returning();
    if (!updated) return bad("Not bulunamadı", 404);
    return ok({ note: updated });
  } catch {
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const [deleted] = await db.delete(studyNotes).where(and(eq(studyNotes.id, asInt(id)), eq(studyNotes.userId, userId))).returning();
    if (!deleted) return bad("Not bulunamadı", 404);
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
