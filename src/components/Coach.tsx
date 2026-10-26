"use client";

import { useEffect, useRef, useState } from "react";
import type { CoachMessage } from "@/lib/types";
import { Card, Button, Spinner } from "@/components/ui";
import { api } from "@/lib/client";

const QUICK_PROMPTS = [
  "Bugünkü planımı açıkla",
  "Hedeflerime göre nasıl gidiyorum?",
  "Hangi konularda geri kaldım?",
  "Haftalık ilerlememi özetle",
  "Bugün tamamlayamadım, yeni plan öner",
];

export default function Coach({
  date,
  toast,
}: {
  date: string;
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ messages: CoachMessage[]; aiEnabled: boolean }>("/api/coach")
      .then((r) => {
        setMessages(r.messages);
        setAiEnabled(r.aiEnabled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    const optimistic: CoachMessage = {
      id: Date.now(),
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    try {
      const r = await api<{ reply: string }>("/api/coach", {
        method: "POST",
        body: JSON.stringify({ message, date }),
      });
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: r.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Koç yanıt veremedi", "error");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {!aiEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Yapay zekâ servisi (OPENAI_API_KEY) tanımlı değil. Koç, yine de gerçek
          çalışma verilerine dayalı öneriler sunar; anahtar eklendiğinde daha
          kişiselleştirilmiş yanıtlar verir.
        </div>
      )}

      <Card className="flex h-[60vh] min-h-[420px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <Spinner />
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-500">
              <span className="mb-2 text-3xl">🧭</span>
              <p>Çalışma koçuna gerçek verilerine dayalı sorular sorabilirsin.</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500">
                Koç düşünüyor...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              disabled={sending}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Koça bir soru sor..."
            aria-label="Koça mesaj"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <Button type="submit" disabled={sending || !input.trim()}>
            Gönder
          </Button>
        </form>
      </Card>
    </div>
  );
}
