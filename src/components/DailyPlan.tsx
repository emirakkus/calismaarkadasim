"use client";

import { useState } from "react";
import type { DayResponse, Subject, TaskStatus, Task } from "@/lib/types";
import { Card, Button, StatusBadge, EmptyState, SectionTitle } from "@/components/ui";
import { api, formatMinutes } from "@/lib/client";

export default function DailyPlan({
  day,
  date,
  subjects,
  onRefresh,
  toast,
}: {
  day: DayResponse;
  date: string;
  subjects: Subject[];
  onRefresh: () => void;
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [completionTask, setCompletionTask] = useState<Task | null>(null);
  const [correctCount, setCorrectCount] = useState("");
  const [wrongCount, setWrongCount] = useState("");
  const [form, setForm] = useState({
    subjectId: "",
    title: "",
    estimatedMinutes: "40",
    questionGoal: "0",
  });
  const [goalEdit, setGoalEdit] = useState(false);
  const [goals, setGoals] = useState({
    questionGoal: String(day.summary.questionGoal),
    minutesGoal: String(day.summary.minutesGoal),
  });

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Hata oluştu", "error");
    } finally {
      setBusy(false);
    }
  }

  const generate = () =>
    run(async () => {
      const r = await api<{ created: number; message?: string }>(
        "/api/tasks/generate",
        { method: "POST", body: JSON.stringify({ date }) },
      );
      toast(
        r.created > 0
          ? `${r.created} görev programdan oluşturuldu.`
          : r.message ?? "Yeni görev eklenmedi.",
        "success",
      );
      onRefresh();
    });

  const addTask = () =>
    run(async () => {
      if (!form.title.trim()) {
        toast("Görev başlığı gerekli", "error");
        return;
      }
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          date,
          subjectId: form.subjectId || undefined,
          subjectName: form.subjectId
            ? subjects.find((s) => String(s.id) === form.subjectId)?.name
            : "Genel",
          title: form.title.trim(),
          estimatedMinutes: Number(form.estimatedMinutes) || 0,
          questionGoal: Number(form.questionGoal) || 0,
        }),
      });
      setForm({ subjectId: "", title: "", estimatedMinutes: "40", questionGoal: "0" });
      setShowAdd(false);
      toast("Görev eklendi", "success");
      onRefresh();
    });

  const setStatus = (t: Task, status: TaskStatus) =>
    run(async () => {
      await api(`/api/tasks/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      onRefresh();
    });

  const completeTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!completionTask) return;
    const correct = Number(correctCount);
    const wrong = Number(wrongCount);
    if (
      !Number.isInteger(correct) ||
      !Number.isInteger(wrong) ||
      correct < 0 ||
      wrong < 0 ||
      correct + wrong > completionTask.questionGoal
    ) {
      toast("Doğru ve yanlış toplamı görevdeki soru hedefini aşamaz", "error");
      return;
    }
    void run(async () => {
      await api(`/api/tasks/${completionTask.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed", correct, wrong }),
      });
      setCompletionTask(null);
      toast("Görev ve soru sonuçları kaydedildi", "success");
      onRefresh();
    });
  };

  const beginCompletion = (task: Task) => {
    if (task.questionGoal <= 0) {
      void setStatus(task, "completed");
      return;
    }
    setCorrectCount("");
    setWrongCount("");
    setCompletionTask(task);
  };

  const postpone = (t: Task) =>
    run(async () => {
      const r = await api<{ warning: string | null; targetDate: string }>(
        `/api/tasks/${t.id}/postpone`,
        { method: "POST", body: JSON.stringify({}) },
      );
      toast(
        r.warning
          ? `Görev ${r.targetDate} gününe taşındı. ${r.warning}`
          : `Görev ${r.targetDate} gününe taşındı.`,
        r.warning ? "error" : "success",
      );
      onRefresh();
    });

  const removeTask = (t: Task) =>
    run(async () => {
      await api(`/api/tasks/${t.id}`, { method: "DELETE" });
      toast("Görev silindi", "success");
      onRefresh();
    });

  const logMinutes = (t: Task) =>
    run(async () => {
      const input = window.prompt(`"${t.title}" için çalışılan süre (dakika):`, "40");
      if (input == null) return;
      const minutes = Number(input);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        toast("Geçerli bir süre girin", "error");
        return;
      }
      await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          date,
          subjectId: t.subjectId ?? undefined,
          subjectName: t.subjectName,
          taskId: t.id,
          minutes,
        }),
      });
      toast(`${minutes} dk kaydedildi`, "success");
      onRefresh();
    });

  const saveGoals = () =>
    run(async () => {
      await api("/api/goals", {
        method: "PUT",
        body: JSON.stringify({
          date,
          questionGoal: Number(goals.questionGoal) || 0,
          minutesGoal: Number(goals.minutesGoal) || 0,
        }),
      });
      setGoalEdit(false);
      toast("Günlük hedefler güncellendi", "success");
      onRefresh();
    });

  return (
    <div className="space-y-4">
      {completionTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setCompletionTask(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-completion-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2 id="task-completion-title" className="text-lg font-semibold text-slate-900">
              Soruların sonucunu gir
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {completionTask.title} · hedef {completionTask.questionGoal} soru
            </p>
            <form className="mt-4 space-y-4" onSubmit={completeTask}>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-600">Doğru</span>
                  <input
                    autoFocus
                    type="number"
                    min={0}
                    max={completionTask.questionGoal}
                    step={1}
                    required
                    value={correctCount}
                    onChange={(event) => setCorrectCount(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-600">Yanlış</span>
                  <input
                    type="number"
                    min={0}
                    max={completionTask.questionGoal}
                    step={1}
                    required
                    value={wrongCount}
                    onChange={(event) => setWrongCount(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Girilmeyen kalan sorular boş sayılır. Boş:{" "}
                {Math.max(
                  0,
                  completionTask.questionGoal -
                    (Number(correctCount) || 0) -
                    (Number(wrongCount) || 0),
                )}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setCompletionTask(null)}
                  disabled={busy}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={busy}>
                  Kaydet ve tamamla
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
      <Card>
        <SectionTitle
          action={
            <Button size="sm" variant="ghost" onClick={() => setGoalEdit((v) => !v)}>
              {goalEdit ? "Kapat" : "Hedefleri düzenle"}
            </Button>
          }
        >
          Günlük hedefler
        </SectionTitle>
        {goalEdit ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Soru hedefi</span>
              <input
                type="number"
                min={0}
                value={goals.questionGoal}
                onChange={(e) => setGoals({ ...goals, questionGoal: e.target.value })}
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Süre hedefi (dk)</span>
              <input
                type="number"
                min={0}
                value={goals.minutesGoal}
                onChange={(e) => setGoals({ ...goals, minutesGoal: e.target.value })}
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <Button onClick={saveGoals} disabled={busy}>
              Kaydet
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Soru hedefi: <strong>{day.summary.questionGoal}</strong> · Süre hedefi:{" "}
            <strong>{formatMinutes(day.summary.minutesGoal)}</strong>
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={generate} disabled={busy}>
                Programdan oluştur
              </Button>
              <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
                {showAdd ? "İptal" : "Görev ekle"}
              </Button>
            </div>
          }
        >
          Günlük plan
        </SectionTitle>

        {showAdd && (
          <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Ders</span>
              <select
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Genel</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Görev başlığı</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="örn. Paragraf soruları"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Tahmini süre (dk)</span>
              <input
                type="number"
                min={0}
                value={form.estimatedMinutes}
                onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Soru hedefi</span>
              <input
                type="number"
                min={0}
                value={form.questionGoal}
                onChange={(e) => setForm({ ...form, questionGoal: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="sm:col-span-2">
              <Button onClick={addTask} disabled={busy}>
                Ekle
              </Button>
            </div>
          </div>
        )}

        {day.tasks.length === 0 ? (
          <EmptyState
            title="Bugün için görev yok"
            description="Haftalık programdan bugünün derslerini oluştur ya da kendi görevini ekle."
            action={<Button onClick={generate}>Programdan oluştur</Button>}
          />
        ) : (
          <ul className="space-y-2">
            {day.tasks.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`font-medium ${t.status === "completed" ? "text-slate-400 line-through" : "text-slate-900"}`}
                      >
                        {t.title}
                      </p>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.subjectName} · ~{t.estimatedMinutes} dk
                      {t.questionGoal > 0 && ` · ${t.questionGoal} soru`}
                      {t.notes && ` · ${t.notes}`}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.status !== "completed" && (
                    <Button size="sm" variant="secondary" onClick={() => beginCompletion(t)} disabled={busy}>
                      ✓ Tamamla
                    </Button>
                  )}
                  {t.status !== "in_progress" && t.status !== "completed" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(t, "in_progress")} disabled={busy}>
                      Başla
                    </Button>
                  )}
                  {t.status === "completed" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(t, "pending")} disabled={busy}>
                      Geri al
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => logMinutes(t)} disabled={busy}>
                    + Süre
                  </Button>
                  {t.status !== "postponed" && (
                    <Button size="sm" variant="ghost" onClick={() => postpone(t)} disabled={busy}>
                      Ertele
                    </Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => removeTask(t)} disabled={busy}>
                    Sil
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
