"use client";

import { getGuruBkStudents, type GuruBkStudentRow } from "@/app/actions/guru-bk";
import { getKelasWithTingkat, type KelasWithTingkat } from "@/app/actions/akademik";
import { Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function GuruBkStudentsPage() {
  const [kelasList, setKelasList] = useState<KelasWithTingkat[]>([]);
  const [kelasFilter, setKelasFilter] = useState("");
  const [students, setStudents] = useState<GuruBkStudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getKelasWithTingkat().then(({ rows }) => setKelasList(rows));
  }, []);

  useEffect(() => {
    setLoading(true);
    getGuruBkStudents(kelasFilter || undefined).then(({ students: s, error: e }) => {
      setStudents(s);
      setError(e);
      setLoading(false);
    });
  }, [kelasFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.nisn.includes(q)
    );
  }, [students, search]);

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-slate-200 pb-8 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            <Users className="h-4 w-4" aria-hidden />
            Guru BK · Data Siswa
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Data Siswa
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Daftar seluruh siswa untuk keperluan konseling.
          </p>
        </header>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Kelas</label>
            <select
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cari</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nama atau NISN…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>

        <p className="mb-3 text-xs text-slate-500">{filtered.length} siswa ditampilkan</p>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">NISN</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">JK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500">Memuat…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500">Tidak ada data siswa.</td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.nama}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{s.nisn}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.kelas_nama ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.jenis_kelamin === "L" ? "Laki-laki" : s.jenis_kelamin === "P" ? "Perempuan" : "—"}</td>
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
