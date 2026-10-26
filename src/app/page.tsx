"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DayResponse, Subject, Settings as SettingsType } from "@/lib/types";
import { api } from "@/lib/client";
import { todayISO, addDays, formatLongTR } from "@/lib/date";
import { Spinner } from "@/components/ui";
import Dashboard from "@/components/Dashboard";
import DailyPlan from "@/components/DailyPlan";
import QuestionGoals from "@/components/QuestionGoals";
import Stats from "@/components/Stats";
import Coach from "@/components/Coach";
import SubjectsTopics from "@/components/SubjectsTopics";
import Reminders from "@/components/Reminders";
import SettingsPanel from "@/components/SettingsPanel";
import Pomodoro from "@/components/Pomodoro";
import ReviewCenter from "@/components/ReviewCenter";
import Notes from "@/components/Notes";
import WeakTopics from "@/components/WeakTopics";
import Goals from "@/components/Goals";
import StudyCalendar from "@/components/StudyCalendar";
import EnergyLog from "@/components/EnergyLog";
import DataBackup from "@/components/DataBackup";
import {
  HomeIcon,
  CalendarIcon,
  BookIcon,
  ChartIcon,
  BrainIcon,
  BellIcon,
  SettingsIcon,
  QuestionIcon,
  TimerIcon,
  RepeatIcon,
  PencilIcon,
  TrophyIcon,
  TargetIcon,
  FlameIcon,
} from "@/components/icons";

type Tab =
  | "dashboard"
  | "plan"
  | "subjects"
  | "questions"
  | "pomodoro"
  | "reviews"
  | "notes"
  | "goals"
  | "calendar"
  | "energy"
  | "stats"
  | "coach"
  | "reminders"
  | "backup"
  | "settings";

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Genel Bakış", icon: <HomeIcon className="h-5 w-5" /> },
  { id: "plan", label: "Günlük Plan", icon: <CalendarIcon className="h-5 w-5" /> },
  { id: "subjects", label: "Dersler ve Konular", icon: <BookIcon className="h-5 w-5" /> },
  { id: "questions", label: "Soru Hedefleri", icon: <QuestionIcon className="h-5 w-5" /> },
  { id: "pomodoro", label: "Pomodoro", icon: <TimerIcon className="h-5 w-5" /> },
  { id: "reviews", label: "Tekrar Merkezi", icon: <RepeatIcon className="h-5 w-5" /> },
  { id: "notes", label: "Notlar ve Yanlış Defteri", icon: <PencilIcon className="h-5 w-5" /> },
  { id: "goals", label: "Hedefler ve Kilometre Taşları", icon: <TrophyIcon className="h-5 w-5" /> },
  { id: "calendar", label: "Çalışma Takvimi", icon: <CalendarIcon className="h-5 w-5" /> },
  { id: "energy", label: "Enerji ve Motivasyon", icon: <FlameIcon className="h-5 w-5" /> },
  { id: "stats", label: "İlerleme ve İstatistikler", icon: <ChartIcon className="h-5 w-5" /> },
  { id: "coach", label: "AI Çalışma Koçu", icon: <BrainIcon className="h-5 w-5" /> },
  { id: "reminders", label: "Hatırlatmalar", icon: <BellIcon className="h-5 w-5" /> },
  { id: "backup", label: "Veri ve Yedekleme", icon: <TargetIcon className="h-5 w-5" /> },
];

const TAB_TITLES: Record<Tab, string> = {
  dashboard: "Genel Bakış",
  plan: "Günlük Plan",
  subjects: "Dersler ve Konular",
  questions: "Soru Hedefleri",
  pomodoro: "Pomodoro",
  reviews: "Tekrar Merkezi",
  notes: "Notlar ve Yanlış Defteri",
  goals: "Hedefler ve Kilometre Taşları",
  calendar: "Çalışma Takvimi",
  energy: "Enerji ve Motivasyon",
  stats: "İlerleme ve İstatistikler",
  coach: "AI Çalışma Koçu",
  reminders: "Hatırlatmalar",
  backup: "Veri ve Yedekleme",
  settings: "Ayarlar",
};

type Toast = { id: number; msg: string; type: "success" | "error" };

export default function Page() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [date, setDate] = useState<string>(todayISO());
  const [day, setDay] = useState<DayResponse | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toast = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const loadDay = useCallback(async (d: string) => {
    const data = await api<DayResponse>(`/api/day?date=${d}`);
    setDay(data);
  }, []);

  const refresh = useCallback(() => {
    loadDay(date).catch((e) => toast(e.message, "error"));
  }, [date, loadDay, toast]);

  useEffect(() => {
    (async () => {
      try {
        const [sch, set] = await Promise.all([
          api<{ subjects: Subject[] }>("/api/schedule"),
          api<{ settings: SettingsType }>("/api/settings"),
        ]);
        setSubjects(sch.subjects);
        setSettings(set.settings);
        await loadDay(date);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Yükleme hatası", "error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) loadDay(date).catch((e) => toast(e.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Hatırlatma zamanlayıcısı
  const reminderRef = useRef<SettingsType | null>(null);
  reminderRef.current = settings;
  useEffect(() => {
    const interval = setInterval(() => {
      const s = reminderRef.current;
      if (!s || !s.reminderEnabled) return;
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      if (`${hh}:${mm}` !== s.reminderTime) return;
      const key = "cya-reminder-" + todayISO();
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      new Notification("Çalışma Yol Arkadaşım", {
        body: "Bugünkü çalışma planını tamamlamayı unutma! 📚",
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const name = settings?.userName?.trim();
  const initial = name ? name[0].toLocaleUpperCase("tr") : "Ç";

  if (loading || !day || !settings) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Çalışma Yol Arkadaşım yükleniyor..." />
      </div>
    );
  }

  function navigate(t: string) {
    setTab(t as Tab);
    setSidebarOpen(false);
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="text-2xl text-emerald-600"><BookIcon className="h-7 w-7" /></span>
        <span className="text-[15px] font-bold leading-tight text-slate-900">
          Çalışma Yol
          <br />
          Arkadaşım
        </span>
      </div>
      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => navigate(n.id)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              tab === n.id
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <span className={tab === n.id ? "text-emerald-600" : "text-slate-400"}>
              {n.icon}
            </span>
            {n.label}
          </button>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <button
          onClick={() => navigate("settings")}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            tab === "settings"
              ? "bg-emerald-50 text-emerald-700"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <span className={tab === "settings" ? "text-emerald-600" : "text-slate-400"}>
            <SettingsIcon className="h-5 w-5" />
          </span>
          Ayarlar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Masaüstü kenar menü */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        {SidebarContent}
      </aside>

      {/* Mobil kenar menü */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Üst bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
                aria-label="Menüyü aç"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                </svg>
              </button>
              <h2 className="text-base font-semibold text-slate-800 lg:hidden">
                {TAB_TITLES[tab]}
              </h2>
            </div>

            <div className="flex items-center gap-3 sm:gap-5">
              <div className="flex items-center gap-1 text-sm text-slate-600">
                <button
                  onClick={() => setDate(addDays(date, -1))}
                  className="rounded-lg px-1.5 py-1 hover:bg-slate-100"
                  aria-label="Önceki gün"
                >
                  ‹
                </button>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  aria-label="Tarih seç"
                />
                <button
                  onClick={() => setDate(addDays(date, 1))}
                  className="rounded-lg px-1.5 py-1 hover:bg-slate-100"
                  aria-label="Sonraki gün"
                >
                  ›
                </button>
              </div>

              <span className="hidden text-sm font-medium text-slate-600 md:inline">
                {formatLongTR(date)}
              </span>

              <button
                onClick={() => navigate("reminders")}
                className="relative rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Hatırlatmalar"
              >
                <BellIcon className="h-5 w-5" />
                {settings.reminderEnabled && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </button>

              <button
                onClick={() => navigate("settings")}
                className="flex items-center gap-2"
                aria-label="Profil ve ayarlar"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                  {initial}
                </span>
                {name && <span className="hidden text-sm font-medium text-slate-700 sm:inline">{name}</span>}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          {tab === "dashboard" && (
            <Dashboard date={date} onNavigate={navigate} toast={toast} />
          )}
          {tab === "plan" && (
            <DailyPlan day={day} date={date} subjects={subjects} onRefresh={refresh} toast={toast} />
          )}
          {tab === "questions" && (
            <QuestionGoals day={day} date={date} subjects={subjects} onRefresh={refresh} toast={toast} />
          )}
          {tab === "subjects" && <SubjectsTopics toast={toast} />}
          {tab === "pomodoro" && <Pomodoro subjects={subjects} toast={toast} />}
          {tab === "reviews" && <ReviewCenter toast={toast} />}
          {tab === "notes" && <Notes subjects={subjects} toast={toast} />}
          {tab === "goals" && <Goals toast={toast} />}
          {tab === "calendar" && <StudyCalendar toast={toast} />}
          {tab === "energy" && <EnergyLog toast={toast} />}
          {tab === "backup" && <DataBackup toast={toast} />}
          {tab === "stats" && (
            <div className="space-y-4">
              <Stats toast={toast} />
              <WeakTopics toast={toast} />
            </div>
          )}
          {tab === "coach" && <Coach date={date} toast={toast} />}
          {tab === "reminders" && (
            <Reminders settings={settings} onUpdated={setSettings} toast={toast} />
          )}
          {tab === "settings" && (
            <SettingsPanel settings={settings} onUpdated={setSettings} toast={toast} />
          )}
        </main>
      </div>

      {/* Toastlar */}
      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
              t.type === "error" ? "bg-rose-600" : "bg-emerald-600"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
