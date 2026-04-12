"use client";

import {
  adminDeleteStudent,
  adminUpsertStudent,
  getAdminStudents,
  getKelasList,
  type AdminStudentPayload,
  type KelasOption,
  type StudentRecord,
} from "@/app/actions/students";
import { ADMIN_SEMUA_KELAS } from "@/lib/admin-kelas-filter";
import {
  emptyProfileFormValues,
  ProfileFormSections,
  profileValuesFromRecord,
  type ProfileFormValues,
} from "@/components/students/ProfileFormSections";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import {
  filterStudentRecordByQuery,
  type StudentRecordSort,
  sortStudentRecords,
} from "@/lib/admin-list-utils";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Toast = { message: string; variant: "ok" | "err" };

export default function AdminStudentsPage() {
  const [rows, setRows] = useState<StudentRecord[]>([]);
  const [kelas, setKelas] = useState<KelasOption[]>([]);
  const [kelasFilter, setKelasFilter] = useState("");
  const [kelasLoaded, setKelasLoaded] = useState(false);
  const [kelasListError, setKelasListError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormValues>(emptyProfileFormValues());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);

  const [listQuery, setListQuery] = useState("");
  const [listSort, setListSort] = useState<StudentRecordSort>("nama-asc");

  const displayedRows = useMemo(() => {
    const f = filterStudentRecordByQuery(rows, listQuery);
    return sortStudentRecords(f, listSort);
  }, [rows, listQuery, listSort]);

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

  const fetchStudents = useCallback(async (filter: string) => {
    if (!filter) {
      setRows([]);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const stuRes = await getAdminStudents(filter);
    if (stuRes.error) {
      setLoadError(stuRes.error);
      setRows([]);
    } else {
      setLoadError(null);
      setRows(stuRes.students);
    }
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    await loadKelas();
    await fetchStudents(kelasFilter);
  }, [loadKelas, fetchStudents, kelasFilter]);

  useEffect(() => {
    void fetchStudents(kelasFilter);
  }, [kelasFilter, fetchStudents]);

  useEffect(() => {
    void loadKelas();
  }, [loadKelas]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const onField = useCallback((key: keyof ProfileFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyProfileFormValues());
    setModalOpen(true);
  }

  function openEdit(s: StudentRecord) {
    setEditingId(s.id);
    setForm(profileValuesFromRecord(s));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSaving(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const nisn = form.nisn.replace(/\D/g, "");
    if (nisn.length !== 10) {
      setToast({ message: "NISN harus 10 digit.", variant: "err" });
      return;
    }
    if (!form.nama.trim()) {
      setToast({ message: "Nama wajib diisi.", variant: "err" });
      return;
    }

    const payload: AdminStudentPayload = {
      id: editingId ?? undefined,
      nisn,
      nama: form.nama.trim(),
      jenis_kelamin: form.jenis_kelamin,
      kelas_id: form.kelas_id || null,
      tanggal_lahir: form.tanggal_lahir.trim() || null,
      nik: form.nik,
      tempat_lahir: form.tempat_lahir,
      agama: form.agama,
      alamat: form.alamat,
      no_hp: form.no_hp,
      email: form.email,
      nama_ayah: form.nama_ayah,
      pekerjaan_ayah: form.pekerjaan_ayah,
      nama_ibu: form.nama_ibu,
      pekerjaan_ibu: form.pekerjaan_ibu,
      no_hp_ortu: form.no_hp_ortu,
    };

    setSaving(true);
    const { error } = await adminUpsertStudent(payload);
    setSaving(false);
    if (error) {
      setToast({ message: error, variant: "err" });
      return;
    }
    setToast({
      message: editingId ? "Data siswa diperbarui." : "Siswa baru ditambahkan.",
      variant: "ok",
    });
    closeModal();
    void refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await adminDeleteStudent(deleteTarget.id);
    setDeleting(false);
    if (error) {
      setToast({ message: error, variant: "err" });
      return;
    }
    setToast({ message: "Siswa telah dihapus.", variant: "ok" });
    setDeleteTarget(null);
    void refresh();
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Users className="h-6 w-6" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-widest">
                Manajemen
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Data siswa
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
              Kelola data siswa per kelas. Secara default ditampilkan siswa di
              kelas pertama (urutan master); pilih kelas lain atau{" "}
              <strong>Semua kelas</strong> bila perlu daftar penuh (lebih berat
              untuk database).
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-900/25 transition hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Tambah siswa baru
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/50 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[12rem] flex-1">
            <label
              htmlFor="admin-siswa-kelas"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Tampilkan kelas
            </label>
            <select
              id="admin-siswa-kelas"
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              disabled={!kelasLoaded || Boolean(kelasListError) || kelas.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            >
              {kelas.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
              <option value={ADMIN_SEMUA_KELAS}>Semua kelas (tanpa filter)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => void fetchStudents(kelasFilter)}
            disabled={loading || !kelasFilter}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {loading ? "Memuat…" : "Muat ulang"}
          </button>
        </div>

        {toast ? (
          <div
            role="status"
            className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${
              toast.variant === "ok"
                ? "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100"
                : "border-rose-300/80 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100"
            }`}
          >
            {toast.message}
          </div>
        ) : null}

        {!kelasLoaded ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Memuat daftar kelas…
          </p>
        ) : kelasListError ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {kelasListError}
          </p>
        ) : kelas.length === 0 ? (
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
          >
            Belum ada kelas di master. Tambahkan kelas terlebih dahulu agar
            daftar siswa bisa difilter.
          </div>
        ) : loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Memuat daftar siswa…
          </p>
        ) : loadError ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {loadError}
          </p>
        ) : (
          <div className="space-y-4">
            <AdminListToolbar
              query={listQuery}
              onQueryChange={setListQuery}
              queryPlaceholder="Cari nama, NISN, atau kelas…"
              sortValue={listSort}
              onSortChange={(v) => setListSort(v as StudentRecordSort)}
              sortOptions={[
                { value: "nama-asc", label: "Nama A → Z" },
                { value: "nama-desc", label: "Nama Z → A" },
                { value: "kelas-asc", label: "Kelas A → Z" },
                { value: "nisn-asc", label: "NISN terkecil" },
              ]}
              shown={displayedRows.length}
              total={rows.length}
            />
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-900/5 dark:border-slate-700/80 dark:bg-slate-900/60 dark:shadow-black/40">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
                <thead className="bg-slate-50/90 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                      NISN
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                      Nama
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                      L/P
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                      Kelas
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                      No. HP
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        {rows.length === 0
                          ? "Belum ada data siswa."
                          : "Tidak ada yang cocok dengan pencarian. Ubah kata kunci atau kosongkan kolom cari."}
                      </td>
                    </tr>
                  ) : null}
                  {displayedRows.map((s) => (
                    <tr
                      key={s.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">
                        {s.nisn}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {s.nama}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                        {s.jenis_kelamin === "P" ? "P" : "L"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {s.kelas_nama ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                        {s.no_hp ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="mr-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800 shadow-sm transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/70"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !saving && closeModal()}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <h2 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">
              {editingId ? "Edit siswa" : "Tambah siswa baru"}
            </h2>
            <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">
              Lengkapi formulir di bawah. Tanggal lahir memakai format YYYY-MM-DD
              (untuk login portal siswa).
            </p>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <ProfileFormSections
                values={form}
                onChange={onField}
                kelasOptions={kelas}
              />
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 min-w-[120px] rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Hapus siswa?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Data <strong>{deleteTarget.nama}</strong> (NISN {deleteTarget.nisn})
              akan dihapus permanen. Rekaman terkait bisa gagal jika ada
              pembatasan foreign key.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {deleting ? "Menghapus…" : "Ya, hapus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
