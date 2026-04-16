"use client";

import { getKelasWithTingkat, listStudentsInKelas, type KelasWithTingkat, type StudentMini } from "@/app/actions/akademik";
import { getAttendanceForStudent, getViolationsForStudent, addPelanggaran, type AttendanceSummary, type ViolationRow } from "@/app/actions/kedisiplinan";
import { ShieldAlert, Plus } from "lucide-react";
import { useEffect, useState } from "react";

export default function GuruBkKedisiplinanPage() {
  const [kelasList, setKelasList] = useState<KelasWithTingkat[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [students, setStudents] = useState<StudentMini[]>([]);
  const [studentId, setStudentId] = useState("");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [violations, setViolations] = useState<ViolationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savingViol, setSavingViol] = useState(false);
  const [poin, setPoin] = useState("10");
  const [deskripsi, setDeskripsi] = useState("");

  useEffect(() => {
    getKelasWithTingkat().then(({ rows }) => setKelasList(rows));
  }, []);

  useEffect(() => {
    if (!kelasId) { setStudents([]); setStudentId(""); return; }
    listStudentsInKelas(kelasId).then(({ students: s }) => {
      setStudents(s);
      setStudentId("");
      setAttendance(null);
      setViolations([]);
    });
  }, [kelasId]);

  useEffect(() => {
    if (!studentId) { setAttendance(null); setViolations([]); return; }
    setLoading(true);
    Promise.all([
      getAttendanceForStudent(studentId, semester),
      getViolationsForStudent(studentId, semester),
    ]).then(([att, viol]) => {
      setAttendance(att.row);
      setViolations(viol.rows);
      setError(att.error || viol.error);
      setLoading(false);
    });
  }, [studentId, semester]);

  async function handleAddPelanggaran() {
    if (!studentId) return;
    setSavingViol(true);
    setToast(null);
    const { error: err } = await addPelanggaran(
      studentId,
      semester,
      Number(poin) || 0,
      deskripsi
    );
    setSavingViol(false);
    if (err) setToast(err);
    else {
      setToast("Pelanggaran dicatat.");
      setDeskripsi("");
      const violRes = await getViolationsForStudent(studentId, semester);
      if (!violRes.error) setViolations(violRes.rows);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            Guru BK · Kedisiplinan
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Kedisiplinan Siswa
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Guru BK dapat mencatat dan melihat poin pelanggaran, serta melihat absensi kehadiran (Hadir/Alpa/Sakit/Izin) yang direkap oleh Wali Kelas.
          </p>
        </header>

        {toast ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
            {toast}
          </div>
        ) : null}
        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Kelas</label>
              <select value={kelasId} onChange={(e) => setKelasId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100">
                <option value="">— Pilih kelas —</option>
                {kelasList.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Siswa</label>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!kelasId} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100">
                <option value="">— Pilih siswa —</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.nama} ({s.nisn})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Semester</label>
              <select value={semester} onChange={(e) => setSemester(Number(e.target.value) as 1 | 2)} disabled={!studentId} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100">
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Memuat…</p>
        ) : studentId ? (
          <div className="space-y-6">
            {/* Absensi */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Absensi</h2>
              </div>
              {attendance ? (
                <div className="grid grid-cols-4 gap-4 p-4">
                  {[
                    { label: "Hadir", value: attendance.hadir, color: "text-emerald-600" },
                    { label: "Alpa", value: attendance.alpa, color: "text-rose-600" },
                    { label: "Izin", value: attendance.izin, color: "text-amber-600" },
                    { label: "Sakit", value: attendance.sakit, color: "text-blue-600" },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                      <p className={`mt-1 text-2xl font-bold tabular-nums ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Belum ada data absensi.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Tambah pelanggaran
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Poin
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                    value={poin}
                    onChange={(e) => setPoin(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Deskripsi
                  </label>
                  <textarea
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    placeholder="Contoh: Terlambat masuk sekolah tanpa keterangan"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={savingViol}
                onClick={() => void handleAddPelanggaran()}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {savingViol ? "Menyimpan…" : "Catat pelanggaran"}
              </button>
            </div>

            {/* Pelanggaran List */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Riwayat Pelanggaran</h2>
              </div>
              {violations.length > 0 ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                      <th className="px-4 py-3 text-left">Deskripsi</th>
                      <th className="px-4 py-3 text-right">Poin</th>
                      <th className="px-4 py-3 text-right">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {violations.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{v.deskripsi}</td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600 tabular-nums">{v.poin}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500">{v.created_at ? new Date(v.created_at).toLocaleDateString("id-ID") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Belum ada catatan pelanggaran.</p>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
