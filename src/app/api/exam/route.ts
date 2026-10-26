import { db } from "@/db";
import { examSettings } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
import { todayISO, fromISODate } from "@/lib/date";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function daysUntil(dateStr: string): number {
  const today = fromISODate(todayISO());
  const target = fromISODate(dateStr);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export async function GET() {
  try {
    await ensureSeed();
    const [row] = await db
      .select()
      .from(examSettings)
      .where(eq(examSettings.id, 1))
      .limit(1);
    const examDate = row?.examDate ?? null;
    const daysLeft = examDate ? daysUntil(examDate as string) : null;
    return ok({ exam: row, daysLeft });
  } catch {
    return serverError();
  }
}

export async function PUT(req: Request) {
  try {
    await ensureSeed();
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.examName !== undefined)
      update.examName = String(body.examName).slice(0, 80);
    if (body.examDate !== undefined) {
      if (body.examDate === null || body.examDate === "") {
        update.examDate = null;
      } else if (isValidDate(body.examDate)) {
        update.examDate = body.examDate;
      } else {
        return bad("Geçerli bir sınav tarihi girin");
      }
    }
    if (body.weakThreshold !== undefined) {
      const t = asInt(body.weakThreshold);
      if (t < 0 || t > 100) return bad("Eşik 0-100 arasında olmalı");
      update.weakThreshold = t;
    }

    const [row] = await db
      .update(examSettings)
      .set(update)
      .where(eq(examSettings.id, 1))
      .returning();

    const daysLeft = row?.examDate ? daysUntil(row.examDate as string) : null;
    return ok({ exam: row, daysLeft });
  } catch {
    return serverError();
  }
}
