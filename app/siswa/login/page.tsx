"use client";

import {
  getSiswaMathChallenge,
  loginSiswa,
  type LoginSiswaState,
} from "@/app/actions/auth-siswa";
import { SiteLogo } from "@/components/branding/SiteLogo";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useActionState,
  useCallback,
  useEffect,
  useState,
} from "react";

const initial: LoginSiswaState = { error: null };

const TIMEOUT_ALERT =
  "Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan masuk kembali.";

function SiswaLoginForm() {
  const [state, formAction, pending] = useActionState(loginSiswa, initial);
  const searchParams = useSearchParams();
  const showTimeoutNotice = searchParams.get("reason") === "timeout";

  const [mathLoad, setMathLoad] = useState<
    | { status: "loading" }
    | { status: "ok"; n1: number; n2: number; token: string }
    | { status: "err"; message: string }
  >({ status: "loading" });

  const refreshMath = useCallback(async () => {
    setMathLoad({ status: "loading" });
    const r = await getSiswaMathChallenge();
    if ("error" in r) {
      setMathLoad({ status: "err", message: r.error });
      return;
    }
    setMathLoad({
      status: "ok",
      n1: r.n1,
      n2: r.n2,
      token: r.token,
    });
  }, []);

  useEffect(() => {
    void refreshMath();
  }, [refreshMath]);

  useEffect(() => {
    if (state.error) {
      void refreshMath();
    }
  }, [state.error, refreshMath]);

  const mathReady = mathLoad.status === "ok";
  const canSubmit = mathReady && !pending;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/15 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-950 ring-2 ring-amber-500/40 shadow-lg">
            <SiteLogo size={72} className="scale-105" priority />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Masuk Siswa
          </h1>
          <p className="mt-1 text-sm font-medium text-emerald-200/90">
            SIAKAD 969
          </p>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-emerald-100/80">
            Gunakan <strong className="text-white">NISN</strong> (10 digit) dan{" "}
            <strong className="text-white">password</strong> berupa tanggal lahir
            format <span className="font-mono text-emerald-200">tahun-bulan-tanggal</span>{" "}
            (contoh: 2007-06-12).
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
          <form action={formAction} className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="nisn"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-200/80"
              >
                NISN
              </label>
              <input
                id="nisn"
                name="nisn"
                inputMode="numeric"
                autoComplete="username"
                maxLength={10}
                required
                placeholder="0012345678"
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label
                htmlFor="tanggal_lahir"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-200/80"
              >
                Password
              </label>
              <input
                id="tanggal_lahir"
                name="tanggal_lahir"
                type="password"
                autoComplete="current-password"
                required
                placeholder="2007-06-12"
                inputMode="text"
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div>
              <label
                htmlFor="math_answer"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-200/80"
              >
                Verifikasi keamanan
              </label>
              {mathLoad.status === "loading" ? (
                <p className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-emerald-200/70">
                  Memuat pertanyaan…
                </p>
              ) : mathLoad.status === "err" ? (
                <div className="space-y-2">
                  <p
                    role="alert"
                    className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                  >
                    {mathLoad.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => void refreshMath()}
                    className="text-sm font-medium text-emerald-300 underline-offset-2 hover:text-white hover:underline"
                  >
                    Muat ulang verifikasi
                  </button>
                </div>
              ) : (
                <>
                  <input type="hidden" name="math_token" value={mathLoad.token} />
                  <p className="mb-2 text-sm text-emerald-100/90">
                    Berapa hasil{" "}
                    <span className="font-mono font-semibold text-white">
                      {mathLoad.n1} + {mathLoad.n2}
                    </span>
                    ?
                  </p>
                  <input
                    id="math_answer"
                    name="math_answer"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    placeholder="Jawaban"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </>
              )}
            </div>

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
              className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-400 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Memverifikasi…" : "Masuk"}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          Staf / admin?{" "}
          <Link
            href="/login"
            className="font-semibold text-emerald-300 underline-offset-2 hover:text-white hover:underline"
          >
            Masuk lewat halaman admin
          </Link>
        </p>
      </div>
    </div>
  );
}

function SiswaLoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 px-4">
      <p className="text-sm text-emerald-200/80">Memuat halaman masuk…</p>
    </div>
  );
}

export default function SiswaLoginPage() {
  return (
    <Suspense fallback={<SiswaLoginFallback />}>
      <SiswaLoginForm />
    </Suspense>
  );
}
