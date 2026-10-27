"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "@/lib/client";
import {
  BookIcon,
  TimerIcon,
  BrainIcon,
  TargetIcon,
  ChartIcon,
  CalendarIcon,
  TrophyIcon,
  ArrowRightIcon,
} from "@/components/icons";

type User = { id: number; email: string; name: string };

const FEATURES = [
  {
    icon: <TimerIcon className="h-5 w-5" />,
    color: "text-blue-600",
    bg: "bg-blue-100",
    title: "Pomodoro",
    desc: "Odaklan, verimli çalış.",
  },
  {
    icon: <BrainIcon className="h-5 w-5" />,
    color: "text-violet-600",
    bg: "bg-violet-100",
    title: "Yapay Zekâ Koçu",
    desc: "Kişisel rehberin her zaman yanında.",
  },
  {
    icon: <TargetIcon className="h-5 w-5" />,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    title: "Zayıf Konu Analizi",
    desc: "Eksiklerini keşfet.",
  },
  {
    icon: <ChartIcon className="h-5 w-5" />,
    color: "text-amber-600",
    bg: "bg-amber-100",
    title: "Detaylı Analiz",
    desc: "İlerlemeni gör, motive ol.",
  },
  {
    icon: <CalendarIcon className="h-5 w-5" />,
    color: "text-blue-600",
    bg: "bg-blue-100",
    title: "Akıllı Planlama",
    desc: "Zamanını en iyi şekilde kullan.",
  },
  {
    icon: <TrophyIcon className="h-5 w-5" />,
    color: "text-rose-600",
    bg: "bg-rose-100",
    title: "Sınav Başarısı",
    desc: "Hayallerine bir adım daha yaklaş.",
  },
];

export default function AuthScreen({
  onAuthed,
}: {
  onAuthed: (user: User) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password };
      const r = await api<{ user: User }>(url, {
        method: "POST",
        body: JSON.stringify(body),
      });
      onAuthed(r.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(m: "login" | "signup") {
    setMode(m);
    setError("");
    setInfo("");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4 sm:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_rgba(30,58,138,0.12)] lg:grid-cols-2">
        {/* SOL PANEL — tanıtım */}
        <div className="relative hidden flex-col bg-gradient-to-b from-blue-50 to-indigo-50/60 p-8 lg:flex">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-blue-600">
              <BookIcon className="h-9 w-9" />
            </span>
            <div>
              <h1 className="text-2xl font-bold leading-tight text-slate-800">
                Çalışma Yol Arkadaşım
              </h1>
              <p className="text-sm text-slate-500">
                Daha planlı çalış, daha güçlü ilerle.
              </p>
            </div>
          </div>

          <div className="relative mb-6 overflow-hidden rounded-2xl">
            <Image
              src="/images/study-illustration.png"
              alt="Çalışan öğrenci illüstrasyonu"
              width={760}
              height={520}
              priority
              className="h-auto w-full object-cover"
            />
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${f.bg} ${f.color}`}
                >
                  {f.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center font-medium italic text-blue-500">
            Sen yeter ki başla… :)
          </p>
        </div>

        {/* SAĞ PANEL — form */}
        <div className="flex flex-col justify-center p-8 sm:p-10">
          {/* Mobil başlık */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="text-blue-600">
              <BookIcon className="h-7 w-7" />
            </span>
            <h1 className="text-lg font-bold text-slate-800">Çalışma Yol Arkadaşım</h1>
          </div>

          {/* Sekmeler */}
          <div className="mb-8 flex gap-8 border-b border-slate-200">
            <button
              onClick={() => switchMode("login")}
              className={`-mb-px border-b-2 pb-3 text-[15px] font-semibold transition ${
                mode === "login"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => switchMode("signup")}
              className={`-mb-px border-b-2 pb-3 text-[15px] font-semibold transition ${
                mode === "signup"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          <h2 className="text-2xl font-bold text-slate-800">
            {mode === "login" ? "Tekrar hoş geldin!" : "Hadi başlayalım!"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "login"
              ? "Hesabına giriş yaparak çalışmalarına kaldığın yerden devam et."
              : "Birkaç saniyede hesabını oluştur ve çalışmaya başla."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Adın
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <span className="text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="örn. Emir"
                    className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                E-posta adresi
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <span className="text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <rect x="3" y="5" width="18" height="14" rx="2.5" />
                    <path d="M4 7l8 6 8-6" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ornek@e-posta.com"
                  autoComplete="email"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Şifre
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <span className="text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={mode === "signup" ? "En az 6 karakter" : "Şifrenizi girin"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M3 3l18 18" strokeLinecap="round" />
                      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.2A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.2 6.2A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 3-.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {mode === "login" && (
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  Beni hatırla
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setInfo(
                      "Şifre sıfırlama henüz etkin değil. Şimdilik parolanı hatırlayarak giriş yapmalısın.",
                    )
                  }
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Şifremi unuttum?
                </button>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-60"
            >
              {busy
                ? "Lütfen bekle..."
                : mode === "login"
                  ? "Giriş Yap"
                  : "Hesap Oluştur"}
              {!busy && <ArrowRightIcon className="h-4 w-4" />}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">veya</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={() =>
              setInfo(
                "Google ile giriş henüz yapılandırılmadı. Lütfen e-posta ve parola ile devam et.",
              )
            }
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z" />
            </svg>
            Google ile devam et
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === "login" ? "Hesabın yok mu? " : "Zaten hesabın var mı? "}
            <button
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="font-semibold text-blue-600 hover:underline"
            >
              {mode === "login" ? "Kayıt ol" : "Giriş yap"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
