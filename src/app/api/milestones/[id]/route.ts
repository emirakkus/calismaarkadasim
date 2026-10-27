import { db } from "@/db";
import { milestones } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    const { id } = await params;
    const [deleted] = await db.delete(milestones).where(and(eq(milestones.id, asInt(id)), eq(milestones.userId, userId))).returning();
    if (!deleted) return bad("Kilometre taşı bulunamadı", 404);
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
