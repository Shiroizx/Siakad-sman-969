"use client";

import { login, type LoginState } from "@/app/actions/auth";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { LoginTurnstile } from "@/components/security/LoginTurnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const initial: LoginState = { error: null };

const TIMEOUT_ALERT =
  "Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan masuk kembali.";

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);
  const searchParams = useSearchParams();
  const showTimeoutNotice = searchParams.get("reason") === "timeout";

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [captchaErrCode, setCaptchaErrCode] = useState<string | null>(null);
  const [pageHost, setPageHost] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  useEffect(() => {
    setPageHost(window.location.hostname);
  }, []);

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    setCaptchaErrCode(null);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleTurnstileError = useCallback((code?: string) => {
    setTurnstileToken(null);
    setCaptchaErrCode(code ?? "unknown");
  }, []);

  useEffect(() => {
    if (state.error) {
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    }
  }, [state.error]);

  const captchaReady = Boolean(siteKey && turnstileToken);
  const canSubmit = Boolean(siteKey) && captchaReady && !pending;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-950 ring-2 ring-amber-500/40 shadow-lg">
            <SiteLogo size={72} className="scale-105" priority />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            SIAKAD 969
          </h1>
          <p className="mt-2 text-sm text-indigo-200/90">
            Masuk untuk mengakses dashboard SPK
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
          {showTimeoutNotice ? (
            <p
              role="status"
              className="mb-5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-2.5 text-center text-sm font-medium text-amber-100"
            >
              {TIMEOUT_ALERT}
            </p>
          ) : null}

          {pageHost === "127.0.0.1" ? (
            <p
              role="note"
              className="mb-5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-center text-xs leading-relaxed text-amber-100"
            >
              Anda membuka lewat <span className="font-mono">127.0.0.1</span>.
              Turnstile membedakan hostname: di Cloudflare → widget → Hostname
              Management, tambahkan <span className="font-mono">127.0.0.1</span>{" "}
              atau gunakan{" "}
              <span className="font-mono">http://localhost:3000</span> untuk
              pengembangan lokal.
            </p>
          ) : null}

          <form
            action={formAction}
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              if (!siteKey || !turnstileToken) {
                e.preventDefault();
              }
            }}
          >
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-indigo-200/80"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="nama@sekolah.sch.id"
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-indigo-200/80"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            {siteKey ? (
              <div className="flex flex-col items-center gap-2">
                <LoginTurnstile
                  ref={turnstileRef}
                  siteKey={siteKey}
                  onSuccess={handleTurnstileSuccess}
                  onExpire={handleTurnstileExpire}
                  onError={handleTurnstileError}
                />
                {captchaErrCode ? (
                  <p
                    role="alert"
                    className="max-w-sm text-center text-xs leading-relaxed text-amber-200/90"
                  >
                    Verifikasi CAPTCHA gagal (kode: {captchaErrCode}). Pastikan
                    Site key di <span className="font-mono">.env.local</span>{" "}
                    sama persis dengan di Cloudflare (tombol salin), hostname
                    halaman ini sudah terdaftar di widget Turnstile, lalu restart{" "}
                    <span className="font-mono">npm run dev</span>.
                  </p>
                ) : null}
                {!turnstileToken && !pending ? (
                  <p className="text-center text-xs text-indigo-200/70">
                    Selesaikan verifikasi keamanan di atas untuk melanjutkan.
                  </p>
                ) : null}
              </div>
            ) : (
              <p
                role="alert"
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-100"
              >
                CAPTCHA belum dikonfigurasi. Setel NEXT_PUBLIC_TURNSTILE_SITE_KEY
                dan TURNSTILE_SECRET_KEY di environment.
              </p>
            )}

            {state.error ? (
              <p
                role="alert"
                className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-center text-sm font-medium text-rose-200"
              >
                {state.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 transition hover:from-indigo-400 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Memproses…" : "Masuk"}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          Siswa?{" "}
          <Link
            href="/siswa/login"
            className="font-semibold text-indigo-300 underline-offset-2 hover:text-white hover:underline"
          >
            Masuk dengan NISN & tanggal lahir
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-slate-500">
          Staf: akses EWS, distribusi kelas, dan peminatan setelah login di atas.
        </p>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4">
      <p className="text-sm text-indigo-200/80">Memuat halaman masuk…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
