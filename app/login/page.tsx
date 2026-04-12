"use client";

import { login, type LoginState } from "@/app/actions/auth";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

const initial: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg ring-1 ring-white/20 backdrop-blur">
            <LayoutDashboard className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            SIAKAD 969
          </h1>
          <p className="mt-2 text-sm text-indigo-200/90">
            Masuk untuk mengakses dashboard SPK
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
          <form action={formAction} className="flex flex-col gap-5">
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
              disabled={pending}
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
