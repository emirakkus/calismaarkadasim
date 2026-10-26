"use client";

import { useEffect, useState } from "react";
import type { StudyGoal } from "@/lib/types";
import { Card, Button, SectionTitle, Spinner, EmptyState, ProgressBar } from "@/components/ui";
import { api } from "@/lib/client";
import { TrophyIcon } from "@/components/icons";
import { formatShortTR } from "@/lib/date";

const GOAL_TYPE_LABEL: Record<string, string> = {
  questions: "Soru çözme",
  topics: "Konu tamamlama",
  minutes: "Çalışma süresi (dk)",
  mock: "Deneme sınavı",
  review: "Tekrar",
  custom: "Özel (elle)",
};

export default function Goals({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    goalType: "questions",
    targetValue: "",
    startDate: "",
    dueDate: "",
    description: "",
  });
  const [msInput, setMsInput] = useState<Record<number, { title: string; target: string }>>({});

  async function load() {
    const r = await api<{ goals: StudyGoal[] }>("/api/study-goals");
    setGoals(r.goals);
  }

  useEffect(() => {
    load()
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Hata", "error");
    } finally {
      setBusy(false);
    }
  }

  const addGoal = () =>
    run(async () => {
      if (!form.title.trim()) {
        toast("Başlık gerekli", "error");
        return;
      }
      await api("/api/study-goals", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          goalType: form.goalType,
          targetValue: Number(form.targetValue) || 0,
          startDate: form.startDate || undefined,
          dueDate: form.dueDate || undefined,
          description: form.description || undefined,
        }),
      });
      setForm({ title: "", goalType: "questions", targetValue: "", startDate: "", dueDate: "", description: "" });
      setShowForm(false);
      await load();
      toast("Hedef eklendi");
    });

  const updateManual = (g: StudyGoal, delta: number) =>
    run(async () => {
      await api(`/api/study-goals/${g.id}`, {
        method: "PATCH",
        body: JSON.stringify({ manualValue: Math.max(0, g.manualValue + delta) }),
      });
      await load();
    });

  const complete = (g: StudyGoal) =>
    run(async () => {
      await api(`/api/study-goals/${g.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: g.status === "completed" ? "active" : "completed" }),
      });
      await load();
    });

  const remove = (g: StudyGoal) =>
    run(async () => {
      if (!window.confirm("Bu hedef silinsin mi?")) return;
      await api(`/api/study-goals/${g.id}`, { method: "DELETE" });
      await load();
      toast("Hedef silindi");
    });

  const addMilestone = (g: StudyGoal) =>
    run(async () => {
      const inp = msInput[g.id];
      if (!inp?.title?.trim()) {
        toast("Kilometre taşı başlığı gerekli", "error");
        return;
      }
      await api("/api/milestones", {
        method: "POST",
        body: JSON.stringify({
          goalId: g.id,
          title: inp.title.trim(),
          targetValue: Number(inp.target) || 0,
        }),
      });
      setMsInput({ ...msInput, [g.id]: { title: "", target: "" } });
      await load();
      toast("Kilometre taşı eklendi");
    });

  const removeMilestone = (id: number) =>
    run(async () => {
      await api(`/api/milestones/${id}`, { method: "DELETE" });
      await load();
    });

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle
          icon={<TrophyIcon className="h-5 w-5" />}
          action={
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "İptal" : "Hedef ekle"}
            </Button>
          }
        >
          Hedefler ve Kilometre Taşları
        </SectionTitle>
        <p className="text-sm text-slate-500">
          Otomatik hedeflerin ilerlemesi gerçek kayıtlardan (soru, konu, süre, tekrar) hesaplanır.
          "Özel" hedeflerde ilerlemeyi elle güncellersin.
        </p>

        {showForm && (
          <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Hedef başlığı"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Tür</span>
              <select
                value={form.goalType}
                onChange={(e) => setForm({ ...form, goalType: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {Object.entries(GOAL_TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Hedef değeri</span>
              <input
                type="number"
                min={0}
                value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Başlangıç (opsiyonel)</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Son tarih (opsiyonel)</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="sm:col-span-2">
              <Button onClick={addGoal} disabled={busy}>Kaydet</Button>
            </div>
          </div>
        )}
      </Card>

      {goals.length === 0 ? (
        <EmptyState title="Henüz hedef yok" description="İlk hedefini ekleyerek başla." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((g) => (
            <Card key={g.id} className={g.overdue ? "border-rose-200" : g.isComplete ? "border-emerald-200" : ""}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-800">{g.title}</h3>
                  <p className="text-xs text-slate-500">
                    {GOAL_TYPE_LABEL[g.goalType]}
                    {g.dueDate && ` · Son: ${formatShortTR(g.dueDate)}`}
                    {g.overdue && <span className="ml-1 font-medium text-rose-600">· Süresi geçti</span>}
                    {g.isComplete && <span className="ml-1 font-medium text-emerald-600">· Tamamlandı</span>}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => complete(g)} disabled={busy}>
                    {g.status === "completed" ? "Geri al" : "Bitti"}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(g)} disabled={busy}>Sil</Button>
                </div>
              </div>

              <div className="mt-3">
                <ProgressBar
                  value={g.currentValue}
                  goal={g.targetValue}
                  color={g.isComplete ? "#059669" : "#2563eb"}
                  label="İlerleme"
                />
              </div>

              {(g.tracking === "manual" || g.goalType === "custom") && (
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => updateManual(g, -1)} disabled={busy}>−</Button>
                  <span className="text-sm text-slate-600">Elle: {g.manualValue}</span>
                  <Button size="sm" variant="secondary" onClick={() => updateManual(g, 1)} disabled={busy}>+</Button>
                </div>
              )}

              {/* Kilometre taşları */}
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-1.5 text-xs font-medium text-slate-500">Kilometre taşları</p>
                {g.milestones.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {g.milestones.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className={m.reached ? "text-emerald-700" : "text-slate-600"}>
                          {m.reached ? "✓ " : "○ "}
                          {m.title} <span className="text-xs text-slate-400">({m.targetValue})</span>
                        </span>
                        <button onClick={() => removeMilestone(m.id)} className="text-xs text-rose-500 hover:underline" disabled={busy}>
                          sil
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-1.5">
                  <input
                    value={msInput[g.id]?.title ?? ""}
                    onChange={(e) => setMsInput({ ...msInput, [g.id]: { ...(msInput[g.id] ?? { title: "", target: "" }), title: e.target.value } })}
                    placeholder="Ara aşama"
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    value={msInput[g.id]?.target ?? ""}
                    onChange={(e) => setMsInput({ ...msInput, [g.id]: { ...(msInput[g.id] ?? { title: "", target: "" }), target: e.target.value } })}
                    placeholder="Değer"
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                  <Button size="sm" variant="secondary" onClick={() => addMilestone(g)} disabled={busy}>Ekle</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
