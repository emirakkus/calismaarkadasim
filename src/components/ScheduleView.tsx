"use client";

import { useEffect, useState } from "react";
import type { ScheduleSlot } from "@/lib/types";
import { Card, SectionTitle, Spinner, EmptyState } from "@/components/ui";
import { api } from "@/lib/client";

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const SLOTS = [
  "10.00-10.40",
  "10.50-11.30",
  "11.40-12.20",
  "12.30-13.10",
  "13.50-14.30",
  "14.40-15.20",
];

export default function ScheduleView() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ slots: ScheduleSlot[] }>("/api/schedule")
      .then((r) => setSlots(r.slots))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  function cell(day: number, order: number) {
    return slots.find((s) => s.dayOfWeek === day && s.slotOrder === order) ?? null;
  }

  return (
    <Card>
      <SectionTitle>Haftalık ders programı</SectionTitle>
      <p className="mb-3 text-xs text-slate-500">
        Program görselinden birebir alınmıştır. Konu başlıkları ve soru hedefleri
        programda yer almadığından, bunları Günlük Plan ve Soru Hedefleri
        bölümlerinden kendin ekleyebilirsin.
      </p>
      {slots.length === 0 ? (
        <EmptyState title="Program bulunamadı" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-slate-200 bg-slate-50 p-2 text-left text-xs font-semibold text-slate-600">
                  Saat
                </th>
                {DAYS.map((d) => (
                  <th
                    key={d}
                    className="border border-slate-200 bg-slate-50 p-2 text-center text-xs font-semibold text-slate-600"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((label, i) => (
                <tr key={label}>
                  <td className="border border-slate-200 p-2 text-xs font-medium text-slate-500">
                    {label}
                  </td>
                  {DAYS.map((_, di) => {
                    const c = cell(di + 1, i + 1);
                    return (
                      <td
                        key={di}
                        className="border border-slate-200 p-2 text-center align-top"
                      >
                        {c ? (
                          <>
                            <div className="text-xs font-medium text-slate-800">
                              {c.subjectName}
                            </div>
                            {c.teacher && (
                              <div className="text-[10px] text-slate-400">
                                {c.teacher}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
