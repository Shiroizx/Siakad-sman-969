"use client";

import { getStudentArsipOverview } from "@/app/actions/arsip";
import {
  getAdminStudents,
  getKelasList,
  type KelasOption,
  type StudentRecord,
} from "@/app/actions/students";
import { ADMIN_SEMUA_KELAS } from "@/lib/admin-kelas-filter";
import { ArsipBlocksView } from "@/components/arsip/ArsipBlocksView";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import {
  filterStudentRecordByQuery,
  type StudentRecordSort,
  sortStudentRecords,
} from "@/lib/admin-list-utils";
import { Archive, UserSearch } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function AdminArsipPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [kelas, setKelas] = useState<KelasOption[]>([]);
  const [kelasFilter, setKelasFilter] = useState("");
  const [kelasLoaded, setKelasLoaded] = useState(false);
  const [kelasListError, setKelasListError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [siswaNama, setSiswaNama] = useState<string | null>(null);
  const [siswaNisn, setSiswaNisn] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<
    Awaited<ReturnType<typeof getStudentArsipOverview>>["blocks"]
  >([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [arsipErr, setArsipErr] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingArsip, setLoadingArsip] = useState(false);

  const [listQuery, setListQuery] = useState("");
  const [listSort, setListSort] = useState<StudentRecordSort>("nama-asc");

  const pickStudents = useMemo(() => {
    const f = filterStudentRecordByQuery(students, listQuery);
    return sortStudentRecords(f, listSort);
  }, [students, listQuery, listSort]);

  const selectedStillVisible =
    !studentId || pickStudents.some((s) => s.id === studentId);

  const loadKelas = useCallback(async () => {
    const kelRes = await getKelasList();
    setKelasLoaded(true);
    if (kelRes.error) {
      setKelasListError(kelRes.error);
      setKelas([]);
    } else {
      setKelasListError(null);
      setKelas(kelRes.rows);
      setKelasFilter((prev) => prev || kelRes.rows[0]?.id || "");
    }
  }, []);

  const loadStudentList = useCallback(async (filter: string) => {
    if (!filter) {
      setStudents([]);
      setLoadErr(null);
      return;
    }
    setLoadingList(true);
    setLoadErr(null);
    const res = await getAdminStudents(filter);
    if (res.error) {
      setLoadErr(res.error);
      setStudents([]);
    } else {
      setLoadErr(null);
      setStudents(res.students);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    void loadKelas();
  }, [loadKelas]);

  useEffect(() => {
    void loadStudentList(kelasFilter);
  }, [kelasFilter, loadStudentList]);

  useEffect(() => {
    if (!studentId) {
      setBlocks([]);
      setSiswaNama(null);
      setSiswaNisn(null);
      setArsipErr(null);
      return;
    }
    let c = false;
    (async () => {
      setLoadingArsip(true);
      const res = await getStudentArsipOverview(studentId);
      if (c) return;
      setLoadingArsip(false);
      if (res.error) {
        setArsipErr(res.error);
        setBlocks([]);
        setSiswaNama(null);
        setSiswaNisn(null);
      } else {
        setArsipErr(null);
        setBlocks(res.blocks);
        setSiswaNama(res.siswaNama);
        setSiswaNisn(res.siswaNisn);
      }
    })();
    return () => {
      c = true;
    };
  }, [studentId]);

  useEffect(() => {
    if (studentId && !selectedStillVisible) {
      setStudentId("");
    }
  }, [studentId, selectedStillVisible]);

  return (
    <div className="min-h-screen bg-slate-50/80 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Archive className="h-4 w-4" aria-hidden />
            Admin · Arsip siswa
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Arsip per siswa
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Pilih siswa untuk melihat gabungan arsip: nilai per semester, rekap
            absensi, pelanggaran, dan riwayat kelas per tahun ajaran. Daftar
            difilter per kelas (default kelas pertama); gunakan{" "}
            <strong>Semua kelas</strong> bila perlu memilih dari seluruh siswa.
          </p>
        </header>

        {loadErr && !loadingList ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          >
            {loadErr}
          </div>
        ) : null}
        {arsipErr && studentId ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          >
            {arsipErr}
          </div>
        ) : null}

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {!kelasLoaded ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Memuat daftar kelas…
            </p>
          ) : kelasListError ? (
            <p
              role="alert"
              className="text-sm text-rose-700 dark:text-rose-300"
            >
              {kelasListError}
            </p>
          ) : kelas.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Belum ada kelas di master. Tambahkan kelas agar daftar siswa bisa
              difilter.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="min-w-[12rem] flex-1">
                  <label
                    htmlFor="admin-arsip-kelas"
                    className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400"
                  >
                    Kelas
                  </label>
                  <select
                    id="admin-arsip-kelas"
                    value={kelasFilter}
                    onChange={(e) => setKelasFilter(e.target.value)}
                    disabled={loadingList}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {kelas.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label}
                      </option>
                    ))}
                    <option value={ADMIN_SEMUA_KELAS}>
                      Semua kelas (tanpa filter)
                    </option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void loadStudentList(kelasFilter)}
                  disabled={loadingList || !kelasFilter}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {loadingList ? "Memuat…" : "Muat ulang daftar"}
                </button>
              </div>
              <AdminListToolbar
                query={listQuery}
                onQueryChange={setListQuery}
                queryPlaceholder="Saring daftar: nama, NISN, atau kelas…"
                sortValue={listSort}
                onSortChange={(v) => setListSort(v as StudentRecordSort)}
                sortOptions={[
                  { value: "nama-asc", label: "Nama A → Z" },
                  { value: "nama-desc", label: "Nama Z → A" },
                  { value: "kelas-asc", label: "Kelas A → Z" },
                  { value: "nisn-asc", label: "NISN terkecil" },
                ]}
                shown={pickStudents.length}
                total={students.length}
              />
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                <UserSearch className="h-4 w-4" aria-hidden />
                Siswa
              </label>
              <select
                className="w-full max-w-xl rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={loadingList}
              >
                <option value="">— Pilih siswa —</option>
                {pickStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.nisn})
                    {s.kelas_nama ? ` · ${s.kelas_nama}` : ""}
                  </option>
                ))}
              </select>
            </>
          )}
          {studentId && siswaNama ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Menampilkan arsip untuk{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                {siswaNama}
              </strong>
              {siswaNisn ? ` (NISN ${siswaNisn})` : null}.
            </p>
          ) : null}
        </div>

        {!kelasLoaded || kelasListError || kelas.length === 0 ? null : !studentId ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pilih seorang siswa untuk memuat arsip.
          </p>
        ) : loadingArsip ? (
          <p className="text-sm text-slate-500">Memuat arsip…</p>
        ) : (
          <ArsipBlocksView blocks={blocks} />
        )}
      </div>
    </div>
  );
}
