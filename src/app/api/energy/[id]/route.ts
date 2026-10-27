import { db } from "@/db";
import { energyLogs } from "@/db/schema";
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
    const update: Record<string, unknown> = {};
    if (body.energy !== undefined) {
      const e = asInt(body.energy);
      if (e < 1 || e > 5) return bad("Enerji 1-5 arasında olmalı");
      update.energy = e;
    }
    if (body.motivation !== undefined) {
      const m = asInt(body.motivation);
      if (m < 1 || m > 5) return bad("Motivasyon 1-5 arasında olmalı");
      update.motivation = m;
    }
    if (body.note !== undefined) update.note = body.note ? String(body.note).slice(0, 300) : null;
    const [updated] = await db.update(energyLogs).set(update).where(and(eq(energyLogs.id, asInt(id)), eq(energyLogs.userId, userId))).returning();
    if (!updated) return bad("Kayıt bulunamadı", 404);
    return ok({ log: updated });
  } catch {
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const [deleted] = await db.delete(energyLogs).where(and(eq(energyLogs.id, asInt(id)), eq(energyLogs.userId, userId))).returning();
    if (!deleted) return bad("Kayıt bulunamadı", 404);
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
