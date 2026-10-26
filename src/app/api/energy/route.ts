import { db } from "@/db";
import { energyLogs } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const rows = await db
      .select()
      .from(energyLogs)
      .orderBy(desc(energyLogs.date), desc(energyLogs.id))
      .limit(60);
    const agg = await db
      .select({
        count: sql<number>`count(*)::int`,
        avgEnergy: sql<number>`coalesce(avg(${energyLogs.energy}),0)::float`,
        avgMotivation: sql<number>`coalesce(avg(${energyLogs.motivation}),0)::float`,
      })
      .from(energyLogs);
    return ok({
      logs: rows,
      count: agg[0]?.count ?? 0,
      avgEnergy: Math.round((agg[0]?.avgEnergy ?? 0) * 10) / 10,
      avgMotivation: Math.round((agg[0]?.avgMotivation ?? 0) * 10) / 10,
    });
  } catch {
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    await ensureSeed();
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    const date = body.date && isValidDate(body.date) ? body.date : todayISO();
    const energy = asInt(body.energy);
    const motivation = asInt(body.motivation);
    if (energy < 1 || energy > 5) return bad("Enerji 1-5 arasında olmalı");
    if (motivation < 1 || motivation > 5)
      return bad("Motivasyon 1-5 arasında olmalı");

    const [created] = await db
      .insert(energyLogs)
      .values({
        date,
        energy,
        motivation,
        note: body.note ? String(body.note).slice(0, 300) : null,
      })
      .returning();
    return ok({ log: created }, { status: 201 });
  } catch {
    return serverError();
  }
}
