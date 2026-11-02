"use client";

import { useMemo, useState } from "react";
import { BookIcon, ChevronRightIcon, RepeatIcon } from "@/components/icons";
import { Card, SectionTitle } from "@/components/ui";
import { getFlashcards } from "@/lib/flashcards";

export default function Flashcards() {
  const cards = useMemo(() => getFlashcards(), []);
  const subjects = useMemo(
    () => [...new Set(cards.map((card) => card.subjectName))],
    [cards],
  );
  const [subjectFilter, setSubjectFilter] = useState("Tümü");
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const filteredCards = useMemo(
    () =>
      subjectFilter === "Tümü"
        ? cards
        : cards.filter((card) => card.subjectName === subjectFilter),
    [cards, subjectFilter],
  );
  const currentCard = filteredCards[cardIndex];

  function changeSubject(subject: string) {
    setSubjectFilter(subject);
    setCardIndex(0);
    setRevealed(false);
  }

  function moveCard(direction: -1 | 1) {
    setCardIndex((index) => (index + direction + filteredCards.length) % filteredCards.length);
    setRevealed(false);
  }

  function shuffleCard() {
    if (filteredCards.length < 2) return;
    let nextIndex = Math.floor(Math.random() * (filteredCards.length - 1));
    if (nextIndex >= cardIndex) nextIndex += 1;
    setCardIndex(nextIndex);
    setRevealed(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={<BookIcon className="h-5 w-5" />}>
          Konu Flashcard’ları
        </SectionTitle>
        <p className="mb-4 text-sm text-slate-500">
          Her konu için kısa bir hatırlatma kartı. Önce soruyu düşün, sonra cevabı
          açıp kendini kontrol et.
        </p>
        <label className="mb-5 block max-w-sm text-sm font-medium text-slate-700">
          Ders seç
          <select
            value={subjectFilter}
            onChange={(event) => changeSubject(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            <option value="Tümü">Tüm dersler ({cards.length} kart)</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject} ({cards.filter((card) => card.subjectName === subject).length} kart)
              </option>
            ))}
          </select>
        </label>

        {currentCard && (
          <div
            className="mx-auto max-w-2xl rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-8"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
                {currentCard.subjectName}
              </span>
              <span className="text-sm tabular-nums text-slate-500">
                {cardIndex + 1} / {filteredCards.length}
              </span>
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {revealed ? "Kısa bilgi" : "Kendini dene"}
            </p>
            <h3 className="mt-2 min-h-24 text-xl font-semibold leading-relaxed text-slate-900 sm:text-2xl">
              {revealed ? currentCard.back : currentCard.front}
            </h3>
            <button
              onClick={() => setRevealed((value) => !value)}
              className="mt-6 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              {revealed ? "Soruyu göster" : "Cevabı göster"}
            </button>
          </div>
        )}

        <div className="mx-auto mt-5 flex max-w-2xl items-center justify-between gap-2">
          <button
            onClick={() => moveCard(-1)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            aria-label="Önceki kart"
          >
            Önceki
          </button>
          <button
            onClick={shuffleCard}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RepeatIcon className="h-4 w-4" />
            Karıştır
          </button>
          <button
            onClick={() => moveCard(1)}
            className="flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            aria-label="Sonraki kart"
          >
            Sonraki
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}
