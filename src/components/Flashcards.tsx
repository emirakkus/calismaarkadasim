"use client";

import { useEffect, useMemo, useState } from "react";
import { BookIcon, ChevronRightIcon, RepeatIcon } from "@/components/icons";
import { Card, SectionTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/client";

type FlashcardView = "daily" | "tyt" | "ayt" | "favorites" | "review" | "learned";
type FlashcardItem = {
  id: string;
  examType: "TYT" | "AYT";
  subjectName: string;
  topicName: string;
  question: string;
  answer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  status: "new" | "learned" | "review" | null;
  intervalDays: number | null;
  dueDate: string | null;
  isFavorite: boolean;
};
type FlashcardResponse = {
  cards: FlashcardItem[];
  filteredTotal: number;
  subjects: string[];
  topics: string[];
  stats: {
    total: number;
    learned: number;
    review: number;
    favorites: number;
    dailyCompleted: number;
    dailyGoal: number;
    dailyPercent: number;
  };
};
type Toast = (message: string, type?: "success" | "error") => void;

const VIEWS: { id: FlashcardView; label: string }[] = [
  { id: "daily", label: "Günün Bilgi Kartları" },
  { id: "tyt", label: "TYT Kartları" },
  { id: "ayt", label: "AYT Kartları" },
  { id: "favorites", label: "Favorilerim" },
  { id: "review", label: "Tekrar Etmem Gerekenler" },
  { id: "learned", label: "Öğrendiklerim" },
];

const DIFFICULTY_LABEL: Record<FlashcardItem["difficulty"], string> = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
};

export default function Flashcards({ toast }: { toast: Toast }) {
  const [view, setView] = useState<FlashcardView>("daily");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [response, setResponse] = useState<FlashcardResponse | null>(null);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [sessionSeen, setSessionSeen] = useState<Set<string>>(() => new Set());
  const [studyPosition, setStudyPosition] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const exam = view === "tyt" ? "TYT" : view === "ayt" ? "AYT" : "";
  const query = useMemo(() => {
    const params = new URLSearchParams({ view: view === "tyt" || view === "ayt" ? "all" : view });
    if (exam) params.set("exam", exam);
    if (subject) params.set("subject", subject);
    if (topic) params.set("topic", topic);
    if (difficulty) params.set("difficulty", difficulty);
    return params.toString();
  }, [view, exam, subject, topic, difficulty]);
  const loading = loadedQuery !== query;

  useEffect(() => {
    let active = true;
    api<FlashcardResponse>(`/api/flashcards?${query}`)
      .then((data) => {
        if (active) setResponse(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setResponse(null);
          toast(error instanceof Error ? error.message : "Bilgi kartları yüklenemedi", "error");
        }
      })
      .finally(() => {
        if (active) setLoadedQuery(query);
      });
    return () => {
      active = false;
    };
  }, [query, refreshKey, toast]);

  const cards = response?.cards.filter((card) => !sessionSeen.has(card.id)) ?? [];
  const currentCard = cards[0];
  const subjects = response?.subjects ?? [];
  const topics = response?.topics ?? [];
  const stats = response?.stats;

  async function rateCard(rating: "known" | "repeat") {
    if (!currentCard || saving) return;
    setSaving(true);
    try {
      await api("/api/flashcards", {
        method: "POST",
        body: JSON.stringify({ action: rating, cardId: currentCard.id }),
      });
      toast(rating === "known" ? "Kart öğrenildi olarak kaydedildi" : "Kart tekrar listene eklendi");
      setSessionSeen((seen) => new Set(seen).add(currentCard.id));
      setStudyPosition((position) => position + 1);
      setFlipped(false);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Kart ilerlemesi kaydedilemedi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(card: FlashcardItem) {
    if (saving) return;
    setSaving(true);
    try {
      await api("/api/flashcards", {
        method: "POST",
        body: JSON.stringify({ action: "favorite", cardId: card.id }),
      });
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Favori güncellenemedi", "error");
    } finally {
      setSaving(false);
    }
  }

  function changeView(nextView: FlashcardView) {
    setView(nextView);
    setSubject("");
    setTopic("");
    setDifficulty("");
    setFlipped(false);
    setSessionSeen(new Set());
    setStudyPosition(0);
  }

  if (loading && !response) return <Spinner label="Bilgi kartları yükleniyor..." />;

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={<BookIcon className="h-5 w-5" />}>Bilgi Kartları</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Toplam kart", stats?.total ?? 0],
            ["Öğrendiklerim", stats?.learned ?? 0],
            ["Tekrar bekleyen", stats?.review ?? 0],
            ["Günlük hedef", `${stats?.dailyCompleted ?? 0} / ${stats?.dailyGoal ?? 10} · %${stats?.dailyPercent ?? 0}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-2"
          role="tablist"
          aria-label="Bilgi kartı kategorileri"
        >
          {VIEWS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={view === item.id}
              onClick={() => changeView(item.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${
                view === item.id
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-slate-600">
            Ders
            <select
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                setTopic("");
                setSessionSeen(new Set());
                setStudyPosition(0);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">Tüm dersler</option>
              {subjects.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Konu
            <select
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value);
                setSessionSeen(new Set());
                setStudyPosition(0);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">Tüm konular</option>
              {topics.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Zorluk
            <select
              value={difficulty}
              onChange={(event) => {
                setDifficulty(event.target.value);
                setSessionSeen(new Set());
                setStudyPosition(0);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">Tüm seviyeler</option>
              {Object.entries(DIFFICULTY_LABEL).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {loading ? (
        <Spinner label="Kartlar getiriliyor..." />
      ) : view === "daily" && stats && stats.dailyCompleted >= stats.dailyGoal ? (
        <Card className="py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Günün hedefi tamamlandı!</h2>
          <p className="mt-2 text-sm text-slate-500">Bugün {stats.dailyGoal} kart çalıştın. Harika iş!</p>
        </Card>
      ) : currentCard ? (
        <Card>
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{currentCard.examType}</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{currentCard.subjectName}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{currentCard.topicName}</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">{DIFFICULTY_LABEL[currentCard.difficulty]}</span>
              </div>
              <button
                onClick={() => toggleFavorite(currentCard)}
                disabled={saving}
                aria-label={currentCard.isFavorite ? "Favorilerimden çıkar" : "Favorilerime ekle"}
                className="shrink-0 rounded-lg p-2 text-xl text-amber-500 hover:bg-amber-50"
              >
                {currentCard.isFavorite ? "★" : "☆"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFlipped((value) => !value)}
              aria-label={flipped ? "Kartın sorusunu göster" : "Kartın cevabını göster"}
              className="w-full text-left [perspective:1200px]"
            >
              <div
                className="relative min-h-72 transition-transform duration-500 [transform-style:preserve-3d]"
                style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                <div className="absolute inset-0 flex min-h-72 flex-col justify-between rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-8 [backface-visibility:hidden]">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Kart {view === "daily" ? (stats?.dailyCompleted ?? 0) + 1 : studyPosition + 1} / {view === "daily" ? stats?.dailyGoal ?? 10 : response?.filteredTotal ?? cards.length}</span>
                    <span>Kendini dene · çevirmek için dokun</span>
                  </div>
                  <div className="py-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Soru</p>
                    <h2 className="mt-3 text-xl font-semibold leading-relaxed text-slate-900 sm:text-2xl">{currentCard.question}</h2>
                  </div>
                  <span className="text-xs text-slate-500">{currentCard.topicName}</span>
                </div>
                <div className="absolute inset-0 flex min-h-72 flex-col justify-between overflow-y-auto rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Cevap ve kısa açıklama</div>
                  <div className="py-4">
                    <p className="text-base font-semibold leading-relaxed text-slate-900">{currentCard.answer}</p>
                    <p className="mt-4 border-t border-blue-100 pt-4 text-sm leading-relaxed text-slate-600">{currentCard.explanation}</p>
                  </div>
                  <span className="text-xs text-slate-500">Kartı çevirmek için dokun</span>
                </div>
              </div>
            </button>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => rateCard("known")}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Biliyorum
              </button>
              <button
                onClick={() => rateCard("repeat")}
                disabled={saving}
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                Tekrar Etmeliyim
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              {currentCard.intervalDays ? `Önceki tekrar aralığı: ${currentCard.intervalDays} gün` : "İlk kez görülen kart"}
              {" · "}{cards.length} kart kaldı
            </p>
          </div>
        </Card>
      ) : (
        <Card className="py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <RepeatIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-3 font-semibold text-slate-900">Bu filtrede gösterilecek kart yok</h2>
          <p className="mt-1 text-sm text-slate-500">
            {view === "daily" ? "Bugünlük yeni veya zamanı gelen kart kalmadı." : "Başka bir ders ya da konu seçebilirsin."}
          </p>
        </Card>
      )}
    </div>
  );
}
