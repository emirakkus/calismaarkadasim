"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalendarDay, DayResponse } from "@/lib/types";
import { Card, Button, SectionTitle, Spinner, StatusBadge } from "@/components/ui";
import { api, formatMinutes } from "@/lib/client";
import { TR_MONTHS, todayISO, toISODate } from "@/lib/date";
import { CalendarIcon } from "@/components/icons";

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function StudyCalendar({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [days, setDays] = useState<Record<string, CalendarDay>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(todayISO());
  const [dayDetail, setDayDetail] = useState<DayResponse | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ days: Record<string, CalendarDay> }>(
      `/api/calendar?year=${year}&month=${month}`,
    );
    setDays(r.days);
  }, [year, month]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [load, toast]);

  useEffect(() => {
    if (!selected) {
      setDayDetail(null);
      return;
    }
    api<DayResponse>(`/api/day?date=${selected}`)
      .then(setDayDetail)
      .catch(() => setDayDetail(null));
  }, [selected]);

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  // Ay ızgarası (Pazartesi başlangıç)
  const firstDay = new Date(year, month - 1, 1);
  const jsDow = firstDay.getDay(); // 0=Paz
  const leading = jsDow === 0 ? 6 : jsDow - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toISODate(new Date(year, month - 1, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg">
            <span className="text-emerald-600"><CalendarIcon className="h-5 w-5" /></span>
            Çalışma Takvimi
          </h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={prevMonth}>‹</Button>
            <span className="min-w-[130px] text-center text-sm font-semibold text-slate-800">
              {TR_MONTHS[month - 1]} {year}
            </span>
            <Button size="sm" variant="secondary" onClick={nextMonth}>›</Button>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((iso, i) => {
                if (!iso) return <div key={i} />;
                const info = days[iso];
                const dayNum = Number(iso.slice(-2));
                const isToday = iso === todayISO();
                const isSel = iso === selected;
                const hasActivity = info && (info.tasks > 0 || info.minutes > 0 || info.reviews > 0);
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(iso)}
                    className={`flex min-h-[54px] flex-col rounded-lg border p-1 text-left transition sm:min-h-[64px] ${
                      isSel ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`text-xs font-medium ${isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white" : "text-slate-600"}`}>
                      {dayNum}
                    </span>
                    {hasActivity && (
                      <span className="mt-auto flex flex-wrap gap-0.5">
                        {info.completed > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="tamamlanan görev" />}
                        {info.tasks > info.completed && <span className="h-1.5 w-1.5 rounded-full bg-slate-400" title="bekleyen görev" />}
                        {info.minutes > 0 && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" title="çalışma" />}
                        {info.reviews > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="tekrar" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Tamamlanan</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> Bekleyen</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> Çalışma</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Tekrar</span>
            </div>
          </>
        )}
      </Card>

      {selected && (
        <Card>
          <SectionTitle>{selected} günü</SectionTitle>
          {!dayDetail ? (
            <Spinner />
          ) : dayDetail.tasks.length === 0 ? (
            <p className="text-sm text-slate-500">Bu gün için planlanmış görev yok.</p>
          ) : (
            <ul className="space-y-2">
              {dayDetail.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.subjectName} · {t.estimatedMinutes} dk</p>
                  </div>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
          {dayDetail && (
            <p className="mt-3 text-xs text-slate-500">
              Çalışma süresi: {formatMinutes(dayDetail.summary.minutesStudied)} · Çözülen soru: {dayDetail.summary.questionsTotal}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
