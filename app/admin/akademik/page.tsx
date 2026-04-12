"use client";

import {
  getGradesForSemester,
  getKelasWithTingkat,
  listStudentsInKelas,
  saveGradesSemester,
  type GradeRow,
  type KelasWithTingkat,
  type StudentMini,
} from "@/app/actions/akademik";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import {
  filterStudentMiniByQuery,
  type StudentMiniSort,
  sortStudentMini,
} from "@/lib/admin-list-utils";
import { BookOpen, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function AdminAkademikPage() {
  const [kelasList, setKelasList] = useState<KelasWithTingkat[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [students, setStudents] = useState<StudentMini[]>([]);
  const [studentId, setStudentId] = useState("");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [nilaiInput, setNilaiInput] = useState<Record<string, string>>({});

  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [studentQuery, setStudentQuery] = useState("");
  const [studentSort, setStudentSort] = useState<StudentMiniSort>("nama-asc");

  const studentsPick = useMemo(() => {
    const f = filterStudentMiniByQuery(students, studentQuery);
    return sortStudentMini(f, studentSort);
  }, [students, studentQuery, studentSort]);

  useEffect(() => {
    let c = false;
    (async () => {
      const { rows, error } = await getKelasWithTingkat();
      if (c) return;
      setLoading(false);
      if (error) setLoadErr(error);
      else setKelasList(rows);
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!kelasId) {
        setStudents([]);
        setStudentId("");
        return;
      }
      const { students: list, error } = await listStudentsInKelas(kelasId);
      if (cancelled) return;
      if (error) {
        setLoadErr(error);
        setStudents([]);
        return;
      }
      setLoadErr(null);
      setStudents(list);
      setStudentId("");
      setGrades([]);
      setNilaiInput({});
    })();
    return () => {
      cancelled = true;
    };
  }, [kelasId]);

  useEffect(() => {
    setStudentQuery("");
    setStudentSort("nama-asc");
  }, [kelasId]);

  useEffect(() => {
    if (studentId && !studentsPick.some((s) => s.id === studentId)) {
      setStudentId("");
    }
  }, [studentId, studentsPick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!studentId) {
        setGrades([]);
        setNilaiInput({});
        return;
      }
      const { grades: g, error } = await getGradesForSemester(
        studentId,
        semester
      );
      if (cancelled) return;
      if (error) {
        setLoadErr(error);
        setGrades([]);
        return;
      }
      setLoadErr(null);
      setGrades(g);
      const init: Record<string, string> = {};
      for (const r of g) {
        init[r.subject_id] =
          r.nilai !== null && Number.isFinite(r.nilai) ? String(r.nilai) : "";
      }
      setNilaiInput(init);
    })();
    return () => {
      cancelled = true;
    };
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
    const { grades: g, error: ge } = await getGradesForSemester(
      studentId,
      semester
    );
    if (!ge && g.length >= 0) {
      setGrades(g);
      const init: Record<string, string> = {};
      for (const r of g) {
        init[r.subject_id] =
          r.nilai !== null && Number.isFinite(r.nilai) ? String(r.nilai) : "";
      }
      setNilaiInput(init);
    }
  }

  const selectedKelas = kelasList.find((k) => k.id === kelasId);

  return (
    <div className="min-h-screen bg-slate-50/80 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-2 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <BookOpen className="h-4 w-4" aria-hidden />
              Admin · Akademik
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Input nilai
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
              Pilih kelas dan siswa, lalu semester. Daftar mapel mengikuti{" "}
              <strong>tingkat kelas</strong> siswa ({selectedKelas?.tingkat ?? "—"}
              ). KKM per mapel diatur di master mata pelajaran.
            </p>
          </div>
        </header>

        {toast ? (
          <div
            role="status"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
          >
            {toast}
          </div>
        ) : null}
        {loadErr && !loading ? (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          >
            {loadErr}
          </div>
        ) : null}

        <div className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {kelasId ? (
            <AdminListToolbar
              query={studentQuery}
              onQueryChange={setStudentQuery}
              queryPlaceholder="Cari siswa di kelas ini (nama / NISN)…"
              sortValue={studentSort}
              onSortChange={(v) => setStudentSort(v as StudentMiniSort)}
              sortOptions={[
                { value: "nama-asc", label: "Nama A → Z" },
                { value: "nama-desc", label: "Nama Z → A" },
                { value: "nisn-asc", label: "NISN terkecil" },
              ]}
              shown={studentsPick.length}
              total={students.length}
            />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Kelas
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              value={kelasId}
              onChange={(e) => setKelasId(e.target.value)}
            >
              <option value="">— Pilih kelas —</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Siswa
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={!kelasId}
            >
              <option value="">— Pilih siswa —</option>
              {studentsPick.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.nisn})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Semester
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value) as 1 | 2)}
              disabled={!studentId}
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

        {studentId && grades.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Nilai mapel
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kosongkan input untuk menghapus nilai mapel tersebut.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                    <th className="px-4 py-3">Mata pelajaran</th>
                    <th className="px-4 py-3 text-right">KKM</th>
                    <th className="px-4 py-3 text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {grades.map((g) => (
                    <tr
                      key={g.subject_id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {g.nama_mapel}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {g.kkm}
                      </td>
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
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tidak ada daftar mapel untuk tingkat ini (periksa master subjects).
          </p>
        ) : null}
      </div>
    </div>
  );
}
