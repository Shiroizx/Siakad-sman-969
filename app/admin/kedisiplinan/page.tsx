"use client";

import {
  getAttendanceForStudent,
  getViolationsForStudent,
  type DisciplineSemester,
  type ViolationRow,
} from "@/app/actions/kedisiplinan";
import {
  getKelasWithTingkat,
  listStudentsInKelas,
  type KelasWithTingkat,
  type StudentMini,
} from "@/app/actions/akademik";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import {
  filterStudentMiniByQuery,
  type StudentMiniSort,
  sortStudentMini,
} from "@/lib/admin-list-utils";
import { Plus, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function AdminKedisiplinanPage() {
  const [kelasList, setKelasList] = useState<KelasWithTingkat[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [students, setStudents] = useState<StudentMini[]>([]);
  const [studentId, setStudentId] = useState("");
  const [semester, setSemester] = useState<DisciplineSemester>(1);

  const [hadir, setHadir] = useState("0");
  const [alpa, setAlpa] = useState("0");
  const [izin, setIzin] = useState("0");
  const [sakit, setSakit] = useState("0");

  const [poin, setPoin] = useState("10");
  const [deskripsi, setDeskripsi] = useState("");

  const [violations, setViolations] = useState<ViolationRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (
      studentId &&
      !studentsPick.some((s) => s.id === studentId)
    ) {
      setStudentId("");
    }
  }, [studentId, studentsPick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!studentId) {
        setHadir("0");
        setAlpa("0");
        setIzin("0");
        setSakit("0");
        setViolations([]);
        return;
      }
      const [attRes, violRes] = await Promise.all([
        getAttendanceForStudent(studentId, semester),
        getViolationsForStudent(studentId, semester),
      ]);
      if (cancelled) return;
      if (attRes.error) setLoadErr(attRes.error);
      else if (violRes.error) setLoadErr(violRes.error);
      else setLoadErr(null);

      if (attRes.row) {
        setHadir(String(attRes.row.hadir));
        setAlpa(String(attRes.row.alpa));
        setIzin(String(attRes.row.izin));
        setSakit(String(attRes.row.sakit));
      } else {
        setHadir("0");
        setAlpa("0");
        setIzin("0");
        setSakit("0");
      }
      setViolations(violRes.rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, semester]);



  return (
    <div className="min-h-screen bg-slate-50/80 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            Admin · Kedisiplinan
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Absensi & pelanggaran (Read-Only)
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Hanya Wali Kelas yang dapat mengedit absensi, dan hanya Guru BK yang dapat menginput pelanggaran. 
            Admin hanya dapat melihat rekapitulasi data.
          </p>
        </header>

        {loadErr && !loading ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            {loadErr}
          </div>
        ) : null}

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Kelas
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                value={semester}
                onChange={(e) =>
                  setSemester(Number(e.target.value) as DisciplineSemester)
                }
                disabled={!studentId}
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
          </div>
        </div>

        {studentId ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Rekap absensi
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-4">
                {[["Hadir", hadir], ["Alpa", alpa], ["Izin", izin], ["Sakit", sakit]].map(([label, val]) => (
                  <div key={label as string} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                    <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label as string}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{val}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Riwayat pelanggaran
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3 text-right">Poin</th>
                      <th className="px-4 py-3">Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {violations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                        >
                          Belum ada catatan pelanggaran.
                        </td>
                      </tr>
                    ) : (
                      violations.map((v, idx) => (
                        <tr key={v.id || `v-${idx}`} className="dark:hover:bg-slate-800/30">
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                            {v.created_at
                              ? new Date(v.created_at).toLocaleString("id-ID")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                            {v.poin}
                          </td>
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                            {v.deskripsi}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
