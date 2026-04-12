"use client";

import { simulateClustering, type ClusterClassResult } from "@/app/actions/clustering";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import {
  type ClusterSiswaSort,
  sortClusterStudents,
} from "@/lib/admin-list-utils";
import { useCallback, useMemo, useState } from "react";

export default function AdminClusteringPage() {
  const [jumlahKelas, setJumlahKelas] = useState(3);
  const [classes, setClasses] = useState<ClusterClassResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siswaSort, setSiswaSort] = useState<ClusterSiswaSort>("nama-asc");
  const [clusterQuery, setClusterQuery] = useState("");

  const classesView = useMemo(() => {
    if (classes.length === 0) return [];
    const q = clusterQuery.trim().toLowerCase();
    return classes.map((kelas) => {
      let siswa = sortClusterStudents(kelas.siswa, siswaSort);
      if (q) {
        siswa = siswa.filter(
          (s) =>
            s.nama.toLowerCase().includes(q) ||
            String(s.nisn).toLowerCase().includes(q)
        );
      }
      return { ...kelas, siswa };
    });
  }, [classes, siswaSort, clusterQuery]);

  const totalSiswaShown = useMemo(
    () => classesView.reduce((a, c) => a + c.siswa.length, 0),
    [classesView]
  );
  const totalSiswaAll = useMemo(
    () => classes.reduce((a, c) => a + c.siswa.length, 0),
    [classes]
  );

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { classes: next, error: err } = await simulateClustering(jumlahKelas);
    if (err) {
      setError(err);
      setClasses([]);
    } else {
      setClasses(next);
    }
    setLoading(false);
  }, [jumlahKelas]);

  const spreadRata =
    classes.length > 0
      ? Math.max(...classes.map((c) => c.rataNilaiKelas)) -
        Math.min(...classes.map((c) => c.rataNilaiKelas))
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-slate-200 pb-8 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Admin · SPK
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Auto-Clustering Pemerataan Kelas
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Simulasi pembagian siswa ke beberapa kelas baru menggunakan{" "}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Greedy S-curve distribution
            </span>
            : laki-laki dan perempuan dipisah, masing-masing diurutkan nilai rata
            menurun, lalu dialokasikan zig-zag ke kelas (L selesai, baru P).
            Hasil hanya pratinjau — tidak ada perubahan di database.
          </p>
        </header>

        <section className="mb-8 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-6">
            <div>
              <label
                htmlFor="jumlah-kelas"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Ingin dibagi menjadi berapa kelas?
              </label>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Nilai rata dihitung dari tabel{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] dark:bg-slate-800">
                  academic_records
                </code>
                .
              </p>
              <input
                id="jumlah-kelas"
                type="number"
                min={1}
                max={12}
                value={jumlahKelas}
                onChange={(e) =>
                  setJumlahKelas(
                    Math.min(12, Math.max(1, Number(e.target.value) || 1))
                  )
                }
                className="mt-2 w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-medium text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {loading ? "Menghitung…" : "Generate Simulasi Kelas"}
          </button>
        </section>

        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100"
          >
            <span className="font-semibold">Gagal memuat atau menghitung.</span>{" "}
            {error}
          </div>
        ) : null}

        {classes.length > 0 ? (
          <>
            <AdminListToolbar
              className="mb-6"
              query={clusterQuery}
              onQueryChange={setClusterQuery}
              queryPlaceholder="Saring nama / NISN di semua kelas simulasi…"
              sortValue={siswaSort}
              onSortChange={(v) => setSiswaSort(v as ClusterSiswaSort)}
              sortOptions={[
                { value: "nama-asc", label: "Nama A → Z (tiap kelas)" },
                { value: "nama-desc", label: "Nama Z → A" },
                { value: "nilai-desc", label: "Nilai rata-rata tertinggi" },
                { value: "nisn-asc", label: "NISN terkecil" },
              ]}
              shown={totalSiswaShown}
              total={totalSiswaAll}
              itemLabel="baris siswa (semua kelas)"
            />
            <section className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                  Kelas simulasi
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {classes.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                  Total siswa terbagi
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {classes.reduce((a, c) => a + c.totalSiswa, 0)}
                </p>
              </div>
              <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/80 px-4 py-3 dark:border-indigo-900/50 dark:bg-indigo-950/40">
                <p className="text-xs font-medium uppercase text-indigo-700 dark:text-indigo-300">
                  Sebaran rata-rata nilai antar kelas (Δ)
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-indigo-900 dark:text-indigo-100">
                  {spreadRata.toFixed(2)}
                </p>
                <p className="mt-0.5 text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                  Semakin kecil, semakin merata kemampuan antar kelas.
                </p>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {classesView.map((kelas) => (
                <article
                  key={kelas.index}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10"
                >
                  <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/60 px-4 py-3 dark:border-slate-800 dark:from-slate-800/80 dark:to-indigo-950/40">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {kelas.namaKelas}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {clusterQuery.trim()
                        ? `${kelas.siswa.length} cocok saringan`
                        : `${kelas.totalSiswa} siswa`}
                      {clusterQuery.trim() && kelas.siswa.length !== kelas.totalSiswa
                        ? ` (dari ${kelas.totalSiswa})`
                        : ""}{" "}
                      · rasio L:P{" "}
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {kelas.rasioLP}
                      </span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-semibold text-indigo-800 shadow-sm ring-1 ring-indigo-200 dark:bg-slate-950 dark:text-indigo-200 dark:ring-indigo-900">
                        Rata nilai:{" "}
                        <span className="ml-1 font-mono tabular-nums">
                          {kelas.rataNilaiKelas.toFixed(2)}
                        </span>
                      </span>
                      <span className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-700">
                        L {kelas.jumlahL} · P {kelas.jumlahP}
                      </span>
                    </div>
                  </div>

                  <div className="max-h-[280px] flex-1 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/95 dark:text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Nama</th>
                          <th className="px-3 py-2 text-right">Nilai</th>
                          <th className="px-3 py-2 text-center">JK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {kelas.siswa.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                            >
                              (kosong)
                            </td>
                          </tr>
                        ) : (
                          kelas.siswa.map((s) => (
                            <tr
                              key={s.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                            >
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                                {s.nama}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                                {s.nilaiRata.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={
                                    s.jenisKelamin === "L"
                                      ? "rounded bg-sky-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                                      : "rounded bg-fuchsia-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200"
                                  }
                                >
                                  {s.jenisKelamin}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : !loading && !error ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
            Klik{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Generate Simulasi Kelas
            </span>{" "}
            untuk memuat siswa dari database dan menampilkan grid hasil
            pembagian.
          </p>
        ) : null}
      </main>
    </div>
  );
}
