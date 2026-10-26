import { db } from "@/db";
import { scheduleSlots, subjects } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, serverError } from "@/lib/api";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const slots = await db
      .select()
      .from(scheduleSlots)
      .orderBy(asc(scheduleSlots.dayOfWeek), asc(scheduleSlots.slotOrder));
    const subs = await db
      .select()
      .from(subjects)
      .orderBy(asc(subjects.name));
    return ok({ slots, subjects: subs });
  } catch {
    return serverError();
  }
}
