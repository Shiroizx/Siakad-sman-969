"use client";

import {
  getMyDisciplineRecord,
  type DisciplineSemester,
} from "@/app/actions/kedisiplinan";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

export default function SiswaKedisiplinanPage() {
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getMyDisciplineRecord>
  >["data"]>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState<DisciplineSemester>(1);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      const res = await getMyDisciplineRecord(semester);
      if (c) return;
      setLoading(false);
      if (res.error) {
        setErr(res.error);
        setData(null);
      } else {
        setErr(null);
        setData(res.data);
      }
    })();
    return () => {
      c = true;
    };
  }, [semester]);

  const att = data?.attendance;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
          <ShieldAlert className="h-4 w-4" aria-hidden />
          Siswa · Kedisiplinan
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          Catatan diri
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Ringkasan kehadiran, absensi (alpa/izin/sakit), dan riwayat pelanggaran
          per semester.
        </p>
        <div className="mt-4 max-w-xs">
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            Semester
          </label>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            value={semester}
            onChange={(e) =>
              setSemester(Number(e.target.value) as DisciplineSemester)
            }
          >
            <option value={1}>Semester 1</option>
            <option value={2}>Semester 2</option>
          </select>
        </div>
      </header>

      {err ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
        >
          {err}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Memuat…</p>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40">
              <p className="text-xs font-semibold uppercase text-emerald-800 dark:text-emerald-300">
                Hadir
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-900 dark:text-emerald-50">
                {att?.hadir ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-emerald-800/90 dark:text-emerald-400/90">
                Jumlah pertemuan hadir
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Alpa
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                {att?.alpa ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Izin
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-amber-800 dark:text-amber-200">
                {att?.izin ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Sakit
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-sky-800 dark:text-sky-200">
                {att?.sakit ?? 0}
              </p>
            </div>
          </div>

          {!att ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Belum ada data absensi yang tercatat.
            </p>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Riwayat pelanggaran
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3 text-right">Poin</th>
                    <th className="px-4 py-3">Deskripsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data?.violations ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                      >
                        Tidak ada catatan pelanggaran.
                      </td>
                    </tr>
                  ) : (
                    (data?.violations ?? []).map((v, idx) => (
                      <tr key={v.id || `v-${idx}`} className="dark:hover:bg-slate-800/30">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {v.created_at
                            ? new Date(v.created_at).toLocaleString("id-ID")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                          {v.poin}
                        </td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                          {v.deskripsi}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
