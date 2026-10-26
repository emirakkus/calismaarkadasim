"use client";

import { useEffect, useState } from "react";
import type { Settings as SettingsType } from "@/lib/types";
import { Card, Button, SectionTitle } from "@/components/ui";
import { api } from "@/lib/client";
import { BellIcon } from "@/components/icons";

type PermState = "default" | "granted" | "denied" | "unsupported";

export default function Reminders({
  settings,
  onUpdated,
  toast,
}: {
  settings: SettingsType;
  onUpdated: (s: SettingsType) => void;
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [form, setForm] = useState({
    reminderEnabled: settings.reminderEnabled,
    reminderTime: settings.reminderTime,
  });
  const [perm, setPerm] = useState<PermState>("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("unsupported");
    } else {
      setPerm(Notification.permission as PermState);
    }
  }, []);

  async function requestPermission() {
    if (!("Notification" in window)) {
      setPerm("unsupported");
      return;
    }
    const result = await Notification.requestPermission();
    setPerm(result as PermState);
    if (result === "granted") {
      toast("Bildirim izni verildi");
      new Notification("Çalışma Yol Arkadaşım", {
        body: "Bildirimler etkinleştirildi. Hatırlatma saatinde seni uyaracağım.",
      });
    } else if (result === "denied") {
      toast("Bildirim izni reddedildi", "error");
    }
  }

  async function save() {
    setBusy(true);
    try {
      const r = await api<{ settings: SettingsType }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          reminderEnabled: form.reminderEnabled,
          reminderTime: form.reminderTime,
        }),
      });
      onUpdated(r.settings);
      toast("Hatırlatma ayarları kaydedildi");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Hata", "error");
    } finally {
      setBusy(false);
    }
  }

  const permMessage: Record<PermState, string> = {
    default: "Bildirimler için henüz izin verilmedi.",
    granted: "Tarayıcı bildirimleri etkin.",
    denied: "Bildirim izni reddedilmiş. Tarayıcı ayarlarından açabilirsin.",
    unsupported: "Bu tarayıcı masaüstü bildirimlerini desteklemiyor.",
  };

  const remindersActive = form.reminderEnabled && perm === "granted";

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={<BellIcon className="h-5 w-5" />}>
          Hatırlatmalar ve bildirimler
        </SectionTitle>

        <div
          className={`mb-3 rounded-lg border p-3 text-sm ${
            perm === "granted"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : perm === "denied" || perm === "unsupported"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {permMessage[perm]}
        </div>

        {perm !== "granted" && perm !== "unsupported" && (
          <Button variant="secondary" onClick={requestPermission} className="mb-3">
            Bildirim izni iste
          </Button>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.reminderEnabled}
            onChange={(e) => setForm({ ...form, reminderEnabled: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
          />
          Günlük çalışma hatırlatmasını aç
        </label>

        <div className="mt-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Hatırlatma saati</span>
            <input
              type="time"
              value={form.reminderTime}
              onChange={(e) => setForm({ ...form, reminderTime: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {remindersActive
            ? `Hatırlatma etkin: her gün ${form.reminderTime} civarında (uygulama açıkken) bildirim alırsın.`
            : form.reminderEnabled && perm !== "granted"
              ? "Hatırlatma açık ancak bildirim izni verilmediği için bildirim gönderilemez."
              : "Hatırlatma kapalı."}
        </p>

        <div className="mt-4">
          <Button onClick={save} disabled={busy}>
            Kaydet
          </Button>
        </div>
      </Card>
    </div>
  );
}
