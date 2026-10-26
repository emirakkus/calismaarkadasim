"use client";

import { useState } from "react";
import { Card, Button, SectionTitle } from "@/components/ui";

type Validation = {
  valid: boolean;
  errors: string[];
  schemaVersion: number | null;
  counts: Record<string, number>;
};

export default function DataBackup({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<unknown | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [fileName, setFileName] = useState("");

  function downloadJSON() {
    window.location.href = "/api/backup";
    toast("JSON yedeği indiriliyor");
  }
  function downloadCSV() {
    window.location.href = "/api/backup/csv";
    toast("CSV indiriliyor");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (file.size > 10 * 1024 * 1024) {
      toast("Dosya çok büyük (en fazla 10 MB)", "error");
      return;
    }
    if (!file.name.endsWith(".json")) {
      toast("Lütfen bir .json yedek dosyası seçin", "error");
      return;
    }
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setParsed(json);
      setBusy(true);
      const r = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "validate", backup: json }),
      });
      const data = await r.json();
      setValidation(data.validation);
    } catch {
      toast("Dosya okunamadı veya geçerli JSON değil", "error");
      setParsed(null);
      setValidation(null);
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!parsed || !validation?.valid) return;
    if (
      !window.confirm(
        "DİKKAT: Bu işlem mevcut tüm verilerinin yerine yedekteki verileri yükler. Devam edilsin mi?",
      )
    )
      return;
    setBusy(true);
    try {
      const r = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "replace", backup: parsed }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Geri yükleme başarısız");
      toast("Geri yükleme tamamlandı. Sayfa yenileniyor...");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Hata", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Dışa aktarma</SectionTitle>
        <p className="mb-4 text-sm text-slate-500">
          Tüm çalışma verini JSON olarak yedekle veya soru/performans kayıtlarını CSV olarak indir.
          Yedeğe hiçbir API anahtarı veya gizli bilgi eklenmez.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadJSON}>Tam yedek (JSON) indir</Button>
          <Button variant="secondary" onClick={downloadCSV}>Soru kayıtları (CSV) indir</Button>
        </div>
      </Card>

      <Card>
        <SectionTitle>Geri yükleme</SectionTitle>
        <p className="mb-3 text-sm text-slate-500">
          Daha önce aldığın JSON yedeğini seç. Önce içeriği doğrulanır; onayladıktan sonra mevcut
          verilerin <strong>yerine</strong> yüklenir. Geçersiz dosya mevcut verini bozmaz.
        </p>
        <input
          type="file"
          accept="application/json,.json"
          onChange={onFile}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
        />

        {validation && (
          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-700">{fileName}</p>
            {validation.valid ? (
              <>
                <p className="mt-1 text-sm text-emerald-700">
                  ✓ Geçerli yedek (şema sürümü {validation.schemaVersion}).
                </p>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-500 sm:grid-cols-3">
                  {Object.entries(validation.counts).map(([k, v]) => (
                    <li key={k}>{k}: {v}</li>
                  ))}
                </ul>
                <div className="mt-3">
                  <Button variant="danger" onClick={restore} disabled={busy}>
                    Mevcut verinin üzerine geri yükle
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm text-rose-700">
                <p>✗ Geçersiz yedek:</p>
                <ul className="list-disc pl-5">
                  {validation.errors.map((er, i) => (
                    <li key={i}>{er}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
