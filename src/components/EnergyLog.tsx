"use client";

import { useEffect, useState } from "react";
import type { EnergyLog as EnergyLogType } from "@/lib/types";
import { Card, Button, SectionTitle, Spinner, EmptyState, Stat } from "@/components/ui";
import { api } from "@/lib/client";
import { todayISO, formatShortTR } from "@/lib/date";

function Scale({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-lg border text-sm font-medium transition ${
            value >= n ? "text-white" : "border-slate-300 text-slate-400"
          }`}
          style={value >= n ? { backgroundColor: color, borderColor: color } : undefined}
          aria-label={`${n} puan`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function EnergyLog({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [logs, setLogs] = useState<EnergyLogType[]>([]);
  const [agg, setAgg] = useState({ count: 0, avgEnergy: 0, avgMotivation: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ energy: 3, motivation: 3, note: "" });

  async function load() {
    const r = await api<{ logs: EnergyLogType[]; count: number; avgEnergy: number; avgMotivation: number }>(
      "/api/energy",
    );
    setLogs(r.logs);
    setAgg({ count: r.count, avgEnergy: r.avgEnergy, avgMotivation: r.avgMotivation });
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

  const add = () =>
    run(async () => {
      await api("/api/energy", {
        method: "POST",
        body: JSON.stringify({ date: todayISO(), energy: form.energy, motivation: form.motivation, note: form.note || undefined }),
      });
      setForm({ energy: 3, motivation: 3, note: "" });
      await load();
      toast("Kayıt eklendi");
    });

  const remove = (id: number) =>
    run(async () => {
      await api(`/api/energy/${id}`, { method: "DELETE" });
      await load();
      toast("Silindi");
    });

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Enerji ve Motivasyon Kaydı</SectionTitle>
        <p className="mb-4 text-sm text-slate-500">
          Çalışma öncesi/sonrası enerji ve motivasyonunu 1–5 arasında kaydet. Bu kayıtlar isteğe
          bağlıdır ve yalnızca kişisel gözlem içindir; tıbbi değerlendirme amacı taşımaz.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm text-slate-600">Enerji düzeyi</p>
            <Scale value={form.energy} onChange={(v) => setForm({ ...form, energy: v })} color="#059669" />
          </div>
          <div>
            <p className="mb-1.5 text-sm text-slate-600">Motivasyon düzeyi</p>
            <Scale value={form.motivation} onChange={(v) => setForm({ ...form, motivation: v })} color="#7c3aed" />
          </div>
        </div>
        <input
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="Kısa not (opsiyonel)"
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="mt-3">
          <Button onClick={add} disabled={busy}>Kaydet</Button>
        </div>
      </Card>

      {agg.count >= 3 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Kayıt sayısı" value={agg.count} />
          <Stat label="Ortalama enerji" value={agg.avgEnergy} accent="#059669" />
          <Stat label="Ortalama motivasyon" value={agg.avgMotivation} accent="#7c3aed" />
        </div>
      ) : (
        <Card>
          <p className="text-sm text-slate-500">
            Anlamlı ortalamalar için en az 3 kayıt gerekli. Şu an {agg.count} kayıt var.
          </p>
        </Card>
      )}

      <Card>
        <SectionTitle>Son kayıtlar</SectionTitle>
        {logs.length === 0 ? (
          <EmptyState title="Henüz kayıt yok" />
        ) : (
          <ul className="space-y-2">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5">
                <div>
                  <p className="text-sm text-slate-700">
                    {formatShortTR(l.date)} · Enerji {l.energy}/5 · Motivasyon {l.motivation}/5
                  </p>
                  {l.note && <p className="text-xs text-slate-500">{l.note}</p>}
                </div>
                <Button size="sm" variant="danger" onClick={() => remove(l.id)} disabled={busy}>Sil</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
