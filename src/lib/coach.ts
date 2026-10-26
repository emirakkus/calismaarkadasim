import { getDailySummary, getWeeklyStats } from "@/lib/stats";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { todayISO, startOfWeek, formatLongTR } from "@/lib/date";

export type CoachContext = {
  date: string;
  summary: Awaited<ReturnType<typeof getDailySummary>>;
  week: Awaited<ReturnType<typeof getWeeklyStats>>;
  openTasks: { title: string; subjectName: string; status: string }[];
};

export async function buildCoachContext(date: string): Promise<CoachContext> {
  const summary = await getDailySummary(date);
  const week = await getWeeklyStats(startOfWeek(date));
  const openTasks = await db
    .select({
      title: tasks.title,
      subjectName: tasks.subjectName,
      status: tasks.status,
    })
    .from(tasks)
    .where(
      and(eq(tasks.date, date), inArray(tasks.status, ["pending", "in_progress"])),
    );
  return { date, summary, week, openTasks };
}

/** LLM için gerçek verilere dayalı bağlam metni. */
export function contextToText(ctx: CoachContext): string {
  const s = ctx.summary;
  const w = ctx.week;
  const lines: string[] = [];
  lines.push(`Tarih: ${formatLongTR(ctx.date)}`);
  lines.push(
    `Bugün soru: ${s.questionsTotal}/${s.questionGoal} hedef. Doğru ${s.questionsCorrect}, yanlış ${s.questionsWrong}, boş ${s.questionsBlank}.`,
  );
  lines.push(
    `Bugün çalışma süresi: ${s.minutesStudied}/${s.minutesGoal} dk hedef.`,
  );
  lines.push(
    `Bugünün görevleri: toplam ${s.tasksTotal}, tamamlanan ${s.tasksCompleted}, devam eden ${s.tasksInProgress}, bekleyen ${s.tasksPending}, ertelenen ${s.tasksPostponed}.`,
  );
  if (ctx.openTasks.length > 0) {
    lines.push(
      "Tamamlanmamış görevler: " +
        ctx.openTasks.map((t) => `${t.subjectName} - ${t.title}`).join("; "),
    );
  }
  lines.push(
    `Bu hafta: toplam ${w.totalQuestions} soru, ${w.totalMinutes} dk çalışma, görevlerin ${w.tasksCompleted}/${w.tasksTotal} tamamlandı.`,
  );
  lines.push(
    w.accuracy !== null
      ? `Bu haftaki doğru oranı: %${w.accuracy} (yeterli veri var).`
      : "Bu hafta doğru oranı için yeterli veri yok.",
  );
  if (w.hardestSubjects.length > 0) {
    lines.push(
      "En çok zorlanılan dersler: " +
        w.hardestSubjects
          .map((h) => `${h.subjectName} (%${h.accuracy})`)
          .join(", "),
    );
  }
  lines.push(
    `Geçen haftaya göre: soru ${w.prevWeekQuestions} -> ${w.totalQuestions}, süre ${w.prevWeekMinutes} -> ${w.totalMinutes} dk.`,
  );
  return lines.join("\n");
}

/** API anahtarı yokken kullanılan kural tabanlı koç yanıtı. */
export function fallbackCoachReply(ctx: CoachContext, userMessage?: string): string {
  const s = ctx.summary;
  const w = ctx.week;
  const parts: string[] = [];

  const hasAnyData =
    s.questionsTotal > 0 || s.minutesStudied > 0 || s.tasksTotal > 0;

  if (!hasAnyData && w.totalQuestions === 0 && w.totalMinutes === 0) {
    parts.push(
      "Henüz bugüne veya bu haftaya ait çalışma verisi yok. Programdan günlük görevlerini oluşturup ilk soru çözümlerini ve çalışma sürelerini girdikçe sana gerçek verilere dayalı öneriler sunabilirim.",
    );
    return parts.join("\n\n");
  }

  // Bugünün durumu
  const qPct = s.questionGoal > 0 ? Math.round((s.questionsTotal / s.questionGoal) * 100) : 0;
  const mPct = s.minutesGoal > 0 ? Math.round((s.minutesStudied / s.minutesGoal) * 100) : 0;

  if (s.questionGoal > 0) {
    if (s.questionsTotal >= s.questionGoal) {
      parts.push(`Bugünkü soru hedefini tamamladın (${s.questionsTotal}/${s.questionGoal}). Harika gidiyorsun.`);
    } else {
      parts.push(
        `Bugün soru hedefinin %${qPct}'ini tamamladın (${s.questionsTotal}/${s.questionGoal}). Hedefe ${s.questionGoal - s.questionsTotal} soru kaldı.`,
      );
    }
  }

  if (s.minutesGoal > 0) {
    parts.push(
      s.minutesStudied >= s.minutesGoal
        ? `Çalışma süresi hedefine ulaştın (${s.minutesStudied}/${s.minutesGoal} dk).`
        : `Çalışma süresinde hedefin %${mPct}'indesin (${s.minutesStudied}/${s.minutesGoal} dk).`,
    );
  }

  if (ctx.openTasks.length > 0) {
    parts.push(
      `Bugün tamamlanmamış ${ctx.openTasks.length} görev var: ${ctx.openTasks
        .slice(0, 4)
        .map((t) => t.subjectName)
        .join(", ")}. Önce en kısa süreli göreve başlayıp ivme kazanabilirsin.`,
    );
  } else if (s.tasksTotal > 0) {
    parts.push("Bugünün tüm görevlerini tamamlamışsın, tebrikler!");
  }

  if (w.hardestSubjects.length > 0) {
    const h = w.hardestSubjects[0];
    parts.push(
      `Bu hafta en düşük doğru oranı ${h.subjectName} dersinde (%${h.accuracy}). Bu derste konu tekrarına ve yanlış analizi yapmaya ağırlık vermeni öneririm.`,
    );
  }

  // Haftalık karşılaştırma
  if (w.prevWeekQuestions > 0 || w.totalQuestions > 0) {
    if (w.totalQuestions >= w.prevWeekQuestions) {
      parts.push(
        `Bu hafta geçen haftaya göre daha çok soru çözdün (${w.prevWeekQuestions} -> ${w.totalQuestions}). Tempoyu koru.`,
      );
    } else {
      parts.push(
        `Bu hafta geçen haftaya göre daha az soru çözdün (${w.prevWeekQuestions} -> ${w.totalQuestions}). Günlük küçük hedeflerle farkı kapatabilirsin.`,
      );
    }
  }

  if (userMessage && userMessage.trim()) {
    parts.push(
      `Not: Yapay zekâ servisi yapılandırılmadığı için mesajını (\"${userMessage.trim().slice(0, 80)}\") gerçek verilerine dayalı bu özetle yanıtlıyorum.`,
    );
  }

  return parts.join("\n\n");
}

export function hasAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function callLLM(
  systemPrompt: string,
  contextText: string,
  userMessage: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY as string;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Çalışma verilerim:\n${contextText}\n\nSorum/isteğim: ${userMessage}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM isteği başarısız: ${res.status}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("LLM boş yanıt döndü");
  return String(text).trim();
}

export const COACH_SYSTEM_PROMPT = `Sen "Çalışma Yol Arkadaşım" uygulamasının Türkçe çalışma koçusun.
Yalnızca sana verilen gerçek çalışma verilerine ve onaylanmış ders programına dayan.
Veride olmayan sayıları, çözülmemiş soruları veya yapılmamış çalışmaları ASLA uydurma.
Kısa, net, motive edici ve uygulanabilir öneriler ver. Madde madde yazabilirsin.
Veri yetersizse bunu açıkça söyle ve kullanıcıdan veri girmesini iste.`;
