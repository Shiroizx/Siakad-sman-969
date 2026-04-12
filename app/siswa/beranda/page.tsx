import { AlertTriangle, Archive, GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";

export default function SiswaBerandaPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
      <header className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-teal-950/30">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
            <Sparkles className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Selamat datang
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Ini adalah area siswa. Silakan buka rekomendasi peminatan untuk
              melihat hasil analisis MIPA vs IPS berdasarkan nilai rapormu.
            </p>
          </div>
        </div>
      </header>

      <Link
        href="/siswa/arsip"
        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-800"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
            <Archive className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              Arsip saya
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Semua tahun ajaran: nilai, absensi, pelanggaran, riwayat kelas
            </p>
          </div>
        </div>
        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
          Buka →
        </span>
      </Link>

      <Link
        href="/siswa/ews"
        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-amber-800"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              EWS Saya
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Alpa, nilai di bawah KKM, dan poin pelanggaran
            </p>
          </div>
        </div>
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          Buka →
        </span>
      </Link>

      <Link
        href="/siswa/peminatan"
        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200">
            <GraduationCap className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              Cek Peminatan
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Rekomendasi jurusan dari sistem SPK
            </p>
          </div>
        </div>
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Buka →
        </span>
      </Link>
    </div>
  );
}
