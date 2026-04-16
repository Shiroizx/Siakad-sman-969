"use client";

import { getKelasWithTingkat, listStudentsInKelas, getGradesForSemester, saveGradesSemester, type GradeRow, type KelasWithTingkat, type StudentMini } from "@/app/actions/akademik";
import { getMyWaliKelas } from "@/app/actions/wali-kelas";
import { BookOpen, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function WaliKelasAkademikPage() {
  const [myKelas, setMyKelas] = useState<{ id: string; nama: string }[]>([]);
  const [allKelas, setAllKelas] = useState<KelasWithTingkat[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [students, setStudents] = useState<StudentMini[]>([]);
  const [studentId, setStudentId] = useState("");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [nilaiInput, setNilaiInput] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [{ kelas: k }, { rows }] = await Promise.all([getMyWaliKelas(), getKelasWithTingkat()]);
      setMyKelas(k);
      setAllKelas(rows);
      if (k.length > 0) setKelasId(k[0].id);
    }
    void load();
  }, []);

  useEffect(() => {
    if (!kelasId) { setStudents([]); return; }
    listStudentsInKelas(kelasId).then(({ students: s }) => {
      setStudents(s);
      setStudentId("");
      setGrades([]);
      setNilaiInput({});
    });
  }, [kelasId]);

  useEffect(() => {
    if (!studentId) { setGrades([]); setNilaiInput({}); return; }
    setLoading(true);
    getGradesForSemester(studentId, semester).then(({ grades: g, error: e }) => {
      setGrades(g);
      setError(e);
      const init: Record<string, string> = {};
      for (const r of g) {
        init[r.subject_id] = r.nilai !== null && Number.isFinite(r.nilai) ? String(r.nilai) : "";
      }
      setNilaiInput(init);
      setLoading(false);
    });
  }, [studentId, semester]);

  async function handleSave() {
    if (!studentId) return;
    setSaving(true);
    setToast(null);
    const entries = grades.map((g) => ({
      subjectId: g.subject_id,
      nilaiRaw: nilaiInput[g.subject_id] ?? "",
    }));
    const { error } = await saveGradesSemester(studentId, semester, entries);
    setSaving(false);
    if (error) {
      setToast(error);
      return;
    }
    setToast("Nilai berhasil disimpan.");
    const { grades: g, error: ge } = await getGradesForSemester(studentId, semester);
    if (!ge && g.length >= 0) {
      setGrades(g);
      const init: Record<string, string> = {};
      for (const r of g) {
        init[r.subject_id] = r.nilai !== null && Number.isFinite(r.nilai) ? String(r.nilai) : "";
      }
      setNilaiInput(init);
    }
  }

  // Hanya tampilkan kelas yg dipegang wali kelas ini
  const filteredKelas = useMemo(
    () => allKelas.filter((k) => myKelas.some((m) => m.id === k.id)),
    [allKelas, myKelas]
  );

  const selectedKelas = filteredKelas.find((k) => k.id === kelasId);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <BookOpen className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Wali Kelas · Akademik</span>
        </div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Nilai Siswa</h1>

        {toast && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
            {toast}
          </div>
        )}
        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Kelas</label>
              <select
                value={kelasId}
                onChange={(e) => setKelasId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">— Pilih kelas —</option>
                {filteredKelas.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Siswa</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={!kelasId}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">— Pilih siswa —</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.nama} ({s.nisn})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value) as 1 | 2)}
                disabled={!studentId}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                disabled={!studentId || saving || grades.length === 0}
                onClick={() => void handleSave()}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden />
                {saving ? "Menyimpan…" : "Simpan nilai"}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Memuat nilai…</p>
        ) : studentId && grades.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Nilai — Tingkat {selectedKelas?.tingkat ?? "—"}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                    <th className="px-4 py-3 text-left">Mata Pelajaran</th>
                    <th className="px-4 py-3 text-right">KKM</th>
                    <th className="px-4 py-3 text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {grades.map((g) => (
                    <tr key={g.subject_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{g.nama_mapel}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{g.kkm}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-right font-mono text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                          value={nilaiInput[g.subject_id] ?? ""}
                          onChange={(e) =>
                            setNilaiInput((prev) => ({
                              ...prev,
                              [g.subject_id]: e.target.value,
                            }))
                          }
                          placeholder="—"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : studentId ? (
          <p className="text-sm text-slate-500">Tidak ada data nilai untuk semester ini.</p>
        ) : null}
      </div>
    </div>
  );
}
