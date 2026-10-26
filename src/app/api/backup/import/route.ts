import { db } from "@/db";
import {
  subjects,
  topics,
  tasks,
  questionLogs,
  studySessions,
  dailyGoals,
  reviewTasks,
  studyNotes,
  wrongQuestions,
  studyGoals,
  milestones,
  energyLogs,
  examSettings,
  settings,
} from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { ok, bad, serverError } from "@/lib/api";
import { validateBackup } from "@/lib/backup";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Yedek doğrulama (mode=validate) veya geri yükleme (mode=replace).
 * replace: kullanıcı verisi tabloları temizlenip yeniden yüklenir; ID'ler
 * yeniden eşlenerek ilişkiler korunur. Geçersiz dosyada mevcut veri bozulmaz.
 */
export async function POST(req: Request) {
  try {
    await ensureSeed();
    const body = await req.json().catch(() => null);
    const mode = body?.mode === "replace" ? "replace" : "validate";
    const file = body?.backup;

    const validation = validateBackup(file);
    if (mode === "validate") {
      return ok({ validation });
    }
    if (!validation.valid) {
      return bad(
        "Geçersiz yedek dosyası, geri yükleme iptal edildi: " +
          validation.errors.join(" "),
      );
    }

    const data = (file as { data: Record<string, unknown[]> }).data;
    const arr = <T>(k: string): T[] => ((data[k] as T[]) ?? []);

    // İlişkileri koruyacak ID eşleme tablolarıyla replace.
    await db.transaction(async (tx) => {
      // Temizle (çocuktan ebeveyne)
      await tx.delete(milestones);
      await tx.delete(studyGoals);
      await tx.delete(energyLogs);
      await tx.delete(wrongQuestions);
      await tx.delete(studyNotes);
      await tx.delete(reviewTasks);
      await tx.delete(studySessions);
      await tx.delete(questionLogs);
      await tx.delete(tasks);
      await tx.delete(dailyGoals);
      await tx.delete(topics);
      await tx.delete(subjects);

      const subMap = new Map<number, number>();
      for (const s of arr<Record<string, unknown>>("subjects")) {
        const [row] = await tx
          .insert(subjects)
          .values({
            name: String(s.name),
            color: String(s.color ?? "#2563eb"),
          })
          .onConflictDoNothing({ target: subjects.name })
          .returning();
        let newId = row?.id;
        if (!newId) {
          const [existing] = await tx
            .select()
            .from(subjects)
            .where(eq(subjects.name, String(s.name)))
            .limit(1);
          newId = existing?.id;
        }
        if (newId) subMap.set(Number(s.id), newId);
      }

      const topicMap = new Map<number, number>();
      for (const t of arr<Record<string, unknown>>("topics")) {
        const sid = subMap.get(Number(t.subjectId));
        if (!sid) continue;
        const [row] = await tx
          .insert(topics)
          .values({
            subjectId: sid,
            name: String(t.name),
            description: t.description ? String(t.description) : null,
            orderIndex: Number(t.orderIndex ?? 0),
            estimatedMinutes: Number(t.estimatedMinutes ?? 60),
            status: String(t.status ?? "pending"),
          })
          .returning();
        if (row) topicMap.set(Number(t.id), row.id);
      }

      const taskMap = new Map<number, number>();
      for (const t of arr<Record<string, unknown>>("tasks")) {
        const [row] = await tx
          .insert(tasks)
          .values({
            date: String(t.date),
            subjectId: subMap.get(Number(t.subjectId)) ?? null,
            subjectName: String(t.subjectName ?? "Genel"),
            topicId: topicMap.get(Number(t.topicId)) ?? null,
            title: String(t.title),
            estimatedMinutes: Number(t.estimatedMinutes ?? 40),
            questionGoal: Number(t.questionGoal ?? 0),
            status: String(t.status ?? "pending"),
            notes: t.notes ? String(t.notes) : null,
            orderIndex: Number(t.orderIndex ?? 0),
            priority: String(t.priority ?? "normal"),
            isPinned: Boolean(t.isPinned),
            source: String(t.source ?? "manual"),
          })
          .returning();
        if (row) taskMap.set(Number(t.id), row.id);
      }

      for (const q of arr<Record<string, unknown>>("questionLogs")) {
        await tx.insert(questionLogs).values({
          date: String(q.date),
          subjectId: subMap.get(Number(q.subjectId)) ?? null,
          subjectName: String(q.subjectName ?? "Genel"),
          topicId: topicMap.get(Number(q.topicId)) ?? null,
          total: Number(q.total ?? 0),
          correct: Number(q.correct ?? 0),
          wrong: Number(q.wrong ?? 0),
          blank: Number(q.blank ?? 0),
          breakdownAvailable: Boolean(q.breakdownAvailable),
          note: q.note ? String(q.note) : null,
        });
      }

      for (const s of arr<Record<string, unknown>>("studySessions")) {
        await tx.insert(studySessions).values({
          date: String(s.date),
          subjectId: subMap.get(Number(s.subjectId)) ?? null,
          subjectName: String(s.subjectName ?? "Genel"),
          taskId: taskMap.get(Number(s.taskId)) ?? null,
          topicId: topicMap.get(Number(s.topicId)) ?? null,
          minutes: Number(s.minutes ?? 0),
          sessionType: String(s.sessionType ?? "manual"),
          durationSeconds: Number(s.durationSeconds ?? 0),
          status: String(s.status ?? "completed"),
        });
      }

      for (const g of arr<Record<string, unknown>>("dailyGoals")) {
        await tx
          .insert(dailyGoals)
          .values({
            date: String(g.date),
            questionGoal: Number(g.questionGoal ?? 0),
            minutesGoal: Number(g.minutesGoal ?? 0),
          })
          .onConflictDoNothing({ target: dailyGoals.date });
      }

      for (const r of arr<Record<string, unknown>>("reviewTasks")) {
        const tid = topicMap.get(Number(r.topicId));
        if (!tid) continue;
        await tx
          .insert(reviewTasks)
          .values({
            topicId: tid,
            subjectName: String(r.subjectName ?? "Genel"),
            topicName: String(r.topicName ?? ""),
            stage: Number(r.stage ?? 1),
            scheduledDate: String(r.scheduledDate),
            status: String(r.status ?? "pending"),
            recallRating: r.recallRating ? String(r.recallRating) : null,
          })
          .onConflictDoNothing({ target: [reviewTasks.topicId, reviewTasks.stage] });
      }

      for (const n of arr<Record<string, unknown>>("studyNotes")) {
        await tx.insert(studyNotes).values({
          subjectId: subMap.get(Number(n.subjectId)) ?? null,
          subjectName: n.subjectName ? String(n.subjectName) : null,
          topicId: topicMap.get(Number(n.topicId)) ?? null,
          title: String(n.title),
          content: String(n.content ?? ""),
          tags: String(n.tags ?? ""),
          isPinned: Boolean(n.isPinned),
        });
      }

      for (const w of arr<Record<string, unknown>>("wrongQuestions")) {
        await tx.insert(wrongQuestions).values({
          subjectId: subMap.get(Number(w.subjectId)) ?? null,
          subjectName: w.subjectName ? String(w.subjectName) : null,
          topicId: topicMap.get(Number(w.topicId)) ?? null,
          questionText: String(w.questionText),
          userAnswer: w.userAnswer ? String(w.userAnswer) : null,
          correctAnswer: w.correctAnswer ? String(w.correctAnswer) : null,
          mistakeReason: w.mistakeReason ? String(w.mistakeReason) : null,
          explanation: w.explanation ? String(w.explanation) : null,
          reviewStatus: String(w.reviewStatus ?? "open"),
        });
      }

      const goalMap = new Map<number, number>();
      for (const g of arr<Record<string, unknown>>("studyGoals")) {
        const [row] = await tx
          .insert(studyGoals)
          .values({
            title: String(g.title),
            description: g.description ? String(g.description) : null,
            goalType: String(g.goalType ?? "questions"),
            startDate: g.startDate ? String(g.startDate) : null,
            dueDate: g.dueDate ? String(g.dueDate) : null,
            targetValue: Number(g.targetValue ?? 0),
            manualValue: Number(g.manualValue ?? 0),
            tracking: String(g.tracking ?? "auto"),
            status: String(g.status ?? "active"),
          })
          .returning();
        if (row) goalMap.set(Number(g.id), row.id);
      }

      for (const m of arr<Record<string, unknown>>("milestones")) {
        const gid = goalMap.get(Number(m.goalId));
        if (!gid) continue;
        await tx.insert(milestones).values({
          goalId: gid,
          title: String(m.title),
          targetValue: Number(m.targetValue ?? 0),
          isCompleted: Boolean(m.isCompleted),
          orderIndex: Number(m.orderIndex ?? 0),
        });
      }

      for (const e of arr<Record<string, unknown>>("energyLogs")) {
        await tx.insert(energyLogs).values({
          date: String(e.date),
          energy: Number(e.energy ?? 3),
          motivation: Number(e.motivation ?? 3),
          note: e.note ? String(e.note) : null,
        });
      }

      // Tekil ayarlar
      const exam = (data as Record<string, unknown>).exam as
        | Record<string, unknown>
        | null
        | undefined;
      if (exam) {
        await tx
          .update(examSettings)
          .set({
            examName: String(exam.examName ?? ""),
            examDate: exam.examDate ? String(exam.examDate) : null,
            weakThreshold: Number(exam.weakThreshold ?? 60),
            updatedAt: new Date(),
          })
          .where(eq(examSettings.id, 1));
      }
      const st = (data as Record<string, unknown>).settings as
        | Record<string, unknown>
        | null
        | undefined;
      if (st) {
        await tx
          .update(settings)
          .set({
            userName: String(st.userName ?? ""),
            reminderEnabled: Boolean(st.reminderEnabled),
            reminderTime: String(st.reminderTime ?? "19:00"),
            defaultDailyQuestionGoal: Number(st.defaultDailyQuestionGoal ?? 120),
            defaultDailyMinutesGoal: Number(st.defaultDailyMinutesGoal ?? 240),
            updatedAt: new Date(),
          })
          .where(eq(settings.id, 1));
      }
    });

    return ok({ restored: true, validation });
  } catch {
    return serverError();
  }
}
