import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function HomeIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

export function CalendarIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 3v3M16 3v3" />
    </svg>
  );
}

export function BookIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M4 5.5A2 2 0 0 1 6 4h5v15H6a2 2 0 0 0-2 2z" />
      <path d="M20 5.5A2 2 0 0 0 18 4h-5v15h5a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function ChartIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M5 3v18h16" />
      <rect x="8" y="11" width="3" height="6" rx="1" />
      <rect x="13.5" y="7" width="3" height="10" rx="1" />
    </svg>
  );
}

export function BrainIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M12 5a3 3 0 0 0-5.5 1.6A3 3 0 0 0 5 12a3 3 0 0 0 1.5 5A3 3 0 0 0 12 18z" />
      <path d="M12 5a3 3 0 0 1 5.5 1.6A3 3 0 0 1 19 12a3 3 0 0 1-1.5 5A3 3 0 0 1 12 18z" />
      <path d="M12 5v13" />
    </svg>
  );
}

export function BellIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function SettingsIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />
    </svg>
  );
}

export function ClockIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function QuestionIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-5 4z" />
      <path d="M9.5 8.5a2.5 2.5 0 0 1 3.8 2c0 1.5-2.3 1.8-2.3 3M12 14.5v.01" />
    </svg>
  );
}

export function TrendIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M21 7v4h-4" />
    </svg>
  );
}

export function TrophyIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
      <path d="M12 13v3M9 20h6M10 20l.5-4h3l.5 4" />
    </svg>
  );
}

export function PlayIcon(p: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function CheckCircleIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5 11 15l4.5-5" />
    </svg>
  );
}

export function SparkleIcon(p: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-5L6 9.4l4.4-1.6z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
    </svg>
  );
}

export function ArrowRightIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronRightIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function TimerIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9 2h6" />
    </svg>
  );
}

export function FlameIcon(p: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2c1 3-1.5 4.5-2.5 6C8 10 8 12 8 12a4 4 0 0 0 8 0c0-2-1-3.5-1.5-4.5C15 9 14 9 14 9s1-4-2-7z" />
    </svg>
  );
}

export function PencilIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17v3z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

export function RepeatIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

export function TargetIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function PlusIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SearchIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function PinIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M9 3h6l-1 6 3 3H7l3-3-1-6zM12 15v6" />
    </svg>
  );
}
