"use client";

import {
  getMyAcademicYearArchiveOptions,
  getMyGradesForYear,
  type AcademicYearOption,
  type GradeRow,
} from "@/app/actions/akademik";
import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

function lulus(n: number | null, kkm: number) {
  if (n === null || !Number.isFinite(n)) return null;
  return n >= kkm;
}

export default function SiswaAkademikPage() {
  const [semester, setSemester] = useState<1 | 2>(1);
  const [yearOptions, setYearOptions] = useState<AcademicYearOption[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      const { options, error } = await getMyAcademicYearArchiveOptions();
      if (c) return;
      setLoading(false);
      if (error) {
        setErr(error);
        setYearOptions([]);
        return;
      }
      setErr(null);
      setYearOptions(options);
      if (options.length > 0) {
        setAcademicYearId((prev) =>
          prev && options.some((o) => o.id === prev) ? prev : options[0].id
        );
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    if (!academicYearId) {
      setRows([]);
      return;
    }
    let c = false;
    (async () => {
      setLoadingGrades(true);
      const { rows: r, error } = await getMyGradesForYear(
        academicYearId,
        semester
      );
      if (c) return;
      setLoadingGrades(false);
      if (error) {
        setErr(error);
        setRows([]);
      } else {
        setErr(null);
        setRows(r);
      }
    })();
    return () => {
      c = true;
    };
  }, [academicYearId, semester]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <BookOpen className="h-4 w-4" aria-hidden />
          Siswa · Akademik
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          Rapor digital
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Nilai per mapel dengan KKM dari sekolah. Pilih tahun ajaran untuk melihat
          arsip rapor (misalnya nilai saat kelas 10 atau 11) tanpa tercampur dengan
          tahun lain.
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Pilih tahun ajaran / kelas
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              disabled={loading || yearOptions.length === 0}
            >
              {yearOptions.length === 0 ? (
                <option value="">— Belum ada data —</option>
              ) : (
                yearOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex gap-2">
            {([1, 2] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSemester(s)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  semester === s
                    ? "bg-indigo-600 text-white shadow-md"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                Semester {s}
              </button>
            ))}
          </div>
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
      ) : loadingGrades ? (
        <p className="text-sm text-slate-500">Memuat nilai…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                  <th className="px-4 py-3">Mapel</th>
                  <th className="px-4 py-3 text-right">KKM</th>
                  <th className="px-4 py-3 text-right">Nilai</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      Tidak ada nilai untuk tahun ajaran dan semester ini.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const ok = lulus(r.nilai, r.kkm);
                    return (
                      <tr
                        key={r.subject_id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {r.nama_mapel}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {r.kkm}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {r.nilai !== null && Number.isFinite(r.nilai)
                            ? r.nilai.toFixed(1)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {ok === null ? (
                            <span className="text-xs text-slate-400">Belum ada</span>
                          ) : ok ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                              Lulus
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                              Tidak lulus
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
