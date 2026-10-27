import { db } from "@/db";
import { wrongQuestions, subjects } from "@/db/schema";
import { getUserId, unauthorized } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { ok, bad, serverError, asInt } from "@/lib/api";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    await ensureUserData(userId);
    const rows = await db.select().from(wrongQuestions).where(eq(wrongQuestions.userId, userId)).orderBy(desc(wrongQuestions.updatedAt));
    return ok({ wrongQuestions: rows });
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
    const questionText = String(body.questionText ?? "").trim();
    if (!questionText) return bad("Soru açıklaması boş olamaz");
    let subjectId: number | null = null;
    let subjectName: string | null = null;
    if (body.subjectId) {
      const [s] = await db.select().from(subjects).where(eq(subjects.id, asInt(body.subjectId))).limit(1);
      if (s) { subjectId = s.id; subjectName = s.name; }
    }
    const [created] = await db.insert(wrongQuestions).values({
      userId, subjectId, subjectName, topicId: body.topicId ? asInt(body.topicId) : null,
      questionText,
      userAnswer: body.userAnswer ? String(body.userAnswer) : null,
      correctAnswer: body.correctAnswer ? String(body.correctAnswer) : null,
      mistakeReason: body.mistakeReason ? String(body.mistakeReason) : null,
      explanation: body.explanation ? String(body.explanation) : null,
      reviewStatus: "open",
    }).returning();
    return ok({ wrongQuestion: created }, { status: 201 });
  } catch {
    return serverError();
  }
}
