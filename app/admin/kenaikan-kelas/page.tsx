"use client";

import {
  listAcademicYearsAdmin,
  type AcademicYearRow,
} from "@/app/actions/academic-years";
import {
  getKelasWithTingkat,
  listStudentsInKelas,
  type KelasWithTingkat,
  type StudentMini,
} from "@/app/actions/akademik";
import {
  bulkPromoteClass,
  manualPromoteStudent,
  type ClassPromotionStatus,
} from "@/app/actions/promotion";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import {
  filterStudentMiniByQuery,
  type StudentMiniSort,
  sortStudentMini,
} from "@/lib/admin-list-utils";
import { AlertTriangle, ArrowRight, School, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Mode = "bulk" | "manual";

export default function AdminKenaikanKelasPage() {
  const [mode, setMode] = useState<Mode>("bulk");
  const [years, setYears] = useState<AcademicYearRow[]>([]);
  const [kelasList, setKelasList] = useState<KelasWithTingkat[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [bulkFrom, setBulkFrom] = useState("");
  const [bulkTo, setBulkTo] = useState("");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [bulkToast, setBulkToast] = useState<string | null>(null);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);

  const [manualKelasId, setManualKelasId] = useState("");
  const [manualStudents, setManualStudents] = useState<StudentMini[]>([]);
  const [manualChoice, setManualChoice] = useState<Record<string, string>>({});
  const [manualWorkingId, setManualWorkingId] = useState<string | null>(null);
  const [manualToast, setManualToast] = useState<string | null>(null);

  const [manualQuery, setManualQuery] = useState("");
  const [manualSort, setManualSort] = useState<StudentMiniSort>("nama-asc");

  const manualPick = useMemo(() => {
    const f = filterStudentMiniByQuery(manualStudents, manualQuery);
    return sortStudentMini(f, manualSort);
  }, [manualStudents, manualQuery, manualSort]);

  useEffect(() => {
    let c = false;
    (async () => {
      const [yRes, kRes] = await Promise.all([
        listAcademicYearsAdmin(),
        getKelasWithTingkat(),
      ]);
      if (c) return;
      setLoading(false);
      if (yRes.error || kRes.error) {
        setLoadErr(yRes.error ?? kRes.error);
        return;
      }
      setYears(yRes.rows);
      setKelasList(kRes.rows);
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!manualKelasId) {
        setManualStudents([]);
        setManualChoice({});
        return;
      }
      const { students, error } = await listStudentsInKelas(manualKelasId);
      if (cancelled) return;
      if (error) {
        setLoadErr(error);
        setManualStudents([]);
        return;
      }
      setManualStudents(students);
      setManualChoice({});
    })();
    return () => {
      cancelled = true;
    };
  }, [manualKelasId]);

  useEffect(() => {
    setManualQuery("");
    setManualSort("nama-asc");
  }, [manualKelasId]);

  const fromNama = useMemo(
    () => kelasList.find((k) => k.id === bulkFrom)?.nama ?? "—",
    [kelasList, bulkFrom]
  );
  const toNama = useMemo(
    () => kelasList.find((k) => k.id === bulkTo)?.nama ?? "—",
    [kelasList, bulkTo]
  );
  const activeYearLabel = useMemo(() => {
    const a = years.find((y) => y.is_active);
    return a?.nama ?? years[0]?.nama ?? "—";
  }, [years]);

  const runBulk = useCallback(async () => {
    if (!bulkFrom || !bulkTo) return;
    setBulkWorking(true);
    setBulkToast(null);
    const { moved, error } = await bulkPromoteClass(bulkFrom, bulkTo);
    setBulkWorking(false);
    setConfirmBulkOpen(false);
    if (error) setBulkToast(error);
    else setBulkToast(`Berhasil memproses ${moved} siswa.`);
  }, [bulkFrom, bulkTo]);

  async function applyManual(studentId: string) {
    const raw = manualChoice[studentId] ?? "";
    if (!raw || !manualKelasId) {
      setManualToast("Pilih tindakan untuk siswa ini terlebih dahulu.");
      return;
    }
    let targetKelasId: string;
    let status: ClassPromotionStatus;
    if (raw === "__tinggal__") {
      targetKelasId = manualKelasId;
      status = "tinggal_kelas";
    } else {
      targetKelasId = raw;
      status = "naik_kelas";
    }
    setManualWorkingId(studentId);
    setManualToast(null);
    const { error } = await manualPromoteStudent(studentId, targetKelasId, status);
    setManualWorkingId(null);
    if (error) {
      setManualToast(error);
      return;
    }
    setManualToast("Perubahan disimpan.");
    const { students, error: se } = await listStudentsInKelas(manualKelasId);
    if (!se) {
      setManualStudents(students);
      setManualChoice((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/80 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <School className="h-4 w-4" aria-hidden />
            Admin · Kenaikan kelas
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Kenaikan kelas
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Pindahkan siswa massal atau satu per satu. Riwayat otomatis memakai{" "}
            <strong>tahun ajaran aktif</strong>; saat naik kelas atau lulus, nilai
            &amp; absensi &amp; pelanggaran tahun aktif dipindah ke arsip sistem
            (tanpa pilih manual).
          </p>
        </header>

        {loadErr && !loading ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          >
            {loadErr}
          </div>
        ) : null}

        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="flex items-start gap-2 font-medium">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Pastikan migrasi{" "}
              <strong>migration_academic_years_archive.sql</strong> dan{" "}
              <strong>migration_violation_academic_year.sql</strong> sudah dijalankan.
              Saat <strong>naik kelas</strong> atau <strong>lulus</strong>, data tahun
              aktif otomatis diarsipkan ke bucket{" "}
              <em>Arsip otomatis (setelah kenaikan kelas)</em>.{" "}
              <strong>Tinggal kelas</strong> tidak memindahkan arsip.
            </span>
          </p>
        </div>

        {!loading && years.length > 0 ? (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/90 px-4 py-3 text-sm text-indigo-950 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-100">
            <strong>Tahun ajaran aktif:</strong> {activeYearLabel}
            <span className="block mt-1 text-indigo-800/90 dark:text-indigo-200/90">
              Semua kenaikan memakai tahun ini untuk riwayat; arsip mengikuti aturan
              sistem.
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {(
            [
              ["bulk", "Mode massal"],
              ["manual", "Mode manual"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                mode === key
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "bulk" ? (
          <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Kenaikan massal
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Kelas asal
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  value={bulkFrom}
                  onChange={(e) => setBulkFrom(e.target.value)}
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
                  Kelas tujuan
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  value={bulkTo}
                  onChange={(e) => setBulkTo(e.target.value)}
                >
                  <option value="">— Pilih kelas —</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={
                  !bulkFrom || !bulkTo || bulkFrom === bulkTo || bulkWorking
                }
                onClick={() => setConfirmBulkOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50"
              >
                <ArrowRight className="h-4 w-4" aria-hidden />
                Proses kenaikan kelas
              </button>
              {bulkToast ? (
                <p
                  className={`text-sm ${
                    bulkToast.startsWith("Berhasil")
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {bulkToast}
                </p>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Penempatan per siswa
            </h2>
            <div className="max-w-md">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Kelas (tampilkan siswa)
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                value={manualKelasId}
                onChange={(e) => setManualKelasId(e.target.value)}
              >
                <option value="">— Pilih kelas —</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            {manualToast ? (
              <p
                className={`text-sm ${
                  manualToast === "Perubahan disimpan."
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300"
                }`}
              >
                {manualToast}
              </p>
            ) : null}
            {manualKelasId && manualStudents.length === 0 ? (
              <p className="text-sm text-slate-500">Tidak ada siswa di kelas ini.</p>
            ) : null}
            {manualStudents.length > 0 ? (
              <div className="space-y-4">
                <AdminListToolbar
                  query={manualQuery}
                  onQueryChange={setManualQuery}
                  queryPlaceholder="Cari nama atau NISN di tabel ini…"
                  sortValue={manualSort}
                  onSortChange={(v) => setManualSort(v as StudentMiniSort)}
                  sortOptions={[
                    { value: "nama-asc", label: "Nama A → Z" },
                    { value: "nama-desc", label: "Nama Z → A" },
                    { value: "nisn-asc", label: "NISN terkecil" },
                  ]}
                  shown={manualPick.length}
                  total={manualStudents.length}
                />
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                      <th className="px-4 py-3">Siswa</th>
                      <th className="px-4 py-3">NISN</th>
                      <th className="px-4 py-3">Tindakan</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {manualPick.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                        >
                          Tidak ada siswa yang cocok dengan pencarian.
                        </td>
                      </tr>
                    ) : null}
                    {manualPick.map((s) => (
                      <tr key={s.id} className="dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          <span className="inline-flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-slate-400" aria-hidden />
                            {s.nama}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {s.nisn}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="w-full min-w-[200px] rounded-lg border border-slate-200 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                            value={manualChoice[s.id] ?? ""}
                            onChange={(e) =>
                              setManualChoice((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">— Pilih —</option>
                            <option value="__tinggal__">Tinggal kelas</option>
                            {kelasList
                              .filter((k) => k.id !== manualKelasId)
                              .map((k) => (
                                <option key={k.id} value={k.id}>
                                  Naik / pindah ke {k.label}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={manualWorkingId === s.id}
                            onClick={() => void applyManual(s.id)}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                          >
                            {manualWorkingId === s.id ? "Menyimpan…" : "Terapkan"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            ) : null}
          </section>
        )}
      </div>

      {confirmBulkOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-confirm-title"
        >
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3
              id="bulk-confirm-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Konfirmasi kenaikan massal
            </h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Semua siswa di kelas <strong>{fromNama}</strong> akan dipindahkan ke{" "}
              <strong>{toNama}</strong>. Riwayat memakai tahun ajaran aktif (
              <strong>{activeYearLabel}</strong>); bila status naik/lulus, data tahun
              aktif diarsipkan otomatis. Lanjutkan?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => setConfirmBulkOpen(false)}
                disabled={bulkWorking}
              >
                Batal
              </button>
              <button
                type="button"
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                onClick={() => void runBulk()}
                disabled={bulkWorking}
              >
                {bulkWorking ? "Memproses…" : "Ya, proses"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
