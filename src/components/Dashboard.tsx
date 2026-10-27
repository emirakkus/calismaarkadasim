"use client";

import { useCallback, useEffect, useState } from "react";
import type { OverviewResponse, Task } from "@/lib/types";
import { Card, CircularProgress, StatCard, StatusBadge, Button, EmptyState, Spinner } from "@/components/ui";
import { api, formatMinutes } from "@/lib/client";
import {
  BookIcon,
  CalendarIcon,
  ClockIcon,
  QuestionIcon,
  TrendIcon,
  CheckCircleIcon,
  SparkleIcon,
  BellIcon,
  PlayIcon,
  ArrowRightIcon,
  TrophyIcon,
  ChevronRightIcon,
  FlameIcon,
  TargetIcon,
  RepeatIcon,
} from "@/components/icons";

function subjectIcon(name: string) {
  const n = name.toLocaleLowerCase("tr");
  if (n.includes("matemat") || n.includes("geometri")) return <CalendarIcon />;
  if (n.includes("tarih") || n.includes("felsefe")) return <ClockIcon />;
  if (n.includes("soru") || n.includes("paragraf")) return <QuestionIcon />;
  return <BookIcon />;
}

const BAR_COLORS = ["#059669", "#3b82f6", "#8b5cf6"];

export default function Dashboard({
  date,
  userName,
  onNavigate,
  toast,
}: {
  date: string;
  userName: string;
  onNavigate: (tab: string) => void;
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tip, setTip] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    return api<OverviewResponse>(`/api/overview?date=${date}`);
  }, [date]);

  useEffect(() => {
    let active = true;
    load()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => active && toast(e.message, "error"))
      .finally(() => active && setLoading(false));
    api<{ tip: string; aiEnabled: boolean }>(`/api/coach/tip?date=${date}`)
      .then((r) => {
        if (!active) return;
        setTip(r.tip);
        setAiEnabled(r.aiEnabled);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [date, load, toast]);

  async function toggleComplete(t: Task) {
    setBusy(true);
    try {
      await api(`/api/tasks/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: t.status === "completed" ? "pending" : "completed",
        }),
      });
      setData(await load());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Hata", "error");
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    try {
      const r = await api<{ created: number; message?: string }>(
        "/api/tasks/generate",
        { method: "POST", body: JSON.stringify({ date }) },
      );
      toast(r.created > 0 ? `${r.created} görev oluşturuldu.` : r.message ?? "Görev eklenmedi.");
      setData(await load());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Hata", "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !data) return <Spinner label="Panel yükleniyor..." />;

  const s = data.summary;
  const name = userName.trim() || data.settings?.userName?.trim();
  const taskPct = s.tasksTotal > 0 ? Math.round((s.tasksCompleted / s.tasksTotal) * 100) : 0;

  const weekMinutes = data.week.perDay.map((d) => d.minutes);
  const maxMin = Math.max(60, ...weekMinutes);
  const yTicks = [0, 1, 2, 3, 4].map((h) => Math.round((maxMin / 60) * (h / 4)));

  const topSubjects = data.program.perSubject.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Merhaba{name ? `, ${name}` : ""} <span className="align-middle">👋</span>
          </h1>
          <p className="mt-1 text-slate-500">Bugün küçük adımlar, büyük ilerleme.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Sınav geri sayımı */}
          {data.examDaysLeft !== null ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2">
              <span className="text-emerald-600"><TargetIcon className="h-5 w-5" /></span>
              <div className="leading-tight">
                <p className="text-xs text-emerald-700">
                  {data.exam?.examName?.trim() || "Sınava"} kalan
                </p>
                <p className="text-sm font-bold text-emerald-800">
                  {data.examDaysLeft > 0
                    ? `${data.examDaysLeft} gün`
                    : data.examDaysLeft === 0
                      ? "Bugün!"
                      : "Tarih geçti"}
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onNavigate("settings")}
              className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3.5 py-2 text-left hover:bg-slate-50"
            >
              <span className="text-slate-400"><TargetIcon className="h-5 w-5" /></span>
              <div className="leading-tight">
                <p className="text-xs text-slate-500">Sınav geri sayımı</p>
                <p className="text-sm font-medium text-emerald-700">Tarih ekle →</p>
              </div>
            </button>
          )}
          {/* Çalışma serisi */}
          <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2">
            <span className="text-amber-500"><FlameIcon className="h-5 w-5" /></span>
            <div className="leading-tight">
              <p className="text-xs text-amber-700">Çalışma serisi</p>
              <p className="text-sm font-bold text-amber-800">
                {data.streak.currentStreak} gün
                <span className="ml-1 font-normal text-amber-600">
                  (en uzun {data.streak.longestStreak})
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {data.dueReviews.length > 0 && (
        <button
          onClick={() => onNavigate("reviews")}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-left transition hover:bg-violet-100/70"
        >
          <span className="flex items-center gap-2.5 text-sm font-medium text-violet-800">
            <span className="text-violet-500"><RepeatIcon className="h-5 w-5" /></span>
            Bugün {data.dueReviews.length} tekrar seni bekliyor
          </span>
          <ArrowRightIcon className="h-4 w-4 text-violet-500" />
        </button>
      )}

      {/* İstatistik kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="!p-4">
          <div className="flex items-center gap-4">
            <CircularProgress percent={taskPct} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Günlük hedef</p>
                <span className="text-emerald-500">
                  <CheckCircleIcon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {s.tasksCompleted} / {s.tasksTotal} görev
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${taskPct}%` }} />
              </div>
            </div>
          </div>
        </Card>

        <StatCard
          icon={<QuestionIcon />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          title="Çözülen sorular"
          value={`${s.questionsTotal} / ${s.questionGoal}`}
          barValue={s.questionsTotal}
          barGoal={s.questionGoal}
          barColor="#3b82f6"
        />
        <StatCard
          icon={<ClockIcon />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          title="Çalışma süresi"
          value={formatMinutes(s.minutesStudied)}
          barValue={s.minutesStudied}
          barGoal={s.minutesGoal}
          barColor="#8b5cf6"
        />
        <StatCard
          icon={<TrendIcon />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          title="Program ilerlemesi"
          value={`%${data.program.percent}`}
          barValue={data.program.percent}
          barGoal={100}
          barColor="#059669"
        />
      </div>

      {/* Plan + Koç */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg">
              <span className="text-emerald-600"><CalendarIcon className="h-5 w-5" /></span>
              Bugünün çalışma planı
            </h2>
            <button
              onClick={() => onNavigate("plan")}
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              Tüm planı gör <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>

          {data.tasks.length === 0 ? (
            <EmptyState
              title="Bugün için henüz görev yok"
              description="Programdan bugünün derslerini otomatik oluşturabilirsin."
              action={<Button onClick={generate} disabled={busy}>Programdan oluştur</Button>}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      <th className="pb-2 pl-1 font-medium" />
                      <th className="pb-2 font-medium">Ders</th>
                      <th className="pb-2 font-medium">Konu</th>
                      <th className="pb-2 font-medium">Hedef</th>
                      <th className="pb-2 font-medium">Süre</th>
                      <th className="pb-2 font-medium">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tasks.slice(0, 6).map((t) => (
                      <tr key={t.id} className="border-t border-slate-100">
                        <td className="py-3 pl-1">
                          <button
                            onClick={() => toggleComplete(t)}
                            disabled={busy}
                            aria-label="Görevi tamamla"
                            className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                              t.status === "completed"
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-slate-300 bg-white hover:border-emerald-500"
                            }`}
                          >
                            {t.status === "completed" && (
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
                                <path d="M5 12l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        </td>
                        <td className="py-3">
                          <span className="flex items-center gap-2 font-medium text-slate-800">
                            <span className="text-slate-400">
                              <span className="block h-4 w-4">{subjectIcon(t.subjectName)}</span>
                            </span>
                            {t.subjectName}
                          </span>
                        </td>
                        <td className={`py-3 ${t.status === "completed" ? "text-slate-400 line-through" : "text-slate-600"}`}>
                          {t.title}
                        </td>
                        <td className="py-3 text-slate-600">
                          {t.questionGoal > 0 ? `${t.questionGoal} soru` : "—"}
                        </td>
                        <td className="py-3 text-slate-600">{t.estimatedMinutes} dk</td>
                        <td className="py-3">
                          <StatusBadge status={t.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <Button onClick={() => onNavigate("plan")}>
                  <PlayIcon className="h-4 w-4" /> Çalışmaya başla
                </Button>
              </div>
            </>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-white">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <span className="text-emerald-600"><SparkleIcon className="h-5 w-5" /></span>
              AI çalışma koçun
            </h2>
            <div className="flex gap-2.5 rounded-xl bg-white/70 p-3">
              <span className="mt-0.5 text-emerald-600">
                <CheckCircleIcon className="h-5 w-5" />
              </span>
              <p className="text-sm leading-relaxed text-slate-700">
                {tip || "Veri girdikçe burada kişisel öneriler göreceksin."}
              </p>
            </div>
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={() => onNavigate("coach")}>
                Öneriyi görüntüle <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
            {!aiEnabled && (
              <p className="mt-2 text-xs text-slate-400">
                Yapay zekâ anahtarı tanımlı değil — öneriler gerçek verilerinden hesaplanıyor.
              </p>
            )}
          </Card>

          <Card className="!py-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-slate-600">
                <span className="text-slate-400"><BellIcon className="h-4 w-4" /></span>
                Bir sonraki hatırlatma
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {data.settings?.reminderEnabled ? data.settings.reminderTime : "Kapalı"}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Haftalık grafik + ilerleme */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg">
              <span className="text-emerald-600"><CalendarIcon className="h-5 w-5" /></span>
              Haftalık çalışma
            </h2>
            <span className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500">
              Bu hafta
            </span>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col justify-between py-1 text-[10px] text-slate-400" style={{ height: 160 }}>
              {[...yTicks].reverse().map((t, i) => (
                <span key={i}>{t}s</span>
              ))}
            </div>
            <div className="flex flex-1 items-end justify-between gap-2" style={{ height: 160 }}>
              {data.week.perDay.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="mx-auto w-7 rounded-t-lg bg-emerald-500/90 transition-all sm:w-10"
                      style={{ height: `${Math.max(2, (d.minutes / maxMin) * 100)}%` }}
                      title={formatMinutes(d.minutes)}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">{d.dayName.slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="text-amber-500"><TrophyIcon className="h-5 w-5" /></span>
            En çok ilerleme kaydedilen dersler
          </h2>
          {topSubjects.length === 0 ? (
            <EmptyState
              title="Henüz konu ilerlemesi yok"
              description="Dersler ve Konular bölümünden konu ekleyip tamamlandıkça burada görünür."
            />
          ) : (
            <ul className="space-y-4">
              {topSubjects.map((sub, i) => (
                <li key={sub.subjectId} className="flex items-center gap-3">
                  <span className="text-slate-400">
                    <span className="block h-4 w-4">{subjectIcon(sub.subjectName)}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-slate-700">{sub.subjectName}</span>
                      <span className="text-sm font-semibold text-slate-800">%{sub.percent}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${sub.percent}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                    </div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-slate-300" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
