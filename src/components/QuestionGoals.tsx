"use client";

import { useEffect, useState } from "react";
import type { DayResponse, Subject, QuestionLog, Topic } from "@/lib/types";
import { Card, Button, EmptyState, SectionTitle, Stat } from "@/components/ui";
import { api } from "@/lib/client";

function accuracyOf(l: { correct: number; wrong: number }): number | null {
  const graded = l.correct + l.wrong;
  return graded >= 10 ? Math.round((l.correct / graded) * 100) : null;
}

export default function QuestionGoals({
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
  const [topics, setTopics] = useState<Topic[]>([]);
  const [form, setForm] = useState({
    subjectId: "",
    topicId: "",
    total: "",
    correct: "",
    wrong: "",
    blank: "",
    note: "",
  });

  useEffect(() => {
    if (!form.subjectId) return;
    let active = true;
    api<{ topics: Topic[] }>(`/api/topics?subjectId=${form.subjectId}`)
      .then((r) => active && setTopics(r.topics))
      .catch(() => active && setTopics([]));
    return () => {
      active = false;
    };
  }, [form.subjectId]);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ total: "", correct: "", wrong: "", blank: "" });

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

  const s = day.summary;

  const add = () =>
    run(async () => {
      if (!form.subjectId) {
        toast("Ders seçin", "error");
        return;
      }
      const total = Number(form.total) || 0;
      const correct = Number(form.correct) || 0;
      const wrong = Number(form.wrong) || 0;
      const blank = Number(form.blank) || 0;
      if (total <= 0) {
        toast("Toplam soru sayısı 0'dan büyük olmalı", "error");
        return;
      }
      if (correct + wrong + blank > total) {
        toast("Doğru + yanlış + boş toplamı aşamaz", "error");
        return;
      }
      await api("/api/questions", {
        method: "POST",
        body: JSON.stringify({
          date,
          subjectId: form.subjectId,
          topicId: form.topicId || undefined,
          total,
          correct,
          wrong,
          blank,
          note: form.note || undefined,
        }),
      });
      setForm({ subjectId: "", topicId: "", total: "", correct: "", wrong: "", blank: "", note: "" });
      toast("Soru kaydı eklendi", "success");
      onRefresh();
    });

  const startEdit = (l: QuestionLog) => {
    setEditing(l.id);
    setEditForm({
      total: String(l.total),
      correct: String(l.correct),
      wrong: String(l.wrong),
      blank: String(l.blank),
    });
  };

  const saveEdit = (id: number) =>
    run(async () => {
      await api(`/api/questions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          total: Number(editForm.total) || 0,
          correct: Number(editForm.correct) || 0,
          wrong: Number(editForm.wrong) || 0,
          blank: Number(editForm.blank) || 0,
        }),
      });
      setEditing(null);
      toast("Kayıt güncellendi", "success");
      onRefresh();
    });

  const remove = (id: number) =>
    run(async () => {
      await api(`/api/questions/${id}`, { method: "DELETE" });
      toast("Kayıt silindi", "success");
      onRefresh();
    });

  const dayAccuracy = accuracyOf({ correct: s.questionsCorrect, wrong: s.questionsWrong });

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Bugünkü soru özeti</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Toplam çözülen" value={s.questionsTotal} accent="#2563eb" />
          <Stat label="Doğru" value={s.questionsCorrect} accent="#16a34a" />
          <Stat label="Yanlış" value={s.questionsWrong} accent="#dc2626" />
          <Stat label="Boş" value={s.questionsBlank} accent="#64748b" />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Doğru oranı:{" "}
          <strong>
            {dayAccuracy !== null ? `%${dayAccuracy}` : "Yeterli veri yok (en az 10 cevaplanmış soru)"}
          </strong>
        </p>
      </Card>

      <Card>
        <SectionTitle>Soru kaydı ekle</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-5">
          <label className="text-sm sm:col-span-3">
            <span className="mb-1 block text-slate-600">Ders</span>
            <select
              value={form.subjectId}
              onChange={(e) => {
                setTopics([]);
                setForm({ ...form, subjectId: e.target.value, topicId: "" });
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              autoFocus
            >
              <option value="">Ders seçin</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-600">
              Konu <span className="text-slate-400">(zayıf konu analizi için)</span>
            </span>
            <select
              value={form.topicId}
              onChange={(e) => setForm({ ...form, topicId: e.target.value })}
              disabled={!form.subjectId || topics.length === 0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            >
              <option value="">
                {topics.length === 0 ? "Konu yok (opsiyonel)" : "Konu seç (opsiyonel)"}
              </option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Toplam</span>
            <input type="number" min={0} value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Doğru</span>
            <input type="number" min={0} value={form.correct} onChange={(e) => setForm({ ...form, correct: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Yanlış</span>
            <input type="number" min={0} value={form.wrong} onChange={(e) => setForm({ ...form, wrong: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Boş</span>
            <input type="number" min={0} value={form.blank} onChange={(e) => setForm({ ...form, blank: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          İpucu: Yalnızca toplamı girip doğru/yanlış/boş alanlarını boş bırakabilirsin; dağılım tahmin edilmez.
        </p>
        <div className="mt-3">
          <Button onClick={add} disabled={busy}>
            Kaydet
          </Button>
        </div>
      </Card>

      <Card>
        <SectionTitle>Bugünün kayıtları</SectionTitle>
        {day.questionLogs.length === 0 ? (
          <EmptyState title="Henüz soru kaydı yok" description="Çözdüğün soruları ders bazında kaydet." />
        ) : (
          <ul className="space-y-2">
            {day.questionLogs.map((l) => {
              const acc = accuracyOf(l);
              return (
                <li key={l.id} className="rounded-xl border border-slate-200 p-3">
                  {editing === l.id ? (
                    <div className="grid gap-2 sm:grid-cols-5">
                      <input type="number" min={0} value={editForm.total} onChange={(e) => setEditForm({ ...editForm, total: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="Toplam" />
                      <input type="number" min={0} value={editForm.correct} onChange={(e) => setEditForm({ ...editForm, correct: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="Doğru" />
                      <input type="number" min={0} value={editForm.wrong} onChange={(e) => setEditForm({ ...editForm, wrong: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="Yanlış" />
                      <input type="number" min={0} value={editForm.blank} onChange={(e) => setEditForm({ ...editForm, blank: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="Boş" />
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={() => saveEdit(l.id)} disabled={busy}>Kaydet</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>İptal</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{l.subjectName}</p>
                        <p className="text-xs text-slate-500">
                          {l.total} soru
                          {l.breakdownAvailable
                            ? ` · ${l.correct}D / ${l.wrong}Y / ${l.blank}B`
                            : " · Dağılım girilmedi"}
                          {acc !== null && ` · %${acc} doğru`}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => startEdit(l)}>Düzenle</Button>
                        <Button size="sm" variant="danger" onClick={() => remove(l.id)} disabled={busy}>Sil</Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
