import { db } from "@/db";
import { questionLogs } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { serverError } from "@/lib/api";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Soru ve performans kayıtlarını CSV olarak indirir. */
export async function GET() {
  try {
    await ensureSeed();
    const rows = await db
      .select()
      .from(questionLogs)
      .orderBy(asc(questionLogs.date), asc(questionLogs.id));

    const header = [
      "tarih",
      "ders",
      "toplam",
      "dogru",
      "yanlis",
      "bos",
      "dogru_orani",
      "not",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      const graded = r.correct + r.wrong;
      const acc = graded >= 1 ? Math.round((r.correct / graded) * 100) : "";
      lines.push(
        [
          csvCell(r.date),
          csvCell(r.subjectName),
          csvCell(r.total),
          csvCell(r.breakdownAvailable ? r.correct : ""),
          csvCell(r.breakdownAvailable ? r.wrong : ""),
          csvCell(r.breakdownAvailable ? r.blank : ""),
          csvCell(r.breakdownAvailable ? acc : ""),
          csvCell(r.note),
        ].join(","),
      );
    }

    // Excel'in Türkçe karakterleri doğru göstermesi için BOM ekle.
    const body = "\uFEFF" + lines.join("\n");
    const filename = `soru-kayitlari-${new Date().toISOString().slice(0, 10)}.csv`;
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return serverError();
  }
}
