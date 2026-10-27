"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Subject } from "@/lib/types";
import { Card, Button, SectionTitle, Stat } from "@/components/ui";
import { api, formatMinutes } from "@/lib/client";
import { todayISO } from "@/lib/date";
import { TimerIcon } from "@/components/icons";

type Mode = "focus" | "break";
type Phase = "idle" | "running" | "paused";

type PersistState = {
  mode: Mode;
  phase: Phase;
  endAt: number | null; // ms epoch
  remainingMs: number; // paused iken kalan
  subjectId: string;
  focusMin: number;
  breakMin: number;
};

function load(key: string): PersistState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as PersistState) : null;
  } catch {
    return null;
  }
}

function save(key: string, s: PersistState) {
  localStorage.setItem(key, JSON.stringify(s));
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Pomodoro({
  userId,
  subjects,
  toast,
}: {
  userId: number;
  subjects: Subject[];
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [mode, setMode] = useState<Mode>("focus");
  const [phase, setPhase] = useState<Phase>("idle");
  const [endAt, setEndAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(25 * 60 * 1000);
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [subjectId, setSubjectId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [todayStats, setTodayStats] = useState({ minutes: 0, count: 0 });
  const savedSessionRef = useRef(false);
  const storageKey = `cya-pomodoro-v2-user-${userId}`;

  const refreshStats = useCallback(() => {
    api<{ pomodoroMinutes: number; pomodoroCount: number }>(
      `/api/pomodoro/stats?date=${todayISO()}`,
    )
      .then((r) =>
        setTodayStats({ minutes: r.pomodoroMinutes, count: r.pomodoroCount }),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    const s = load(storageKey);
    if (s) {
      setMode(s.mode);
      setPhase(s.phase);
      setEndAt(s.endAt);
      setRemainingMs(s.remainingMs);
      setFocusMin(s.focusMin);
      setBreakMin(s.breakMin);
      setSubjectId(s.subjectId);
    }
    refreshStats();
  }, [storageKey, refreshStats]);

  // Her saniye "now" güncelle (yalnızca gösterim için)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const liveRemaining =
    phase === "running" && endAt ? Math.max(0, endAt - now) : remainingMs;

  const persist = useCallback(
    (over: Partial<PersistState>) => {
      save(storageKey, {
        mode,
        phase,
        endAt,
        remainingMs,
        subjectId,
        focusMin,
        breakMin,
        ...over,
      });
    },
    [storageKey, mode, phase, endAt, remainingMs, subjectId, focusMin, breakMin],
  );

  const saveFocusSession = useCallback(
    async (durationSeconds: number) => {
      if (durationSeconds < 60) return; // 1 dk altını kaydetme
      const sub = subjects.find((s) => String(s.id) === subjectId);
      try {
        await api("/api/sessions", {
          method: "POST",
          body: JSON.stringify({
            date: todayISO(),
            sessionType: "pomodoro",
            durationSeconds,
            subjectId: subjectId || undefined,
            subjectName: sub?.name ?? "Genel çalışma",
          }),
        });
        toast(`${Math.round(durationSeconds / 60)} dk odak kaydedildi`);
        refreshStats();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Kayıt hatası", "error");
      }
    },
    [subjectId, subjects, toast, refreshStats],
  );

  // Süre bitişini yakala
  useEffect(() => {
    if (phase !== "running" || !endAt) return;
    if (now < endAt) {
      savedSessionRef.current = false;
      return;
    }
    if (savedSessionRef.current) return;
    savedSessionRef.current = true;

    // Oturum doğal bitti
    const total = (mode === "focus" ? focusMin : breakMin) * 60;
    if (mode === "focus") {
      saveFocusSession(total);
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("Pomodoro tamamlandı", { body: "Odak süresi bitti, kısa bir mola ver." });
      }
      const nextRem = breakMin * 60 * 1000;
      setMode("break");
      setPhase("idle");
      setEndAt(null);
      setRemainingMs(nextRem);
      persist({ mode: "break", phase: "idle", endAt: null, remainingMs: nextRem });
      toast("Odak oturumu tamamlandı 🎉");
    } else {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("Mola bitti", { body: "Yeni bir odak oturumuna hazır mısın?" });
      }
      const nextRem = focusMin * 60 * 1000;
      setMode("focus");
      setPhase("idle");
      setEndAt(null);
      setRemainingMs(nextRem);
      persist({ mode: "focus", phase: "idle", endAt: null, remainingMs: nextRem });
      toast("Mola bitti");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, endAt, phase, mode]);

  function start() {
    const base = phase === "paused" ? remainingMs : (mode === "focus" ? focusMin : breakMin) * 60 * 1000;
    const newEnd = Date.now() + base;
    savedSessionRef.current = false;
    setEndAt(newEnd);
    setPhase("running");
    persist({ phase: "running", endAt: newEnd, remainingMs: base });
  }

  function pause() {
    if (!endAt) return;
    const rem = Math.max(0, endAt - Date.now());
    setRemainingMs(rem);
    setEndAt(null);
    setPhase("paused");
    persist({ phase: "paused", endAt: null, remainingMs: rem });
  }

  function reset() {
    // İptal: yarım odak oturumu KAYDEDİLMEZ (iş kuralı).
    const rem = (mode === "focus" ? focusMin : breakMin) * 60 * 1000;
    setPhase("idle");
    setEndAt(null);
    setRemainingMs(rem);
    savedSessionRef.current = false;
    persist({ phase: "idle", endAt: null, remainingMs: rem });
  }

  function switchMode(m: Mode) {
    if (phase === "running") return;
    setMode(m);
    const rem = (m === "focus" ? focusMin : breakMin) * 60 * 1000;
    setRemainingMs(rem);
    setEndAt(null);
    setPhase("idle");
    persist({ mode: m, phase: "idle", endAt: null, remainingMs: rem });
  }

  function applyPreset(f: number, b: number) {
    setFocusMin(f);
    setBreakMin(b);
    const rem = (mode === "focus" ? f : b) * 60 * 1000;
    setRemainingMs(rem);
    setEndAt(null);
    setPhase("idle");
    persist({ focusMin: f, breakMin: b, phase: "idle", endAt: null, remainingMs: rem });
  }

  const totalMs = (mode === "focus" ? focusMin : breakMin) * 60 * 1000;
  const progress = totalMs > 0 ? 1 - liveRemaining / totalMs : 0;
  const size = 240;
  const r = 110;
  const c = 2 * Math.PI * r;

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={<TimerIcon className="h-5 w-5" />}>
          Pomodoro Odaklanma Sayacı
        </SectionTitle>

        <div className="flex flex-col items-center gap-5">
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            <button
              onClick={() => switchMode("focus")}
              disabled={phase === "running"}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${mode === "focus" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"} disabled:opacity-50`}
            >
              Çalışma
            </button>
            <button
              onClick={() => switchMode("break")}
              disabled={phase === "running"}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${mode === "break" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"} disabled:opacity-50`}
            >
              Mola
            </button>
          </div>

          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={14} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={mode === "focus" ? "#059669" : "#3b82f6"}
                strokeWidth={14}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c - progress * c}
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold tabular-nums text-slate-900">
                {fmt(liveRemaining)}
              </span>
              <span className="mt-1 text-sm text-slate-500">
                {mode === "focus" ? "Odaklanma" : "Mola"}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {phase !== "running" ? (
              <Button onClick={start}>{phase === "paused" ? "Devam et" : "Başlat"}</Button>
            ) : (
              <Button variant="secondary" onClick={pause}>Duraklat</Button>
            )}
            <Button variant="secondary" onClick={reset}>Sıfırla</Button>
          </div>
          {phase === "running" && mode === "focus" && (
            <p className="text-xs text-slate-400">
              Sıfırlarsan bu yarım oturum kaydedilmez. Süre dolduğunda otomatik kaydedilir.
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <SectionTitle>Oturum ayarları</SectionTitle>
          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-slate-600">Ders (opsiyonel)</span>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                persist({ subjectId: e.target.value });
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Genel çalışma</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <p className="mb-2 text-sm text-slate-600">Hazır süreler</p>
          <div className="flex flex-wrap gap-2">
            {[
              [25, 5],
              [50, 10],
              [15, 3],
            ].map(([f, b]) => (
              <button
                key={`${f}-${b}`}
                onClick={() => applyPreset(f, b)}
                disabled={phase === "running"}
                className={`rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
                  focusMin === f && breakMin === b
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f}/{b} dk
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Çalışma (dk)</span>
              <input
                type="number"
                min={1}
                max={120}
                value={focusMin}
                disabled={phase === "running"}
                onChange={(e) => applyPreset(Math.max(1, Number(e.target.value) || 1), breakMin)}
                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Mola (dk)</span>
              <input
                type="number"
                min={1}
                max={60}
                value={breakMin}
                disabled={phase === "running"}
                onChange={(e) => applyPreset(focusMin, Math.max(1, Number(e.target.value) || 1))}
                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </Card>

        <Card>
          <SectionTitle>Bugünkü odaklanma</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Toplam odak süresi" value={formatMinutes(todayStats.minutes)} accent="#059669" />
            <Stat label="Tamamlanan oturum" value={todayStats.count} accent="#3b82f6" />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Yalnızca tamamlanan odak oturumları çalışma süresi istatistiklerine eklenir.
          </p>
        </Card>
      </div>
    </div>
  );
}
