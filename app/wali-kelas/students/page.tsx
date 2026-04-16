"use client";

import { getMyWaliKelas, getWaliKelasStudents } from "@/app/actions/wali-kelas";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";

export default function WaliKelasStudentsPage() {
  const [kelas, setKelas] = useState<{ id: string; nama: string }[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [kelasLoaded, setKelasLoaded] = useState(false);
  const [students, setStudents] = useState<{ id: string; nisn: string; nama: string; jenis_kelamin: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      const { kelas: k } = await getMyWaliKelas();
      setKelas(k);
      setKelasLoaded(true);
      if (k.length > 0) setKelasId(k[0].id);
    }
    void load();
  }, []);

  useEffect(() => {
    if (!kelasId) return;
    setLoading(true);
    getWaliKelasStudents(kelasId).then(({ students: s, error: e }) => {
      setStudents(s);
      setError(e);
      setLoading(false);
    });
  }, [kelasId]);

  const filtered = students.filter((s) =>
    !query.trim() || s.nama.toLowerCase().includes(query.toLowerCase()) || s.nisn.includes(query)
  );

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Users className="h-6 w-6" />
          <span className="text-xs font-bold uppercase tracking-widest">Wali Kelas</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Data Siswa</h1>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">Daftar siswa di kelas yang Anda ampu (view-only).</p>

        {/* Filter kelas */}
        <div className="mb-6 flex gap-3">
          <select
            value={kelasId}
            onChange={(e) => setKelasId(e.target.value)}
            disabled={!kelasLoaded || kelas.length === 0}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          >
            {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            {kelas.length === 0 && <option>Tidak ada kelas</option>}
          </select>
          <input
            type="text"
            placeholder="Cari nama / NISN..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Nama</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">NISN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">JK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  {kelas.length === 0 ? "Anda belum ditugaskan ke kelas." : "Tidak ada data."}
                </td></tr>
              ) : filtered.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.nama}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{s.nisn}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.jenis_kelamin === "L" ? "Laki-laki" : s.jenis_kelamin === "P" ? "Perempuan" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
              Menampilkan {filtered.length} dari {students.length} siswa
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
