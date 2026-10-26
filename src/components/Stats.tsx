"use client";

import { useEffect, useState } from "react";
import type { WeeklyStats } from "@/lib/types";
import { Card, SectionTitle, Stat, Spinner, EmptyState, Button } from "@/components/ui";
import { api, formatMinutes } from "@/lib/client";
import { startOfWeek, todayISO, addDays, formatShortTR } from "@/lib/date";

export default function Stats({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayISO()));
  const [data, setData] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<WeeklyStats>(`/api/stats?weekStart=${weekStart}`)
      .then((d) => active && setData(d))
      .catch((e) => active && toast(e.message, "error"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [weekStart, toast]);

  if (loading && !data) return <Spinner label="İstatistikler yükleniyor..." />;
  if (!data) return <EmptyState title="Veri yüklenemedi" />;

  const maxQ = Math.max(1, ...data.perDay.map((d) => d.questions));
  const maxM = Math.max(1, ...data.perSubjectMinutes.map((d) => d.minutes));
  const hasData = data.totalQuestions > 0 || data.totalMinutes > 0;

  const qDelta = data.totalQuestions - data.prevWeekQuestions;
  const mDelta = data.totalMinutes - data.prevWeekMinutes;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ← Önceki
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900">
              {formatShortTR(data.weekStart)} – {formatShortTR(data.weekEnd)}
            </p>
            <button
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setWeekStart(startOfWeek(todayISO()))}
            >
              Bu haftaya dön
            </button>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Sonraki →
          </Button>
        </div>
      </Card>

      {!hasData ? (
        <EmptyState
          title="Bu hafta için veri yok"
          description="Soru kayıtları ve çalışma süreleri girdikçe grafikler burada görünecek."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Toplam soru"
              value={data.totalQuestions}
              sub={`Geçen hafta: ${data.prevWeekQuestions} (${qDelta >= 0 ? "+" : ""}${qDelta})`}
              accent="#2563eb"
            />
            <Stat
              label="Toplam süre"
              value={formatMinutes(data.totalMinutes)}
              sub={`Geçen hafta: ${formatMinutes(data.prevWeekMinutes)} (${mDelta >= 0 ? "+" : ""}${mDelta} dk)`}
              accent="#7c3aed"
            />
            <Stat
              label="Doğru oranı"
              value={data.accuracy !== null ? `%${data.accuracy}` : "—"}
              sub={data.accuracy !== null ? "Yeterli veri" : "Yeterli veri yok"}
              accent="#16a34a"
            />
            <Stat
              label="Görev tamamlama"
              value={`${data.tasksCompleted}/${data.tasksTotal}`}
              accent="#ea580c"
            />
          </div>

          <Card>
            <SectionTitle>Günlük soru çözümü</SectionTitle>
            <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
              {data.perDay.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="mx-auto w-7 rounded-t-md bg-blue-500 transition-all sm:w-9"
                      style={{ height: `${(d.questions / maxQ) * 100}%` }}
                      title={`${d.questions} soru`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{d.questions}</span>
                  <span className="text-[10px] text-slate-400">{d.dayName.slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>Ders bazında çalışma süresi</SectionTitle>
            {data.perSubjectMinutes.length === 0 ? (
              <EmptyState title="Süre kaydı yok" />
            ) : (
              <ul className="space-y-2">
                {data.perSubjectMinutes.map((s) => (
                  <li key={s.subjectName}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-700">{s.subjectName}</span>
                      <span className="font-medium text-slate-800">{formatMinutes(s.minutes)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${(s.minutes / maxM) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle>Ders bazında doğru oranı</SectionTitle>
              {data.perSubjectQuestions.length === 0 ? (
                <EmptyState title="Soru kaydı yok" />
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.perSubjectQuestions.map((s) => (
                    <li key={s.subjectName} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5">
                      <span className="text-slate-700">{s.subjectName}</span>
                      <span className="text-slate-500">
                        {s.total} soru ·{" "}
                        <strong className="text-slate-800">
                          {s.accuracy !== null ? `%${s.accuracy} doğru` : "veri yetersiz"}
                        </strong>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <SectionTitle>En çok zorlanılan dersler</SectionTitle>
              {data.hardestSubjects.length === 0 ? (
                <EmptyState
                  title="Yeterli veri yok"
                  description="En az 10 cevaplanmış soru olduğunda zorlanılan dersler listelenir."
                />
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.hardestSubjects.map((h) => (
                    <li key={h.subjectName} className="flex items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50 p-2.5">
                      <span className="text-slate-800">{h.subjectName}</span>
                      <span className="font-medium text-rose-700">%{h.accuracy} doğru</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
