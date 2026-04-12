"use client";

import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  BarChart3,
  GraduationCap,
  LayoutDashboard,
  Users,
} from "lucide-react";
import Link from "next/link";

const STATS = [
  {
    label: "Total Siswa Aktif",
    value: "450",
    hint: "Tahun ajaran berjalan",
    icon: Users,
    accent: "from-sky-500/15 to-blue-600/10 ring-sky-500/20",
  },
  {
    label: "Siswa Pantauan EWS",
    value: "3",
    hint: "Butuh follow-up BK",
    icon: AlertTriangle,
    accent: "from-rose-500/15 to-orange-500/10 ring-rose-500/20",
  },
  {
    label: "Rata-rata Nilai Sekolah",
    value: "82.5",
    hint: "Semua mapel gabungan",
    icon: BarChart3,
    accent: "from-emerald-500/15 to-teal-600/10 ring-emerald-500/20",
  },
  {
    label: "Simulasi Kelas Terakhir",
    value: "5",
    hint: "Draft kelas tersimpan",
    icon: LayoutDashboard,
    accent: "from-violet-500/15 to-indigo-600/10 ring-violet-500/20",
  },
] as const;

const QUICK_LINKS = [
  {
    href: "/admin/arsip",
    title: "Arsip siswa",
    description:
      "Lihat gabungan nilai, absensi, pelanggaran, dan riwayat kelas per siswa dan tahun ajaran.",
    icon: Archive,
    gradient: "from-slate-600 to-slate-800",
    ring: "ring-slate-500/20",
  },
  {
    href: "/admin/ews",
    title: "Modul EWS",
    description:
      "Early Warning System — pantau alpa, nilai merah, dan pelanggaran.",
    icon: AlertTriangle,
    gradient: "from-rose-600 to-orange-500",
    ring: "ring-rose-500/20",
  },
  {
    href: "/admin/clustering",
    title: "Distribusi Kelas",
    description:
      "Simulasi pemerataan siswa dengan pola S-curve untuk kelas baru.",
    icon: Users,
    gradient: "from-indigo-600 to-violet-600",
    ring: "ring-indigo-500/20",
  },
  {
    href: "/siswa/peminatan",
    title: "Cek Peminatan",
    description:
      "Rekomendasi MIPA / IPS berdasarkan profil nilai dan faktor sekunder.",
    icon: GraduationCap,
    gradient: "from-emerald-600 to-teal-500",
    ring: "ring-emerald-500/20",
  },
] as const;

export default function Home() {
  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.18),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(129,140,248,0.12),transparent)]" />

      <div className="relative mx-auto max-w-6xl space-y-10 pb-4 pt-2 sm:space-y-12 sm:pt-4">
        <header className="rounded-2xl border border-slate-200/80 bg-white/80 p-8 shadow-sm backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/60 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                Dashboard
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
                Selamat Datang di SIAKAD SMAN 969
              </h1>
              <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
                Pusat Kendali Sistem Penunjang Keputusan Akademik — akses cepat
                ke modul EWS, distribusi kelas, dan rekomendasi peminatan dalam
                satu tampilan yang ringkas.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
              <LayoutDashboard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-medium">Ringkasan hari ini</span>
            </div>
          </div>
        </header>

        <section aria-labelledby="stats-heading">
          <h2
            id="stats-heading"
            className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"
          >
            Statistik cepat
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 ${s.accent}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {s.label}
                      </p>
                      <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white">
                        {s.value}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {s.hint}
                      </p>
                    </div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition group-hover:scale-105 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="quick-heading">
          <h2
            id="quick-heading"
            className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"
          >
            Akses cepat
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/70 ${item.ring}`}
                >
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${item.gradient}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                  </div>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    Buka modul
                    <span
                      aria-hidden
                      className="transition group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
