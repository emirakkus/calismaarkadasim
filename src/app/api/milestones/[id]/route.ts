import { db } from "@/db";
import { milestones } from "@/db/schema";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(milestones)
      .where(eq(milestones.id, asInt(id)))
      .returning();
    if (!deleted) return bad("Kilometre taşı bulunamadı", 404);
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
