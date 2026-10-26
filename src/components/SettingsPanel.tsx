"use client";

import { useEffect, useState } from "react";
import type { Settings as SettingsType, ExamSetting } from "@/lib/types";
import { Card, Button, SectionTitle } from "@/components/ui";
import { api } from "@/lib/client";
import { SettingsIcon } from "@/components/icons";

export default function SettingsPanel({
  settings,
  onUpdated,
  toast,
}: {
  settings: SettingsType;
  onUpdated: (s: SettingsType) => void;
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [form, setForm] = useState({
    userName: settings.userName,
    defaultDailyQuestionGoal: String(settings.defaultDailyQuestionGoal),
    defaultDailyMinutesGoal: String(settings.defaultDailyMinutesGoal),
  });
  const [exam, setExam] = useState({ examName: "", examDate: "", weakThreshold: "60" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ exam: ExamSetting | null }>("/api/exam")
      .then((r) => {
        if (r.exam)
          setExam({
            examName: r.exam.examName ?? "",
            examDate: r.exam.examDate ?? "",
            weakThreshold: String(r.exam.weakThreshold ?? 60),
          });
      })
      .catch(() => {});
  }, []);

  async function saveProfile() {
    setBusy(true);
    try {
      const r = await api<{ settings: SettingsType }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          userName: form.userName,
          defaultDailyQuestionGoal: Number(form.defaultDailyQuestionGoal) || 0,
          defaultDailyMinutesGoal: Number(form.defaultDailyMinutesGoal) || 0,
        }),
      });
      onUpdated(r.settings);
      toast("Ayarlar kaydedildi");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Hata", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveExam() {
    setBusy(true);
    try {
      await api("/api/exam", {
        method: "PUT",
        body: JSON.stringify({
          examName: exam.examName,
          examDate: exam.examDate || null,
          weakThreshold: Number(exam.weakThreshold) || 60,
        }),
      });
      toast("Sınav ayarları kaydedildi");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Hata", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={<SettingsIcon className="h-5 w-5" />}>Profil</SectionTitle>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Adın (karşılamada görünür)</span>
          <input
            value={form.userName}
            onChange={(e) => setForm({ ...form, userName: e.target.value })}
            placeholder="örn. Emir"
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </Card>

      <Card>
        <SectionTitle>Varsayılan günlük hedefler</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Günlük soru hedefi</span>
            <input
              type="number"
              min={0}
              value={form.defaultDailyQuestionGoal}
              onChange={(e) => setForm({ ...form, defaultDailyQuestionGoal: e.target.value })}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Günlük süre hedefi (dk)</span>
            <input
              type="number"
              min={0}
              value={form.defaultDailyMinutesGoal}
              onChange={(e) => setForm({ ...form, defaultDailyMinutesGoal: e.target.value })}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Programdan görev oluşturduğun günlerde soru hedefi otomatik hesaplanır; bu değerler
          yalnızca özel hedef girmediğin günler için kullanılır.
        </p>
        <div className="mt-4">
          <Button onClick={saveProfile} disabled={busy}>Profili ve hedefleri kaydet</Button>
        </div>
      </Card>

      <Card>
        <SectionTitle>Sınav ve analiz ayarları</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Sınav adı</span>
            <input
              value={exam.examName}
              onChange={(e) => setExam({ ...exam, examName: e.target.value })}
              placeholder="örn. YKS"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Sınav tarihi</span>
            <input
              type="date"
              value={exam.examDate}
              onChange={(e) => setExam({ ...exam, examDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Zayıf konu eşiği (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={exam.weakThreshold}
              onChange={(e) => setExam({ ...exam, weakThreshold: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Sınav tarihi girildiğinde ana panelde geri sayım görünür. Doğru oranı bu eşiğin altındaki
          konular zayıf olarak değerlendirilir.
        </p>
        <div className="mt-4">
          <Button onClick={saveExam} disabled={busy}>Sınav ayarlarını kaydet</Button>
        </div>
      </Card>
    </div>
  );
}
