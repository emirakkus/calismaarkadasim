"use client";

import { useEffect, useState } from "react";
import type { WeakTopic } from "@/lib/types";
import { Card, Button, SectionTitle, Spinner, EmptyState } from "@/components/ui";
import { api } from "@/lib/client";
import { TargetIcon } from "@/components/icons";

export default function WeakTopics({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [data, setData] = useState<{
    threshold: number;
    weak: WeakTopic[];
    analysis: WeakTopic[];
    insufficient: WeakTopic[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    const d = await api<{
      threshold: number;
      weak: WeakTopic[];
      analysis: WeakTopic[];
      insufficient: WeakTopic[];
    }>("/api/weak-topics");
    setData(d);
  }

  useEffect(() => {
    load()
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const makeReview = (t: WeakTopic) => {
    setBusy(true);
    api("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ topicId: t.topicId, stage: 1 }),
    })
      .then(() => toast(`${t.topicName} için tekrar kaydı oluşturuldu`))
      .catch((e) => toast(e.message, "error"))
      .finally(() => setBusy(false));
  };

  if (loading) return <Spinner />;
  if (!data) return <EmptyState title="Veri yüklenemedi" />;

  const graded = data.analysis.filter((a) => a.hasEnoughData);

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={<TargetIcon className="h-5 w-5" />}>Zayıf Konular Analizi</SectionTitle>
        <p className="text-sm text-slate-500">
          Analiz; soru kayıtlarında <strong>konu seçilmiş</strong> verilerden hesaplanır. Doğru
          oranı (en az 10 cevaplanmış soruda), yanlış sayısı ve son çalışma tarihi ayrı sinyaller
          olarak değerlendirilir. Doğru oranı eşiği: <strong>%{data.threshold}</strong> (Ayarlar'dan
          değiştirilebilir).
        </p>
      </Card>

      <Card>
        <SectionTitle>Dikkat edilmesi gereken konular</SectionTitle>
        {data.weak.length === 0 ? (
          <EmptyState
            title="Zayıf konu sinyali yok"
            description="Yeterli veri biriktikçe ve bir konu eşik altına düştüğünde burada görünür."
          />
        ) : (
          <ul className="space-y-2">
            {data.weak.map((t) => (
              <li key={t.topicId} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{t.topicName}</p>
                    <p className="text-xs text-slate-500">
                      {t.subjectName} · {t.solved} soru
                      {t.accuracy !== null && ` · %${t.accuracy} doğru`}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => makeReview(t)} disabled={busy}>
                    Tekrar oluştur
                  </Button>
                </div>
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-rose-700">
                  {t.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
                {t.suggestedMinutes > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Önerilen çalışma: ~{t.suggestedMinutes} dk
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Tüm değerlendirilen konular</SectionTitle>
          {graded.length === 0 ? (
            <EmptyState
              title="Yeterli veri yok"
              description="Soru kaydı girerken konu seçersen bu analiz dolar."
            />
          ) : (
            <ul className="space-y-2 text-sm">
              {graded.map((t) => (
                <li key={t.topicId} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5">
                  <span className="text-slate-700">{t.topicName}</span>
                  <span className={`font-medium ${t.isWeak ? "text-rose-600" : "text-emerald-600"}`}>
                    {t.accuracy !== null ? `%${t.accuracy}` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>Veri yetersiz konular</SectionTitle>
          {data.insufficient.length === 0 ? (
            <EmptyState title="Tüm konularda yeterli veri var ya da kayıt yok" />
          ) : (
            <ul className="space-y-2 text-sm">
              {data.insufficient.map((t) => (
                <li key={t.topicId} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5">
                  <span className="text-slate-700">{t.topicName}</span>
                  <span className="text-xs text-slate-400">{t.solved} soru · belirsiz</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
