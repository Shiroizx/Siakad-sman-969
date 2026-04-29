"use client";

import {
  getAnalisisRanking,
  type AnalisisBobot,
  type AnalisisSiswaRow,
} from "@/app/actions/analisis";
import { getKelasList, type KelasOption } from "@/app/actions/students";
import { ADMIN_SEMUA_KELAS } from "@/lib/admin-kelas-filter";
import { Trophy, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100] as const;

/* ------------------------------------------------------------------ */
/*  Slider                                                             */
/* ------------------------------------------------------------------ */
function BobotSlider(p: {
  label: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {p.label}
        </span>
        <span
          className={`rounded-md px-2 py-0.5 font-mono text-sm font-bold tabular-nums ${p.color}`}
        >
          {p.value}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={p.value}
        onChange={(e) => p.onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600 dark:bg-slate-700"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Podium card                                                        */
/* ------------------------------------------------------------------ */
function PodiumCard(p: {
  row: AnalisisSiswaRow;
  medal: string;
  border: string;
  bg: string;
  size: string;
}) {
  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border p-5 shadow-lg transition hover:-translate-y-1 hover:shadow-xl ${p.border} ${p.bg} ${p.size}`}
    >
      <span className="text-4xl">{p.medal}</span>
      <p className="mt-2 text-center text-lg font-extrabold text-slate-900 dark:text-white">
        {p.row.nama}
      </p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {p.row.kelas ?? "—"} · {p.row.nisn}
      </p>
      <p className="mt-3 text-3xl font-black tabular-nums text-indigo-600 dark:text-indigo-400">
        {p.row.skorAkhir.toFixed(4)}
      </p>
      <div className="mt-3 grid w-full grid-cols-3 gap-1 text-center text-[10px]">
        <div>
          <p className="font-bold text-emerald-700 dark:text-emerald-400">
            {p.row.nilaiRata.toFixed(1)}
          </p>
          <p className="text-slate-500">Nilai</p>
        </div>
        <div>
          <p className="font-bold text-sky-700 dark:text-sky-400">
            {p.row.persenKehadiran.toFixed(1)}%
          </p>
          <p className="text-slate-500">Hadir</p>
        </div>
        <div>
          <p className="font-bold text-rose-700 dark:text-rose-400">
            {p.row.totalPoinPelanggaran}
          </p>
          <p className="text-slate-500">Poin</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pie Chart                                                          */
/* ------------------------------------------------------------------ */
function PieChart({ rows }: { rows: AnalisisSiswaRow[] }) {
  const counts: Record<string, number> = {
    "Sangat Baik (Top 25%)": 0,
    "Baik (Top 50%)": 0,
    "Cukup (Top 75%)": 0,
    "Perlu Perhatian": 0,
  };
  
  for (const r of rows) {
    const pct = r.rank / rows.length;
    if (pct <= 0.25) counts["Sangat Baik (Top 25%)"]++;
    else if (pct <= 0.5) counts["Baik (Top 50%)"]++;
    else if (pct <= 0.75) counts["Cukup (Top 75%)"]++;
    else counts["Perlu Perhatian"]++;
  }

  const KAT_COLORS: Record<string, string> = {
    "Sangat Baik (Top 25%)": "#10b981",
    "Baik (Top 50%)": "#3b82f6",
    "Cukup (Top 75%)": "#f59e0b",
    "Perlu Perhatian": "#ef4444",
  };

  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  const total = rows.length;
  let cum = 0;
  const slices = entries.map(([k, v]) => {
    const start = cum;
    cum += v / total;
    const end = cum;
    return { label: k, count: v, pct: v / total, start, end, color: KAT_COLORS[k] ?? "#94a3b8" };
  });

  const r = 80, cx = 100, cy = 100;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
      <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0">
        {slices.map((s, i) => {
          const a1 = s.start * 2 * Math.PI - Math.PI / 2;
          const a2 = s.end * 2 * Math.PI - Math.PI / 2;
          const large = s.pct > 0.5 ? 1 : 0;
          // Handle full circle case
          if (s.pct === 1) {
            return <circle key={i} cx={cx} cy={cy} r={r} fill={s.color} stroke="white" strokeWidth="2" />;
          }
          const d = `M${cx},${cy} L${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a2)},${cy + r * Math.sin(a2)} Z`;
          return <path key={i} d={d} fill={s.color} stroke="white" strokeWidth="2" />;
        })}
      </svg>
      <div className="space-y-2">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
            <span className="font-medium text-slate-700 dark:text-slate-200">{s.label}</span>
            <span className="font-mono text-xs text-slate-500">
              {s.count} ({(s.pct * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function GuruBkAnalisisPage() {
  const [kelas, setKelas] = useState<KelasOption[]>([]);
  const [kelasFilter, setKelasFilter] = useState("");
  const [semester, setSemester] = useState<0 | 1 | 2>(0);
  const [bobot, setBobot] = useState<AnalisisBobot>({
    nilai: 50,
    kehadiran: 30,
    pelanggaran: 20,
  });
  const [rows, setRows] = useState<AnalisisSiswaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showMethod, setShowMethod] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    void (async () => {
      const res = await getKelasList();
      if (!res.error) {
        setKelas(res.rows);
        if (res.rows.length > 0) setKelasFilter(res.rows[0].id);
      }
    })();
  }, []);

  const totalBobot = bobot.nilai + bobot.kehadiran + bobot.pelanggaran;

  const handleHitung = useCallback(async () => {
    if (!kelasFilter) return;
    setLoading(true);
    setError(null);
    const res = await getAnalisisRanking(kelasFilter, semester, bobot);
    if (res.error) setError(res.error);
    else setRows(res.rows);
    setLoading(false);
  }, [kelasFilter, semester, bobot]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nama.toLowerCase().includes(q) ||
        r.nisn.toLowerCase().includes(q) ||
        (r.kelas ?? "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filtered.length, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const top3 = rows.slice(0, 3);
  const avgSkor =
    rows.length > 0
      ? rows.reduce((a, b) => a + b.skorAkhir, 0) / rows.length
      : 0;

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 border-b border-slate-200 pb-8 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Trophy className="h-4 w-4" aria-hidden />
            Guru BK · Analisis SPK
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Analisis Siswa Terbaik — Metode SAW
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Perankingan siswa menggunakan{" "}
            <strong>Simple Additive Weighting (SAW)</strong> dengan 3 kriteria:
            Nilai rata-rata (benefit), Kehadiran (benefit), dan Poin
            pelanggaran (cost). Atur bobot sesuai kebijakan sekolah.
          </p>
        </header>

        {/* Filters */}
        <section className="mb-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Kelas
              </label>
              <select
                value={kelasFilter}
                onChange={(e) => setKelasFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              >
                <optgroup label="Per Kelas">
                  {kelas.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Per Tingkat">
                  <option value="TINGKAT_10">Seluruh Kelas 10</option>
                  <option value="TINGKAT_11">Seluruh Kelas 11</option>
                  <option value="TINGKAT_12">Seluruh Kelas 12</option>
                </optgroup>
                <optgroup label="Keseluruhan">
                  <option value={ADMIN_SEMUA_KELAS}>
                    Semua kelas (seluruh sekolah)
                  </option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value) as 0 | 1 | 2)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value={0}>Semua Semester (gabungan)</option>
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
          </div>

          {/* Bobot sliders */}
          <div className="grid gap-4 sm:grid-cols-3">
            <BobotSlider
              label="C1 · Nilai Rata-rata"
              value={bobot.nilai}
              color="text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950"
              onChange={(v) =>
                setBobot((b) => ({ ...b, nilai: v }))
              }
            />
            <BobotSlider
              label="C2 · Kehadiran"
              value={bobot.kehadiran}
              color="text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950"
              onChange={(v) =>
                setBobot((b) => ({ ...b, kehadiran: v }))
              }
            />
            <BobotSlider
              label="C3 · Pelanggaran"
              value={bobot.pelanggaran}
              color="text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950"
              onChange={(v) =>
                setBobot((b) => ({ ...b, pelanggaran: v }))
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className={`text-sm font-medium ${totalBobot === 100 ? "text-emerald-600" : "text-rose-600"}`}
            >
              Total bobot: {totalBobot}%{" "}
              {totalBobot !== 100 && "(disarankan 100%)"}
            </p>
            <button
              type="button"
              onClick={() => void handleHitung()}
              disabled={loading || !kelasFilter}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-900/25 transition hover:bg-indigo-500 disabled:opacity-50"
            >
              <Trophy className="h-4 w-4" />
              {loading ? "Menghitung…" : "Hitung Ranking"}
            </button>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100">
            {error}
          </div>
        )}

        {rows.length > 0 && (
          <>
            {/* Stats */}
            <section className="mb-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                  Siswa dianalisis
                </p>
                <p className="mt-1 text-3xl font-black tabular-nums text-slate-900 dark:text-white">
                  {rows.length}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-5 dark:border-amber-900/50 dark:bg-amber-950/40">
                <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-400">
                  Siswa terbaik #1
                </p>
                <p className="mt-1 text-xl font-extrabold text-amber-900 dark:text-amber-100">
                  {top3[0]?.nama ?? "—"}
                </p>
                <p className="text-sm font-mono tabular-nums text-amber-700 dark:text-amber-300">
                  Skor: {top3[0]?.skorAkhir.toFixed(4) ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/80 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/40">
                <p className="text-xs font-medium uppercase text-indigo-700 dark:text-indigo-400">
                  Rata-rata skor
                </p>
                <p className="mt-1 text-3xl font-black tabular-nums text-indigo-900 dark:text-indigo-100">
                  {avgSkor.toFixed(4)}
                </p>
              </div>
            </section>

            {/* Podium */}
            {top3.length >= 3 && (
              <section className="mb-8">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  🏆 Podium Top 3
                </h2>
                <div className="grid items-end gap-4 sm:grid-cols-3">
                  <PodiumCard
                    row={top3[1]}
                    medal="🥈"
                    border="border-slate-300 dark:border-slate-600"
                    bg="bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900"
                    size="pt-8"
                  />
                  <PodiumCard
                    row={top3[0]}
                    medal="🥇"
                    border="border-amber-300 dark:border-amber-700"
                    bg="bg-gradient-to-b from-amber-50 to-yellow-50 dark:from-amber-950/60 dark:to-yellow-950/40"
                    size="pt-6 sm:-mt-4"
                  />
                  <PodiumCard
                    row={top3[2]}
                    medal="🥉"
                    border="border-orange-300 dark:border-orange-800"
                    bg="bg-gradient-to-b from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/30"
                    size="pt-10"
                  />
                </div>
              </section>
            )}

            {/* Charts */}
            <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                📊 Distribusi Kinerja Siswa
              </h2>
              <PieChart rows={rows} />
            </section>

            {/* Search */}
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, NISN, atau kelas…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
              <span className="shrink-0 text-xs text-slate-400">
                {filtered.length}/{rows.length}
              </span>
            </div>

            {/* Table */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Tabel Ranking SAW
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                      <th className="px-3 py-3 text-center">Rank</th>
                      <th className="px-3 py-3">Nama</th>
                      <th className="px-3 py-3">NISN</th>
                      <th className="px-3 py-3">Kelas</th>
                      <th className="px-3 py-3 text-right">Nilai Rata</th>
                      <th className="px-3 py-3 text-right">Kehadiran</th>
                      <th className="px-3 py-3 text-right">Poin Pelang.</th>
                      <th className="px-3 py-3 text-right">Norm C1</th>
                      <th className="px-3 py-3 text-right">Norm C2</th>
                      <th className="px-3 py-3 text-right">Norm C3</th>
                      <th className="px-3 py-3 text-right">Skor (V)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginated.map((r) => (
                      <tr
                        key={r.id}
                        className={
                          r.rank <= 3
                            ? "bg-amber-50/60 dark:bg-amber-950/20"
                            : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        }
                      >
                        <td className="px-3 py-2.5 text-center">
                          {r.rank <= 3 ? (
                            <span className="text-lg">
                              {r.rank === 1
                                ? "🥇"
                                : r.rank === 2
                                  ? "🥈"
                                  : "🥉"}
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                              {r.rank}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {r.nama}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                          {r.nisn}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                          {r.kelas ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                          {r.nilaiRata.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                          {r.persenKehadiran.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                          {r.totalPoinPelanggaran}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-emerald-700 dark:text-emerald-400">
                          {r.normNilai.toFixed(4)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-sky-700 dark:text-sky-400">
                          {r.normKehadiran.toFixed(4)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-rose-700 dark:text-rose-400">
                          {r.normPelanggaran.toFixed(4)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
                          {r.skorAkhir.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span>Tampilkan</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span>data per halaman</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="mr-2 text-xs text-slate-500 dark:text-slate-400">
                    {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} dari {filtered.length}
                  </span>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    1
                  </button>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 p-1 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white tabular-nums">
                    {page}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-slate-200 p-1 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {totalPages}
                  </button>
                </div>
              </div>
            </section>

            {/* Method explanation */}
            <section className="mt-8">
              <button
                type="button"
                onClick={() => setShowMethod(!showMethod)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>📐 Langkah Perhitungan SAW (Transparansi Metode)</span>
                {showMethod ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {showMethod && (
                <div className="mt-2 space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <div>
                    <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
                      1. Kriteria &amp; Tipe
                    </h3>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="py-1 pr-3">Kode</th>
                          <th className="py-1 pr-3">Kriteria</th>
                          <th className="py-1 pr-3">Tipe</th>
                          <th className="py-1">Bobot</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        <tr>
                          <td className="py-1 pr-3">C1</td>
                          <td className="pr-3">Nilai Rata-rata</td>
                          <td className="pr-3 text-emerald-600">Benefit</td>
                          <td>{bobot.nilai}%</td>
                        </tr>
                        <tr>
                          <td className="py-1 pr-3">C2</td>
                          <td className="pr-3">Kehadiran (%)</td>
                          <td className="pr-3 text-emerald-600">Benefit</td>
                          <td>{bobot.kehadiran}%</td>
                        </tr>
                        <tr>
                          <td className="py-1 pr-3">C3</td>
                          <td className="pr-3">Poin Pelanggaran</td>
                          <td className="pr-3 text-rose-600">Cost</td>
                          <td>{bobot.pelanggaran}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
                      2. Normalisasi
                    </h3>
                    <p>
                      <strong>Benefit:</strong>{" "}
                      <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                        r = x / max(x)
                      </code>
                    </p>
                    <p>
                      <strong>Cost:</strong>{" "}
                      <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                        r = min(x) / x
                      </code>{" "}
                      (jika x = 0, r = 1)
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
                      3. Skor Akhir
                    </h3>
                    <p>
                      <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                        V = w1×r1 + w2×r2 + w3×r3
                      </code>
                    </p>
                    <p className="mt-1">
                      Ranking diurutkan dari skor V tertinggi ke terendah.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {!loading && rows.length === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/30">
            <Trophy className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="mt-4 text-lg font-semibold text-slate-500 dark:text-slate-400">
              Pilih kelas &amp; semester, atur bobot, lalu klik{" "}
              <span className="text-indigo-600 dark:text-indigo-400">
                Hitung Ranking
              </span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

