"use client";

import { getStudentAlumniArsipOverview } from "@/app/actions/arsip";
import {
  getAdminAlumniStudents,
  listAlumniAngkatanOptions,
  listAlumniRombelLulusOptions,
  type StudentRecord,
} from "@/app/actions/students";
import { ArsipBlocksView } from "@/components/arsip/ArsipBlocksView";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import {
  filterStudentRecordByQuery,
  type StudentRecordSort,
  sortStudentRecords,
} from "@/lib/admin-list-utils";
import { Archive, GraduationCap, UserSearch } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function AdminArsipAlumniPage() {
  const [angkatanList, setAngkatanList] = useState<number[]>([]);
  const [angkatan, setAngkatan] = useState<number | "">("");
  const [rombelList, setRombelList] = useState<{ id: string; nama: string }[]>([]);
  const [rombelLulusId, setRombelLulusId] = useState("");
  const [loadingRombel, setLoadingRombel] = useState(false);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentId, setStudentId] = useState("");
  const [siswaNama, setSiswaNama] = useState<string | null>(null);
  const [siswaNisn, setSiswaNisn] = useState<string | null>(null);
  const [angkatanSiswa, setAngkatanSiswa] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<
    Awaited<ReturnType<typeof getStudentAlumniArsipOverview>>["blocks"]
  >([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [arsipErr, setArsipErr] = useState<string | null>(null);
  const [loadingAngkatan, setLoadingAngkatan] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingArsip, setLoadingArsip] = useState(false);

  const [listQuery, setListQuery] = useState("");
  const [listSort, setListSort] = useState<StudentRecordSort>("nama-asc");

  const pickStudents = useMemo(() => {
    const f = filterStudentRecordByQuery(students, listQuery);
    return sortStudentRecords(f, listSort);
  }, [students, listQuery, listSort]);

  const loadAngkatan = useCallback(async () => {
    setLoadingAngkatan(true);
    setLoadErr(null);
    const res = await listAlumniAngkatanOptions();
    setLoadingAngkatan(false);
    if (res.error) {
      setLoadErr(res.error);
      setAngkatanList([]);
      return;
    }
    setAngkatanList(res.angkatan);
    setAngkatan((prev) => {
      if (res.angkatan.length === 0) return "";
      if (prev !== "" && res.angkatan.includes(prev)) return prev;
      return res.angkatan[0];
    });
  }, []);

  useEffect(() => {
    void loadAngkatan();
  }, [loadAngkatan]);

  const loadRombel = useCallback(async (a: number) => {
    setLoadingRombel(true);
    setLoadErr(null);
    const res = await listAlumniRombelLulusOptions(a);
    setLoadingRombel(false);
    if (res.error) {
      setLoadErr(res.error);
      setRombelList([]);
      return;
    }
    setRombelList(res.rombel);
  }, []);

  const loadStudents = useCallback(async (a: number, rombelId: string) => {
    setLoadingList(true);
    setLoadErr(null);
    const res = await getAdminAlumniStudents(
      a,
      rombelId.trim() ? rombelId.trim() : undefined
    );
    setLoadingList(false);
    if (res.error) {
      setLoadErr(res.error);
      setStudents([]);
      return;
    }
    setStudents(res.students);
  }, []);

  useEffect(() => {
    if (typeof angkatan !== "number") {
      setRombelList([]);
      setRombelLulusId("");
      setStudents([]);
      return;
    }
    void loadRombel(angkatan);
  }, [angkatan, loadRombel]);

  useEffect(() => {
    if (typeof angkatan !== "number") {
      setStudents([]);
      return;
    }
    void loadStudents(angkatan, rombelLulusId);
  }, [angkatan, rombelLulusId, loadStudents]);

  useEffect(() => {
    if (!studentId) {
      setBlocks([]);
      setSiswaNama(null);
      setSiswaNisn(null);
      setAngkatanSiswa(null);
      setArsipErr(null);
      return;
    }
    let c = false;
    (async () => {
      setLoadingArsip(true);
      const res = await getStudentAlumniArsipOverview(studentId);
      if (c) return;
      setLoadingArsip(false);
      if (res.error) {
        setArsipErr(res.error);
        setBlocks([]);
        setSiswaNama(null);
        setSiswaNisn(null);
        setAngkatanSiswa(null);
      } else {
        setArsipErr(null);
        setBlocks(res.blocks);
        setSiswaNama(res.siswaNama);
        setSiswaNisn(res.siswaNisn);
        setAngkatanSiswa(res.angkatanLulus);
      }
    })();
    return () => {
      c = true;
    };
  }, [studentId]);

  return (
    <div className="min-h-screen bg-slate-50/80 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <GraduationCap className="h-4 w-4" aria-hidden />
            Admin · Arsip alumni
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Arsip alumni
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Pilih angkatan dan rombel kelas XII saat lulus (opsional), lalu alumni.
            Arsip menampilkan seluruh tahun ajaran terkait siswa (kelas X–XII serta
            blok <strong>Alumni · Angkatan …</strong> hasil kelulusan massal).
          </p>
        </header>

        {loadErr && !loadingAngkatan ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          >
            {loadErr}
          </div>
        ) : null}

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[10rem]">
              <label
                htmlFor="arsip-alumni-angkatan"
                className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400"
              >
                Angkatan
              </label>
              <select
                id="arsip-alumni-angkatan"
                value={angkatan === "" ? "" : String(angkatan)}
                onChange={(e) => {
                  const v = e.target.value;
                  setStudentId("");
                  setRombelLulusId("");
                  setAngkatan(v === "" ? "" : Number(v));
                }}
                disabled={loadingAngkatan || angkatanList.length === 0}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              >
                {angkatanList.length === 0 ? (
                  <option value="">— Belum ada alumni —</option>
                ) : (
                  angkatanList.map((y) => (
                    <option key={y} value={y}>
                      Angkatan {y}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="min-w-[12rem] max-w-xs flex-1">
              <label
                htmlFor="arsip-alumni-rombel"
                className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400"
              >
                Rombel XII (lulus)
              </label>
              <select
                id="arsip-alumni-rombel"
                value={rombelLulusId}
                onChange={(e) => {
                  setStudentId("");
                  setRombelLulusId(e.target.value);
                }}
                disabled={
                  loadingAngkatan ||
                  loadingRombel ||
                  typeof angkatan !== "number" ||
                  angkatanList.length === 0
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Semua rombel</option>
                {rombelList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nama}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void loadAngkatan()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Muat ulang angkatan
            </button>
          </div>

          {loadingAngkatan ? (
            <p className="text-sm text-slate-500">Memuat…</p>
          ) : angkatanList.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Belum ada data alumni. Gunakan menu <strong>Kelulusan</strong> untuk
              memproses rombel kelas XII.
            </p>
          ) : typeof angkatan === "number" ? (
            <>
              <AdminListToolbar
                query={listQuery}
                onQueryChange={setListQuery}
                queryPlaceholder="Saring: nama atau NISN…"
                sortValue={listSort}
                onSortChange={(v) => setListSort(v as StudentRecordSort)}
                sortOptions={[
                  { value: "nama-asc", label: "Nama A → Z" },
                  { value: "nama-desc", label: "Nama Z → A" },
                  { value: "nisn-asc", label: "NISN terkecil" },
                ]}
                shown={pickStudents.length}
                total={students.length}
              />
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                <UserSearch className="h-4 w-4" aria-hidden />
                Alumni
              </label>
              <select
                className="w-full max-w-xl rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={loadingList}
              >
                <option value="">— Pilih alumni —</option>
                {pickStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.nisn})
                  </option>
                ))}
              </select>
            </>
          ) : null}

          {studentId && siswaNama ? (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Archive className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
              <span>
                Arsip lengkap untuk{" "}
                <strong className="text-slate-900 dark:text-slate-100">{siswaNama}</strong>
                {siswaNisn ? ` (NISN ${siswaNisn})` : null}
                {angkatanSiswa != null ? (
                  <span className="ml-1 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-100">
                    Angkatan {angkatanSiswa}
                  </span>
                ) : null}
                .
              </span>
            </p>
          ) : null}
        </div>

        {arsipErr && studentId ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          >
            {arsipErr}
          </div>
        ) : null}

        {!studentId ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pilih angkatan dan seorang alumni untuk memuat arsip (kelas X–XII dan
            kelulusan).
          </p>
        ) : loadingArsip ? (
          <p className="text-sm text-slate-500">Memuat arsip…</p>
        ) : blocks.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tidak ada data arsip untuk siswa ini (belum ada nilai / kehadiran /
            pelanggaran / riwayat kelas yang terikat tahun ajaran).
          </p>
        ) : (
          <ArsipBlocksView blocks={blocks} />
        )}
      </div>
    </div>
  );
}
