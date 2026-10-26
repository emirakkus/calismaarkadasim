import { db } from "@/db";
import {
  studyGoals,
  milestones,
  questionLogs,
  topics,
  studySessions,
  reviewTasks,
} from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError, asInt, isValidDate } from "@/lib/api";
import { computeGoalProgress, isOverdue, type GoalType } from "@/lib/goals";
import { todayISO } from "@/lib/date";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const GOAL_TYPES = ["questions", "topics", "minutes", "mock", "review", "custom"];

async function metricsFor(start: string | null, end: string | null) {
  const qCond = [];
  if (start) qCond.push(gte(questionLogs.date, start));
  if (end) qCond.push(lte(questionLogs.date, end));
  const q = await db
    .select({ v: sql<number>`coalesce(sum(${questionLogs.total}),0)::int` })
    .from(questionLogs)
    .where(qCond.length ? and(...qCond) : undefined);

  const sCond = [];
  if (start) sCond.push(gte(studySessions.date, start));
  if (end) sCond.push(lte(studySessions.date, end));
  const m = await db
    .select({ v: sql<number>`coalesce(sum(${studySessions.minutes}),0)::int` })
    .from(studySessions)
    .where(
      sCond.length
        ? and(eq(studySessions.status, "completed"), ...sCond)
        : eq(studySessions.status, "completed"),
    );

  const tp = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(topics)
    .where(eq(topics.status, "completed"));

  const rvCond = [eq(reviewTasks.status, "completed")];
  const rv = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(reviewTasks)
    .where(and(...rvCond));

  return {
    questions: q[0]?.v ?? 0,
    minutes: m[0]?.v ?? 0,
    completedTopics: tp[0]?.v ?? 0,
    completedReviews: rv[0]?.v ?? 0,
    mockCount: 0, // Deneme sınavı modülü eklendiğinde bağlanacak
  };
}

export async function GET() {
  try {
    await ensureSeed();
    const today = todayISO();
    const goals = await db
      .select()
      .from(studyGoals)
      .orderBy(desc(studyGoals.status), asc(studyGoals.dueDate));
    const allMilestones = await db
      .select()
      .from(milestones)
      .orderBy(asc(milestones.orderIndex), asc(milestones.id));

    const result = [];
    for (const g of goals) {
      const metrics = await metricsFor(
        g.startDate as string | null,
        g.dueDate as string | null,
      );
      const progress = computeGoalProgress({
        goalType: g.goalType as GoalType,
        tracking: g.tracking as "auto" | "manual",
        targetValue: g.targetValue,
        manualValue: g.manualValue,
        metrics,
      });
      const ms = allMilestones
        .filter((m) => m.goalId === g.id)
        .map((m) => ({
          ...m,
          reached: progress.currentValue >= m.targetValue,
        }));
      result.push({
        ...g,
        ...progress,
        overdue: isOverdue(g.dueDate as string | null, today, progress.isComplete),
        milestones: ms,
      });
    }
    return ok({ goals: result });
  } catch {
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    await ensureSeed();
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    const title = String(body.title ?? "").trim();
    if (!title) return bad("Başlık boş olamaz");
    const goalType = GOAL_TYPES.includes(body.goalType) ? body.goalType : "questions";
    const targetValue = Math.max(0, asInt(body.targetValue));
    if (targetValue <= 0 && goalType !== "custom")
      return bad("Hedef değeri 0'dan büyük olmalı");

    for (const f of ["startDate", "dueDate"]) {
      if (body[f] && body[f] !== "" && !isValidDate(body[f]))
        return bad("Geçersiz tarih");
    }

    const [created] = await db
      .insert(studyGoals)
      .values({
        title,
        description: body.description ? String(body.description) : null,
        goalType,
        startDate: body.startDate || null,
        dueDate: body.dueDate || null,
        targetValue,
        tracking: body.tracking === "manual" || goalType === "custom" ? "manual" : "auto",
      })
      .returning();
    return ok({ goal: created }, { status: 201 });
  } catch {
    return serverError();
  }
}
