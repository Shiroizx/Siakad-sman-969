import { SiteLogo } from "@/components/branding/SiteLogo";
import Link from "next/link";

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.18),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(129,140,248,0.12),transparent)]" />

      <header className="relative z-10 border-b border-slate-200/90 bg-white/90 backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-900/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition opacity-90 hover:opacity-100"
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 ring-2 ring-amber-500/35 shadow-sm sm:h-10 sm:w-10">
              <SiteLogo size={36} className="scale-110" priority />
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white sm:text-base">
              SIAKAD 969
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-indigo-200/90 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Staf
            </Link>
            <Link
              href="/siswa/login"
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-sm font-bold text-white shadow-md shadow-emerald-900/30 transition hover:from-emerald-400 hover:to-teal-500"
            >
              Siswa
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 md:pt-16">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-8 shadow-sm backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/60 sm:p-10">
            <div className="mb-6 flex justify-center sm:justify-start">
              <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-slate-950 ring-2 ring-amber-500/40 shadow-md sm:h-28 sm:w-28">
                <SiteLogo size={112} className="scale-105" priority />
              </span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              SMAN 969 Jakarta
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-[2.5rem]">
              Sistem informasi untuk mendukung keputusan akademik.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
              Satu pintu akses bagi wali kelas, BK, dan tim administrasi untuk
              memantau kesejahteraan belajar, mendistribusikan kelas, dan
              menyiapkan rekomendasi peminatan—tanpa menggantikan kebijakan
              sekolah.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 transition hover:from-indigo-400 hover:to-violet-500"
              >
                Masuk sebagai staf
              </Link>
              <Link
                href="/siswa/login"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-400 hover:to-teal-500"
              >
                Portal siswa
              </Link>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="fitur"
          className="border-t border-slate-200/90 bg-white/60 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
            <h2
              id="fitur"
              className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"
            >
              Yang tersedia di dalam
            </h2>
            <ul className="mt-8 grid gap-5 sm:grid-cols-3 sm:gap-6">
              <li className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-200/50 dark:border-slate-800 dark:bg-slate-900/70 dark:ring-slate-700/50">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  EWS &amp; kedisiplinan
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Ringkasan sinyal dini dari kehadiran, perilaku, dan capaian
                  agar intervensi bisa diarahkan lebih awal.
                </p>
              </li>
              <li className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-200/50 dark:border-slate-800 dark:bg-slate-900/70 dark:ring-slate-700/50">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Distribusi kelas
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Simulasi pemerataan berdasarkan profil nilai untuk tahun ajaran
                  baru—disimpan sebagai draf sebelum diputuskan bersama.
                </p>
              </li>
              <li className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-200/50 dark:border-slate-800 dark:bg-slate-900/70 dark:ring-slate-700/50">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Peminatan &amp; arsip
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Rekomendasi jalur MIPA atau IPS serta arsip perjalanan akademik
                  siswa untuk rujukan jangka panjang.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="border-t border-slate-200/90 bg-slate-100/50 dark:border-slate-800 dark:bg-slate-950/80">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Akses mengikuti peran masing-masing. Akun staf menggunakan email
              sekolah; siswa memverifikasi diri dengan NISN dan tanggal lahir
              sesuai data induk.
            </p>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} SMAN 969</p>
          <div className="flex gap-6">
            <Link
              href="/login"
              className="font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Login staf
            </Link>
            <Link
              href="/siswa/login"
              className="font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Login siswa
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
