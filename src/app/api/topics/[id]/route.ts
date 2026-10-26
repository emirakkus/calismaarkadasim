import { db } from "@/db";
import { topics } from "@/db/schema";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TOPIC_STATUSES = ["pending", "in_progress", "completed"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) {
      const n = String(body.name).trim();
      if (!n) return bad("Konu adı boş olamaz");
      update.name = n;
    }
    if (body.status !== undefined) {
      if (!TOPIC_STATUSES.includes(body.status)) return bad("Geçersiz durum");
      update.status = body.status;
    }
    if (body.orderIndex !== undefined) update.orderIndex = asInt(body.orderIndex);

    const [updated] = await db
      .update(topics)
      .set(update)
      .where(eq(topics.id, asInt(id)))
      .returning();
    if (!updated) return bad("Konu bulunamadı", 404);
    return ok({ topic: updated });
  } catch {
    return serverError();
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(topics)
      .where(eq(topics.id, asInt(id)))
      .returning();
    if (!deleted) return bad("Konu bulunamadı", 404);
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
