"use client";

import type { ReactNode } from "react";
import type { TaskStatus } from "@/lib/types";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  icon,
}: {
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg">
        {icon && <span className="text-emerald-600">{icon}</span>}
        {children}
      </h2>
      {action}
    </div>
  );
}

export function ProgressBar({
  value,
  goal,
  color = "#059669",
  label,
}: {
  value: number;
  goal: number;
  color?: string;
  label?: string;
}) {
  const percent = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
          <span>{label}</span>
          <span className="font-medium text-slate-800">
            {value} / {goal} {goal > 0 ? `(%${percent})` : ""}
          </span>
        </div>
      )}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "ilerleme"}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function CircularProgress({
  percent,
  size = 84,
  stroke = 9,
  color = "#059669",
  track = "#e2e8f0",
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-sm font-bold text-slate-800">
        {children ?? `%${clamped}`}
      </span>
    </div>
  );
}

export function StatCard({
  icon,
  iconBg = "bg-emerald-50",
  iconColor = "text-emerald-600",
  title,
  value,
  barValue,
  barGoal,
  barColor = "#059669",
  corner,
}: {
  icon: ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: string;
  value: ReactNode;
  barValue?: number;
  barGoal?: number;
  barColor?: string;
  corner?: ReactNode;
}) {
  return (
    <Card className="!p-4">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
          <span className="h-5 w-5">{icon}</span>
        </div>
        {corner}
      </div>
      <p className="mt-3 text-sm text-slate-500">{title}</p>
      <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
      {barGoal !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${barGoal > 0 ? Math.min(100, Math.round(((barValue ?? 0) / barGoal) * 100)) : 0}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
      )}
    </Card>
  );
}

const STATUS_MAP: Record<TaskStatus, { label: string; cls: string }> = {
  pending: { label: "Bekliyor", cls: "bg-slate-100 text-slate-600" },
  in_progress: { label: "Devam ediyor", cls: "bg-blue-50 text-blue-700" },
  completed: { label: "Tamamlandı", cls: "bg-emerald-50 text-emerald-700" },
  postponed: { label: "Ertelendi", cls: "bg-rose-50 text-rose-700" },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const variants = {
    primary:
      "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-sm",
    secondary:
      "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400",
    ghost: "bg-transparent text-emerald-700 hover:bg-emerald-50",
    danger: "bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-400",
  };
  const sizes = { sm: "px-2.5 py-1 text-xs", md: "px-4 py-2 text-sm" };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className="mt-1 text-xl font-semibold text-slate-900"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
      {label ?? "Yükleniyor..."}
    </div>
  );
}
