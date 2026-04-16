"use client";

import {
  getAttendanceForStudent,
  getViolationsForStudent,
  updateAbsensi,
  type DisciplineSemester,
  type ViolationRow,
} from "@/app/actions/kedisiplinan";
import { getKelasWithTingkat, listStudentsInKelas, type KelasWithTingkat, type StudentMini } from "@/app/actions/akademik";
import { getMyWaliKelas } from "@/app/actions/wali-kelas";
import { ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function WaliKelasKedisiplinanPage() {
  const [myKelas, setMyKelas] = useState<{ id: string; nama: string }[]>([]);
  const [allKelas, setAllKelas] = useState<KelasWithTingkat[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [students, setStudents] = useState<StudentMini[]>([]);
  const [studentId, setStudentId] = useState("");
  const [semester, setSemester] = useState<DisciplineSemester>(1);

  const [hadir, setHadir] = useState("0");
  const [alpa, setAlpa] = useState("0");
  const [izin, setIzin] = useState("0");
  const [sakit, setSakit] = useState("0");
  const [violations, setViolations] = useState<ViolationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingAbs, setSavingAbs] = useState(false);
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
    });
  }, [kelasId]);

  useEffect(() => {
    if (!studentId) {
      setHadir("0"); setAlpa("0"); setIzin("0"); setSakit("0"); setViolations([]);
      return;
    }
    setLoading(true);
    Promise.all([getAttendanceForStudent(studentId, semester), getViolationsForStudent(studentId, semester)])
      .then(([attRes, violRes]) => {
        if (attRes.error) setError(attRes.error);
        else if (violRes.error) setError(violRes.error);
        else setError(null);
        if (attRes.row) {
          setHadir(String(attRes.row.hadir));
          setAlpa(String(attRes.row.alpa));
          setIzin(String(attRes.row.izin));
          setSakit(String(attRes.row.sakit));
        } else {
          setHadir("0"); setAlpa("0"); setIzin("0"); setSakit("0");
        }
        setViolations(violRes.rows);
        setLoading(false);
      });
  }, [studentId, semester]);

  const filteredKelas = useMemo(
    () => allKelas.filter((k) => myKelas.some((m) => m.id === k.id)),
    [allKelas, myKelas]
  );

  async function handleSaveAbsensi() {
    if (!studentId) return;
    setSavingAbs(true);
    setToast(null);
    const { error: saveErr } = await updateAbsensi(
      studentId,
      semester,
      Number(hadir) || 0,
      Number(alpa) || 0,
      Number(izin) || 0,
      Number(sakit) || 0
    );
    setSavingAbs(false);
    if (saveErr) setToast(saveErr);
    else {
      setToast("Rekap absensi disimpan.");
      const attRes = await getAttendanceForStudent(studentId, semester);
      if (!attRes.error && attRes.row) {
        setHadir(String(attRes.row.hadir));
        setAlpa(String(attRes.row.alpa));
        setIzin(String(attRes.row.izin));
        setSakit(String(attRes.row.sakit));
      }
    }
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-4 w-4" />
            Wali Kelas · Kedisiplinan
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Absensi & Pelanggaran</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Data kedisiplinan siswa di kelas Anda (view-only).</p>
        </header>

        {toast ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
            {toast}
          </div>
        ) : null}
        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Kelas</label>
              <select value={kelasId} onChange={(e) => setKelasId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100">
                <option value="">— Pilih kelas —</option>
                {filteredKelas.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Siswa</label>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!kelasId}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100">
                <option value="">— Pilih siswa —</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.nama} ({s.nisn})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Semester</label>
              <select value={semester} onChange={(e) => setSemester(Number(e.target.value) as DisciplineSemester)} disabled={!studentId}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100">
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
          </div>
        </div>

        {studentId && !loading && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rekap Absensi</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Silakan rekap kehadiran siswa untuk semester ini.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Hadir</label>
                  <input type="number" min={0} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" value={hadir} onChange={(e) => setHadir(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Alpa</label>
                  <input type="number" min={0} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" value={alpa} onChange={(e) => setAlpa(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Izin</label>
                  <input type="number" min={0} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" value={izin} onChange={(e) => setIzin(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Sakit</label>
                  <input type="number" min={0} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" value={sakit} onChange={(e) => setSakit(e.target.value)} />
                </div>
              </div>
              <button type="button" disabled={savingAbs} onClick={() => void handleSaveAbsensi()} className="mt-4 h-10 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                {savingAbs ? "Menyimpan…" : "Simpan absensi"}
              </button>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Riwayat Pelanggaran</h2>
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3 text-right">Poin</th>
                    <th className="px-4 py-3">Deskripsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {violations.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Tidak ada catatan pelanggaran.</td></tr>
                  ) : violations.map((v, i) => (
                    <tr key={v.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {v.created_at ? new Date(v.created_at).toLocaleString("id-ID") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-rose-700 dark:text-rose-300">{v.poin}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{v.deskripsi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
