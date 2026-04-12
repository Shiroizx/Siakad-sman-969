"use client";

import { getEwsData, type EwsStudentRow } from "@/app/actions/ews";
import { getKelasList, type KelasOption } from "@/app/actions/students";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { ADMIN_SEMUA_KELAS } from "@/lib/admin-kelas-filter";
import {
  type EwsSortPreset,
  filterEwsRows,
  sortEwsRows,
} from "@/lib/admin-list-utils";
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

function SliderField(props: {
  label: string;
  hint: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const { label, hint, min, max, value, onChange, suffix } = props;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/60">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {label}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-bold text-slate-800 tabular-nums dark:bg-slate-800 dark:text-slate-100">
          {value}
          {suffix ? ` ${suffix}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-rose-600 dark:bg-slate-700 dark:accent-rose-500"
      />
    </div>
  );
}

export default function AdminEwsPage() {
  const [students, setStudents] = useState<EwsStudentRow[]>([]);
  const [kelas, setKelas] = useState<KelasOption[]>([]);
  const [kelasFilter, setKelasFilter] = useState("");
  const [kelasLoaded, setKelasLoaded] = useState(false);
  const [kelasListError, setKelasListError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [batasAlpa, setBatasAlpa] = useState(5);
  const [batasNilaiMerah, setBatasNilaiMerah] = useState(2);
  const [batasPelanggaran, setBatasPelanggaran] = useState(50);

  const [listQuery, setListQuery] = useState("");
  const [listSort, setListSort] = useState<EwsSortPreset>("prioritas");

  const loadKelas = useCallback(async () => {
    const kelRes = await getKelasList();
    setKelasLoaded(true);
    if (kelRes.error) {
      setKelasListError(kelRes.error);
      setKelas([]);
    } else {
      setKelasListError(null);
      setKelas(kelRes.rows);
      setKelasFilter((prev) => prev || kelRes.rows[0]?.id || "");
    }
  }, []);

  const fetchEws = useCallback(async (filter: string) => {
    if (!filter) {
      setStudents([]);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { students: rows, error } = await getEwsData(filter);
    if (error) {
      setLoadError(error);
      setStudents([]);
    } else {
      setLoadError(null);
      setStudents(rows);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadKelas();
  }, [loadKelas]);

  useEffect(() => {
    void fetchEws(kelasFilter);
  }, [kelasFilter, fetchEws]);

  const rows = useMemo(
    () =>
      students.map((s) => ({
        ...s,
        kritis: isKritis(s, batasAlpa, batasNilaiMerah, batasPelanggaran),
      })),
    [students, batasAlpa, batasNilaiMerah, batasPelanggaran]
  );

  const stats = useMemo(() => {
    const kritis = rows.filter((r) => r.kritis).length;
    return {
      total: rows.length,
      kritis,
      aman: rows.length - kritis,
    };
  }, [rows]);

  const tableRows = useMemo(() => {
    const tagged = filterEwsRows(rows, listQuery);
    return sortEwsRows(tagged, listSort);
  }, [rows, listQuery, listSort]);

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-8 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Admin · Monitoring
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Early Warning System
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Data per kelas: alpa kumulatif, mapel dengan nilai di bawah KKM,
              dan poin pelanggaran (tahun ajaran aktif). Default memuat kelas
              pertama; pilih kelas lain atau <strong>Semua kelas</strong> untuk
              agregat seluruh sekolah (lebih berat).
            </p>
          </div>
        </header>

        <div className="mb-8 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[12rem] flex-1">
            <label
              htmlFor="admin-ews-kelas"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Kelas
            </label>
            <select
              id="admin-ews-kelas"
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              disabled={!kelasLoaded || Boolean(kelasListError) || kelas.length === 0}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            >
              {kelas.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
              <option value={ADMIN_SEMUA_KELAS}>Semua kelas (tanpa filter)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => void fetchEws(kelasFilter)}
            disabled={loading || !kelasFilter}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {loading ? "Memuat…" : "Muat ulang"}
          </button>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Total siswa
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {!kelasLoaded || !kelasFilter || loading ? "—" : stats.total}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/40">
            <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-400">
              Aman
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
              {!kelasLoaded || !kelasFilter || loading ? "—" : stats.aman}
            </p>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 p-4 dark:border-rose-900/50 dark:bg-rose-950/40">
            <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-400">
              Perlu perhatian
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-rose-900 dark:text-rose-100">
              {!kelasLoaded || !kelasFilter || loading ? "—" : stats.kritis}
            </p>
          </div>
        </section>

        {loadError ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100"
          >
            <span className="font-semibold">Gagal memuat data.</span>{" "}
            {loadError}
          </div>
        ) : null}

        {!kelasLoaded ? (
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            Memuat daftar kelas…
          </p>
        ) : kelasListError ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100"
          >
            {kelasListError}
          </div>
        ) : kelas.length === 0 ? (
          <div
            role="status"
            className="mb-6 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
          >
            Belum ada kelas di master. Tambahkan kelas agar EWS bisa ditampilkan
            per kelas.
          </div>
        ) : null}

        <section className="mb-8 grid gap-4 lg:grid-cols-3">
          <SliderField
            label="Batas Alpa"
            hint="Siswa dengan total alpa lebih besar dari nilai ini ditandai."
            min={0}
            max={40}
            value={batasAlpa}
            onChange={setBatasAlpa}
          />
          <SliderField
            label="Batas Nilai Merah"
            hint="Jumlah mapel dengan nilai di bawah KKM mapel (dinamis) lebih besar dari ambang ini."
            min={0}
            max={12}
            value={batasNilaiMerah}
            onChange={setBatasNilaiMerah}
            suffix="mapel"
          />
          <SliderField
            label="Batas Pelanggaran"
            hint="Total poin pelanggaran lebih besar dari nilai ini ditandai."
            min={0}
            max={120}
            value={batasPelanggaran}
            onChange={setBatasPelanggaran}
            suffix="poin"
          />
        </section>

        {kelasLoaded && kelasFilter && !kelasListError ? (
          <AdminListToolbar
            className="mb-4"
            query={listQuery}
            onQueryChange={setListQuery}
            queryPlaceholder="Cari nama, NISN, atau kelas…"
            sortValue={listSort}
            onSortChange={(v) => setListSort(v as EwsSortPreset)}
            sortOptions={[
              { value: "prioritas", label: "Prioritas (perlu perhatian dulu)" },
              { value: "nama-asc", label: "Nama A → Z" },
              { value: "nama-desc", label: "Nama Z → A" },
              { value: "kelas-asc", label: "Kelas A → Z" },
              { value: "alpa-desc", label: "Alpa tertinggi" },
              { value: "mapel-desc", label: "Mapel di bawah KKM terbanyak" },
              { value: "poin-desc", label: "Poin pelanggaran tertinggi" },
            ]}
            shown={tableRows.length}
            total={rows.length}
          />
        ) : null}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Daftar siswa
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Baris merah = salah satu metrik melewati ambang slider. Gunakan
              kotak pencarian dan urutan di atas untuk menemukan siswa cepat.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
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
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      Memuat data dari server…
                    </td>
                  </tr>
                ) : !kelasLoaded || !kelasFilter || kelasListError ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      {!kelasLoaded
                        ? "Memuat daftar kelas…"
                        : kelasListError
                          ? "Perbaiki error memuat kelas lalu segarkan halaman."
                          : kelas.length === 0
                            ? "Belum ada kelas di master."
                            : "Pilih kelas di atas."}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      {loadError
                        ? "Perbaiki error di atas lalu muat ulang."
                        : "Belum ada data siswa."}
                    </td>
                  </tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      Tidak ada siswa yang cocok dengan pencarian. Ubah kata kunci
                      atau kosongkan kolom cari.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        row.kritis
                          ? "bg-rose-50/90 text-rose-950 dark:bg-rose-950/35 dark:text-rose-50"
                          : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      }
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {row.nama}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {row.nisn}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {row.kelas ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {row.jumlahMapelDiBawahKkm}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.totalAlpa}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.totalPoinPelanggaran}
                      </td>
                      <td className="px-4 py-3">
                        {row.kritis ? (
                          <span className="inline-flex max-w-[11rem] flex-wrap items-center rounded-full bg-rose-600 px-2.5 py-1 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-white shadow-sm sm:max-w-none sm:text-xs">
                            KRITIS: Panggil BK
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            Aman
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
