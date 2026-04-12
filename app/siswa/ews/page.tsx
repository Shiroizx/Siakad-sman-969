"use client";

import { getMyEwsData, type EwsStudentRow } from "@/app/actions/ews";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const BATAS_ALPA = 5;
const BATAS_MAPel_MERAH = 2;
const BATAS_POIN = 50;

function isKritis(s: EwsStudentRow) {
  return (
    s.totalAlpa > BATAS_ALPA ||
    s.jumlahMapelDiBawahKkm > BATAS_MAPel_MERAH ||
    s.totalPoinPelanggaran > BATAS_POIN
  );
}

export default function SiswaEwsPage() {
  const [row, setRow] = useState<EwsStudentRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { row: r, error } = await getMyEwsData();
    if (error || !r) {
      setLoadError(error ?? "Tidak ada data.");
      setRow(null);
    } else {
      setRow(r);
      setLoadError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { row: r, error } = await getMyEwsData();
      if (cancelled) return;
      setLoading(false);
      if (error || !r) {
        setLoadError(error ?? "Tidak ada data.");
        setRow(null);
      } else {
        setLoadError(null);
        setRow(r);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const kritis = row ? isKritis(row) : false;

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-8 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Siswa · Monitoring diri
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Early Warning System
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Ringkasan alpa, jumlah mapel dengan nilai di bawah KKM masing-masing
              mapel, dan poin pelanggaran. Ambang peringatan: alpa &gt;{" "}
              {BATAS_ALPA}, mapel merah &gt; {BATAS_MAPel_MERAH}, atau poin &gt;{" "}
              {BATAS_POIN}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
            {loading ? "Memuat…" : "Muat ulang"}
          </button>
        </header>

        {loadError ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100"
          >
            {loadError}
          </div>
        ) : null}

        {loading && !row ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Memuat data…
          </p>
        ) : row ? (
          <div className="space-y-6">
            <div
              className={`rounded-2xl border p-6 shadow-sm ${
                kritis
                  ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40"
                  : "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    kritis
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  <AlertTriangle className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    {kritis
                      ? "Perlu perhatian — konsultasikan dengan BK / wali kelas"
                      : "Kondisi dalam batas aman"}
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {row.nama} · NISN {row.nisn}
                    {row.kelas ? ` · ${row.kelas}` : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Total alpa
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {row.totalAlpa}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Batas {BATAS_ALPA}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Mapel &lt; KKM
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {row.jumlahMapelDiBawahKkm}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Batas {BATAS_MAPel_MERAH} mapel
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:col-span-1">
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Poin pelanggaran
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {row.totalPoinPelanggaran}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Batas {BATAS_POIN} poin
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500 dark:text-slate-500">
              Data diambil dari sistem sekolah. Jika ada ketidaksesuaian, hubungi
              TU atau BK.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
