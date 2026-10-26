"use client";

import { useEffect, useState } from "react";
import type { Subject, Topic } from "@/lib/types";
import { Card, Button, SectionTitle, Spinner, EmptyState } from "@/components/ui";
import { api } from "@/lib/client";
import { BookIcon } from "@/components/icons";
import ScheduleView from "@/components/ScheduleView";

const STATUS_CYCLE: Record<string, string> = {
  pending: "in_progress",
  in_progress: "completed",
  completed: "pending",
};
const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "Bekliyor", cls: "bg-slate-100 text-slate-600" },
  in_progress: { label: "Devam ediyor", cls: "bg-blue-50 text-blue-700" },
  completed: { label: "Tamamlandı", cls: "bg-emerald-50 text-emerald-700" },
};

export default function SubjectsTopics({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [open, setOpen] = useState<number | null>(null);

  async function load() {
    const [sch, tp] = await Promise.all([
      api<{ subjects: Subject[] }>("/api/schedule"),
      api<{ topics: Topic[] }>("/api/topics"),
    ]);
    setSubjects(sch.subjects);
    setTopics(tp.topics);
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

  const addTopic = (subjectId: number) =>
    run(async () => {
      const name = (inputs[subjectId] ?? "").trim();
      if (!name) {
        toast("Konu adı girin", "error");
        return;
      }
      await api("/api/topics", {
        method: "POST",
        body: JSON.stringify({ subjectId, name }),
      });
      setInputs({ ...inputs, [subjectId]: "" });
      await load();
      toast("Konu eklendi");
    });

  const cycleStatus = (t: Topic) =>
    run(async () => {
      await api(`/api/topics/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: STATUS_CYCLE[t.status] ?? "pending" }),
      });
      await load();
    });

  const removeTopic = (t: Topic) =>
    run(async () => {
      await api(`/api/topics/${t.id}`, { method: "DELETE" });
      await load();
      toast("Konu silindi");
    });

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <ScheduleView />

      <Card>
        <SectionTitle icon={<BookIcon className="h-5 w-5" />}>
          Dersler ve Konular
        </SectionTitle>
        <p className="mb-4 text-sm text-slate-500">
          Program görselinde konu başlıkları yer almadığından konuları buradan kendin
          eklersin. Konuları tamamlandıkça işaretle; <strong>Program ilerlemesi</strong> ve
          "en çok ilerleme kaydedilen dersler" bu verilerden hesaplanır.
        </p>

        <ul className="space-y-2">
          {subjects.map((s) => {
            const subTopics = topics.filter((t) => t.subjectId === s.id);
            const completed = subTopics.filter((t) => t.status === "completed").length;
            const isOpen = open === s.id;
            return (
              <li key={s.id} className="overflow-hidden rounded-xl border border-slate-200">
                <button
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="font-medium text-slate-800">{s.name}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {subTopics.length > 0
                      ? `${completed}/${subTopics.length} konu`
                      : "konu yok"}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-3">
                    {subTopics.length === 0 ? (
                      <p className="mb-3 text-sm text-slate-500">
                        Bu ders için henüz konu eklenmedi.
                      </p>
                    ) : (
                      <ul className="mb-3 space-y-1.5">
                        {subTopics.map((t) => {
                          const st = STATUS_LABEL[t.status] ?? STATUS_LABEL.pending;
                          return (
                            <li
                              key={t.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2"
                            >
                              <span className={`text-sm ${t.status === "completed" ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                {t.name}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <button
                                  onClick={() => cycleStatus(t)}
                                  disabled={busy}
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}
                                >
                                  {st.label}
                                </button>
                                <button
                                  onClick={() => removeTopic(t)}
                                  disabled={busy}
                                  className="rounded-md px-1.5 py-0.5 text-xs text-rose-500 hover:bg-rose-50"
                                  aria-label="Konu sil"
                                >
                                  Sil
                                </button>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <div className="flex gap-2">
                      <input
                        value={inputs[s.id] ?? ""}
                        onChange={(e) => setInputs({ ...inputs, [s.id]: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && addTopic(s.id)}
                        placeholder="Yeni konu adı"
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      />
                      <Button size="sm" onClick={() => addTopic(s.id)} disabled={busy}>
                        Ekle
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
