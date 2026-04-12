"use client";

import { loginSiswa, type LoginSiswaState } from "@/app/actions/auth-siswa";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

const initial: LoginSiswaState = { error: null };

export default function SiswaLoginPage() {
  const [state, formAction, pending] = useActionState(loginSiswa, initial);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/15 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg ring-1 ring-white/20 backdrop-blur">
            <GraduationCap className="h-8 w-8" aria-hidden />
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
