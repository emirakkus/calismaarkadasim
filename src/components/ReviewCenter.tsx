"use client";

import { useEffect, useState } from "react";
import type { ReviewTask, Topic, Subject } from "@/lib/types";
import { Card, Button, SectionTitle, Spinner, EmptyState } from "@/components/ui";
import { api } from "@/lib/client";
import { RepeatIcon } from "@/components/icons";
import { formatShortTR, todayISO, addDays } from "@/lib/date";

const RATING_LABEL: Record<string, string> = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
};

export default function ReviewCenter({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [reviews, setReviews] = useState<ReviewTask[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newTopic, setNewTopic] = useState("");

  async function load() {
    const [rv, tp, sch] = await Promise.all([
      api<{ reviews: ReviewTask[] }>("/api/reviews?scope=all"),
      api<{ topics: Topic[] }>("/api/topics"),
      api<{ subjects: Subject[] }>("/api/schedule"),
    ]);
    setReviews(rv.reviews);
    setTopics(tp.topics);
    setSubjects(sch.subjects);
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

  const subName = (id: number) => subjects.find((s) => s.id === id)?.name ?? "";

  const addReview = () =>
    run(async () => {
      if (!newTopic) {
        toast("Konu seçin", "error");
        return;
      }
      await api("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ topicId: Number(newTopic), stage: 1, scheduledDate: todayISO() }),
      });
      setNewTopic("");
      await load();
      toast("Tekrar kaydı oluşturuldu");
    });

  const complete = (r: ReviewTask, rating: "easy" | "medium" | "hard") =>
    run(async () => {
      const res = await api<{ nextDate: string }>(`/api/reviews/${r.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });
      await load();
      toast(`Tekrar tamamlandı. Sonraki tekrar: ${formatShortTR(res.nextDate)}`);
    });

  const postpone = (r: ReviewTask) =>
    run(async () => {
      await api(`/api/reviews/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ scheduledDate: addDays(r.scheduledDate, 1) }),
      });
      await load();
      toast("Tekrar ertelendi");
    });

  const remove = (r: ReviewTask) =>
    run(async () => {
      if (!window.confirm("Bu tekrar kaydı silinsin mi?")) return;
      await api(`/api/reviews/${r.id}`, { method: "DELETE" });
      await load();
      toast("Silindi");
    });

  if (loading) return <Spinner />;

  const today = todayISO();
  const due = reviews.filter((r) => r.status === "pending" && r.scheduledDate <= today);
  const upcoming = reviews.filter((r) => r.status === "pending" && r.scheduledDate > today);
  const done = reviews.filter((r) => r.status === "completed");

  const availableTopics = topics;

  function reviewRow(r: ReviewTask, showActions = true) {
    const overdue = r.scheduledDate < today;
    return (
      <li key={r.id} className="rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium text-slate-800">{r.topicName}</p>
            <p className="text-xs text-slate-500">
              {r.subjectName} · {r.stage}. tekrar ·{" "}
              <span className={overdue ? "font-medium text-rose-600" : ""}>
                {formatShortTR(r.scheduledDate)}
              </span>
              {r.recallRating && ` · ${RATING_LABEL[r.recallRating] ?? ""}`}
            </p>
          </div>
          {showActions && (
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => complete(r, "easy")} disabled={busy}>Kolay</Button>
              <Button size="sm" variant="secondary" onClick={() => complete(r, "medium")} disabled={busy}>Orta</Button>
              <Button size="sm" variant="secondary" onClick={() => complete(r, "hard")} disabled={busy}>Zor</Button>
              <Button size="sm" variant="ghost" onClick={() => postpone(r)} disabled={busy}>Ertele</Button>
              <Button size="sm" variant="danger" onClick={() => remove(r)} disabled={busy}>Sil</Button>
            </div>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={<RepeatIcon className="h-5 w-5" />}>Tekrar Merkezi</SectionTitle>
        <p className="mb-4 text-sm text-slate-500">
          Konu tekrarı ekle; tamamlarken "kolay/orta/zor" değerlendirmesi yap. Değerlendirmeye
          göre bir sonraki tekrar tarihi (1, 3, 7, 14, 30 gün aralıklarıyla) otomatik planlanır.
          Bu aralıklar bir kolaylık içindir, kesin bilimsel garanti değildir.
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Konu seç...</option>
            {availableTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {subName(t.subjectId)} — {t.name}
              </option>
            ))}
          </select>
          <Button onClick={addReview} disabled={busy || availableTopics.length === 0}>
            Tekrar ekle
          </Button>
        </div>
        {availableTopics.length === 0 && (
          <p className="mt-2 text-xs text-amber-600">
            Önce "Dersler ve Konular" bölümünden konu eklemelisin.
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle>Bugün yapılacak tekrarlar</SectionTitle>
        {due.length === 0 ? (
          <EmptyState title="Bugün için bekleyen tekrar yok" />
        ) : (
          <ul className="space-y-2">{due.map((r) => reviewRow(r))}</ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Yaklaşan tekrarlar</SectionTitle>
          {upcoming.length === 0 ? (
            <EmptyState title="Planlanan tekrar yok" />
          ) : (
            <ul className="space-y-2">{upcoming.map((r) => reviewRow(r))}</ul>
          )}
        </Card>
        <Card>
          <SectionTitle>Tamamlananlar</SectionTitle>
          {done.length === 0 ? (
            <EmptyState title="Henüz tamamlanan tekrar yok" />
          ) : (
            <ul className="space-y-2">{done.slice(0, 10).map((r) => reviewRow(r, false))}</ul>
          )}
        </Card>
      </div>
    </div>
  );
}
