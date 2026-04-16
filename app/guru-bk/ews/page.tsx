"use client";

import { getEwsData, getEwsSettings, type EwsStudentRow } from "@/app/actions/ews";
import { getKelasWithTingkat, type KelasWithTingkat } from "@/app/actions/akademik";
import { ADMIN_SEMUA_KELAS } from "@/lib/admin-kelas-filter";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import {
  type EwsSortPreset,
  filterEwsRows,
  sortEwsRows,
} from "@/lib/admin-list-utils";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

function isKritis(
  s: EwsStudentRow,
  batasAlpa: number,
  batasNilaiMerah: number,
  batasPelanggaran: number
) {
  return (
    s.totalAlpa > batasAlpa ||
    s.jumlahMapelDiBawahKkm > batasNilaiMerah ||
    s.totalPoinPelanggaran > batasPelanggaran
  );
}

export default function GuruBkEwsPage() {
  const [kelasList, setKelasList] = useState<KelasWithTingkat[]>([]);
  const [kelasFilter, setKelasFilter] = useState(ADMIN_SEMUA_KELAS);

  const [students, setStudents] = useState<EwsStudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [batasAlpa, setBatasAlpa] = useState(5);
  const [batasNilaiMerah, setBatasNilaiMerah] = useState(2);
  const [batasPelanggaran, setBatasPelanggaran] = useState(50);

  const [listQuery, setListQuery] = useState("");
  const [listSort, setListSort] = useState<EwsSortPreset>("prioritas");

  useEffect(() => {
    async function load() {
      const [{ rows }, { settings }] = await Promise.all([
        getKelasWithTingkat(),
        getEwsSettings(),
      ]);
      setKelasList(rows);
      if (settings) {
        setBatasAlpa(settings.batas_alpa);
        setBatasNilaiMerah(settings.batas_nilai_merah);
        setBatasPelanggaran(settings.batas_pelanggaran);
      }
    }
    void load();
  }, []);

  const fetchEws = useCallback(async (filter: string) => {
    if (!filter) { setStudents([]); return; }
    setLoading(true);
    const { students: rows, error } = await getEwsData(filter);
    if (error) { setLoadError(error); setStudents([]); }
    else { setLoadError(null); setStudents(rows); }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchEws(kelasFilter); }, [kelasFilter, fetchEws]);

  const rows = useMemo(
    () => students.map((s) => ({ ...s, kritis: isKritis(s, batasAlpa, batasNilaiMerah, batasPelanggaran) })),
    [students, batasAlpa, batasNilaiMerah, batasPelanggaran]
  );

  const stats = useMemo(() => {
    const kritis = rows.filter((r) => r.kritis).length;
    return { total: rows.length, kritis, aman: rows.length - kritis };
  }, [rows]);

  const tableRows = useMemo(() => {
    const tagged = filterEwsRows(rows, listQuery);
    return sortEwsRows(tagged, listSort);
  }, [rows, listQuery, listSort]);

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-slate-200 pb-8 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Guru BK · EWS
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Early Warning System
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Monitor kehadiran, nilai, dan pelanggaran seluruh siswa untuk keperluan konseling.
          </p>
        </header>

        {/* Filter kelas */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Kelas</label>
            <select
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value={ADMIN_SEMUA_KELAS}>Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void fetchEws(kelasFilter)}
            disabled={loading}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {loading ? "Memuat…" : "Muat ulang"}
          </button>
        </div>

        {/* Threshold cards */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Batas Alpa", value: batasAlpa },
            { label: "Batas Nilai Merah", value: batasNilaiMerah, suffix: "mapel" },
            { label: "Batas Pelanggaran", value: batasPelanggaran, suffix: "poin" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {item.value} <span className="text-sm font-normal text-slate-500">{item.suffix}</span>
              </p>
              <p className="mt-1 text-[10px] text-slate-400">Diatur oleh Admin</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase text-slate-500">Total siswa</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {loading ? "—" : stats.total}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/40">
            <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-400">Aman</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
              {loading ? "—" : stats.aman}
            </p>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 p-4 dark:border-rose-900/50 dark:bg-rose-950/40">
            <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-400">Perlu konseling</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-rose-900 dark:text-rose-100">
              {loading ? "—" : stats.kritis}
            </p>
          </div>
        </section>

        {loadError && (
          <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100">
            {loadError}
          </div>
        )}

        <AdminListToolbar
          className="mb-4"
          query={listQuery}
          onQueryChange={setListQuery}
          queryPlaceholder="Cari nama atau NISN…"
          sortValue={listSort}
          onSortChange={(v) => setListSort(v as EwsSortPreset)}
          sortOptions={[
            { value: "prioritas", label: "Prioritas" },
            { value: "nama-asc", label: "Nama A → Z" },
            { value: "nama-desc", label: "Nama Z → A" },
            { value: "alpa-desc", label: "Alpa tertinggi" },
            { value: "mapel-desc", label: "Mapel < KKM terbanyak" },
            { value: "poin-desc", label: "Poin pelanggaran tertinggi" },
          ]}
          shown={tableRows.length}
          total={rows.length}
        />

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                  <th className="px-4 py-3">Siswa</th>
                  <th className="px-4 py-3">NISN</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3 text-right">Mapel &lt; KKM</th>
                  <th className="px-4 py-3 text-right">Alpa</th>
                  <th className="px-4 py-3 text-right">Poin</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">Memuat data…</td></tr>
                ) : tableRows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">Belum ada data siswa.</td></tr>
                ) : tableRows.map((row) => (
                  <tr key={row.id} className={row.kritis ? "bg-rose-50/90 dark:bg-rose-950/35" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{row.nama}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{row.nisn}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.kelas ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{row.jumlahMapelDiBawahKkm}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.totalAlpa}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.totalPoinPelanggaran}</td>
                    <td className="px-4 py-3">
                      {row.kritis ? (
                        <span className="inline-flex items-center rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Perlu Konseling</span>
                      ) : (
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Aman</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
