"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudyNote, WrongQuestion, Subject } from "@/lib/types";
import { Card, Button, SectionTitle, Spinner, EmptyState } from "@/components/ui";
import { api } from "@/lib/client";
import { PencilIcon, SearchIcon } from "@/components/icons";

export default function Notes({
  subjects,
  toast,
}: {
  subjects: Subject[];
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [tab, setTab] = useState<"notes" | "wrong">("notes");
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [wrong, setWrong] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const [noteForm, setNoteForm] = useState({ title: "", content: "", tags: "", subjectId: "" });
  const [wrongForm, setWrongForm] = useState({
    questionText: "",
    subjectId: "",
    userAnswer: "",
    correctAnswer: "",
    mistakeReason: "",
    explanation: "",
  });

  async function load() {
    const [n, w] = await Promise.all([
      api<{ notes: StudyNote[] }>("/api/notes"),
      api<{ wrongQuestions: WrongQuestion[] }>("/api/wrong-questions"),
    ]);
    setNotes(n.notes);
    setWrong(w.wrongQuestions);
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

  const addNote = () =>
    run(async () => {
      if (!noteForm.title.trim()) {
        toast("Başlık gerekli", "error");
        return;
      }
      await api("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          title: noteForm.title.trim(),
          content: noteForm.content,
          tags: noteForm.tags,
          subjectId: noteForm.subjectId || undefined,
        }),
      });
      setNoteForm({ title: "", content: "", tags: "", subjectId: "" });
      await load();
      toast("Not eklendi");
    });

  const togglePin = (n: StudyNote) =>
    run(async () => {
      await api(`/api/notes/${n.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPinned: !n.isPinned }),
      });
      await load();
    });

  const removeNote = (n: StudyNote) =>
    run(async () => {
      if (!window.confirm("Bu not silinsin mi?")) return;
      await api(`/api/notes/${n.id}`, { method: "DELETE" });
      await load();
      toast("Not silindi");
    });

  const addWrong = () =>
    run(async () => {
      if (!wrongForm.questionText.trim()) {
        toast("Soru açıklaması gerekli", "error");
        return;
      }
      await api("/api/wrong-questions", {
        method: "POST",
        body: JSON.stringify({
          questionText: wrongForm.questionText.trim(),
          subjectId: wrongForm.subjectId || undefined,
          userAnswer: wrongForm.userAnswer || undefined,
          correctAnswer: wrongForm.correctAnswer || undefined,
          mistakeReason: wrongForm.mistakeReason || undefined,
          explanation: wrongForm.explanation || undefined,
        }),
      });
      setWrongForm({ questionText: "", subjectId: "", userAnswer: "", correctAnswer: "", mistakeReason: "", explanation: "" });
      await load();
      toast("Yanlış kaydı eklendi");
    });

  const toggleReviewed = (w: WrongQuestion) =>
    run(async () => {
      await api(`/api/wrong-questions/${w.id}`, {
        method: "PATCH",
        body: JSON.stringify({ reviewStatus: w.reviewStatus === "open" ? "reviewed" : "open" }),
      });
      await load();
    });

  const removeWrong = (w: WrongQuestion) =>
    run(async () => {
      if (!window.confirm("Bu yanlış kaydı silinsin mi?")) return;
      await api(`/api/wrong-questions/${w.id}`, { method: "DELETE" });
      await load();
      toast("Silindi");
    });

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return notes.filter((n) => {
      if (filterSubject && String(n.subjectId ?? "") !== filterSubject) return false;
      if (!q) return true;
      return (
        n.title.toLocaleLowerCase("tr").includes(q) ||
        n.content.toLocaleLowerCase("tr").includes(q) ||
        n.tags.toLocaleLowerCase("tr").includes(q)
      );
    });
  }, [notes, query, filterSubject]);

  const filteredWrong = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return wrong.filter((w) => {
      if (filterSubject && String(w.subjectId ?? "") !== filterSubject) return false;
      if (!q) return true;
      return (
        w.questionText.toLocaleLowerCase("tr").includes(q) ||
        (w.mistakeReason ?? "").toLocaleLowerCase("tr").includes(q)
      );
    });
  }, [wrong, query, filterSubject]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={<PencilIcon className="h-5 w-5" />}>
          Notlar ve Yanlış Defteri
        </SectionTitle>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setTab("notes")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "notes" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}
            >
              Notlar ({notes.length})
            </button>
            <button
              onClick={() => setTab("wrong")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "wrong" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500"}`}
            >
              Yanlış Defteri ({wrong.length})
            </button>
          </div>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ara..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tüm dersler</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {tab === "notes" ? (
        <>
          <Card>
            <SectionTitle>Yeni not</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                placeholder="Başlık"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={noteForm.subjectId}
                onChange={(e) => setNoteForm({ ...noteForm, subjectId: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Ders (opsiyonel)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                placeholder="İçerik"
                rows={3}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                value={noteForm.tags}
                onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })}
                placeholder="Etiketler (virgülle)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              />
            </div>
            <div className="mt-3">
              <Button onClick={addNote} disabled={busy}>Not ekle</Button>
            </div>
          </Card>

          {filteredNotes.length === 0 ? (
            <EmptyState title="Not bulunamadı" description="İlk notunu ekleyerek başla." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredNotes.map((n) => (
                <Card key={n.id} className={n.isPinned ? "border-amber-200" : ""}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-800">{n.title}</h3>
                    {n.isPinned && <span className="text-xs text-amber-600">📌 Sabit</span>}
                  </div>
                  {n.subjectName && (
                    <p className="mt-0.5 text-xs text-slate-400">{n.subjectName}</p>
                  )}
                  {n.content && (
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{n.content}</p>
                  )}
                  {n.tags && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {n.tags.split(",").map((t, i) =>
                        t.trim() ? (
                          <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            #{t.trim()}
                          </span>
                        ) : null,
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => togglePin(n)} disabled={busy}>
                      {n.isPinned ? "Sabiti kaldır" : "Sabitle"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => removeNote(n)} disabled={busy}>
                      Sil
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <Card>
            <SectionTitle>Yeni yanlış kaydı</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <textarea
                value={wrongForm.questionText}
                onChange={(e) => setWrongForm({ ...wrongForm, questionText: e.target.value })}
                placeholder="Soru veya sorunun kısa açıklaması"
                rows={2}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              />
              <select
                value={wrongForm.subjectId}
                onChange={(e) => setWrongForm({ ...wrongForm, subjectId: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Ders (opsiyonel)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                value={wrongForm.mistakeReason}
                onChange={(e) => setWrongForm({ ...wrongForm, mistakeReason: e.target.value })}
                placeholder="Yanlışın nedeni"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={wrongForm.userAnswer}
                onChange={(e) => setWrongForm({ ...wrongForm, userAnswer: e.target.value })}
                placeholder="Verdiğin cevap (opsiyonel)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={wrongForm.correctAnswer}
                onChange={(e) => setWrongForm({ ...wrongForm, correctAnswer: e.target.value })}
                placeholder="Doğru cevap (biliyorsan)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                value={wrongForm.explanation}
                onChange={(e) => setWrongForm({ ...wrongForm, explanation: e.target.value })}
                placeholder="Çözüm yöntemi / açıklama"
                rows={2}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Doğru cevabı sen girmezsen boş bırakılır; uygulama uydurmaz.
            </p>
            <div className="mt-3">
              <Button onClick={addWrong} disabled={busy}>Kaydet</Button>
            </div>
          </Card>

          {filteredWrong.length === 0 ? (
            <EmptyState title="Yanlış kaydı bulunamadı" />
          ) : (
            <ul className="space-y-2">
              {filteredWrong.map((w) => (
                <li key={w.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-800">{w.questionText}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${w.reviewStatus === "reviewed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {w.reviewStatus === "reviewed" ? "Çalışıldı" : "Bekliyor"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    {w.subjectName && <span>{w.subjectName}</span>}
                    {w.mistakeReason && <span>Neden: {w.mistakeReason}</span>}
                    {w.userAnswer && <span>Cevabın: {w.userAnswer}</span>}
                    {w.correctAnswer && <span>Doğru: {w.correctAnswer}</span>}
                  </div>
                  {w.explanation && (
                    <p className="mt-1.5 text-sm text-slate-600">{w.explanation}</p>
                  )}
                  <div className="mt-2 flex gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => toggleReviewed(w)} disabled={busy}>
                      {w.reviewStatus === "reviewed" ? "Beklemeye al" : "Çalışıldı işaretle"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => removeWrong(w)} disabled={busy}>
                      Sil
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
