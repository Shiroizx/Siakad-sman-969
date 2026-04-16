"use client";

import {
  adminDeleteKelas,
  adminUpsertKelas,
  getAdminKelas,
  type AdminKelasPayload,
  type AdminKelasRecord,
} from "@/app/actions/kelas";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";

import { Pencil, Plus, Trash2, School } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Toast = { message: string; variant: "ok" | "err" };

export default function AdminKelasPage() {
  const [rows, setRows] = useState<AdminKelasRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [tingkat, setTingkat] = useState<number>(10);
  const [jurusan, setJurusan] = useState<"bahasa" | "mipa" | "ips" | "lainnya">("mipa");
  const [rombel, setRombel] = useState<number>(1);
  const [kapasitas, setKapasitas] = useState<number>(35);

  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminKelasRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);

  const [listQuery, setListQuery] = useState("");
  // fallback if AdminListToolbar requires a string type
  const [listSort, setListSort] = useState<string>("nama-asc");

  const displayedRows = useMemo(() => {
    let filtered = rows;
    if (listQuery.trim()) {
      const q = listQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.nama.toLowerCase().includes(q) ||
          r.jurusan.toLowerCase().includes(q) ||
          String(r.tingkat).includes(q) ||
          (r.wali_kelas_nama || "").toLowerCase().includes(q)
      );
    }
    
    // Sort logic
    return filtered.sort((a, b) => {
      if (listSort === "nama-asc") return a.nama.localeCompare(b.nama);
      if (listSort === "nama-desc") return b.nama.localeCompare(a.nama);
      if (listSort === "kapasitas-asc") return a.kapasitas_max - b.kapasitas_max;
      if (listSort === "kapasitas-desc") return b.kapasitas_max - a.kapasitas_max;
      return 0;
    });
  }, [rows, listQuery, listSort]);

  const fetchKelas = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { rows: dataRows, error } = await getAdminKelas();
    if (error) {
      setLoadError(error);
      setRows([]);
    } else {
      setRows(dataRows);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchKelas();
  }, [fetchKelas]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  function openCreate() {
    setEditingId(null);
    setTingkat(10);
    setJurusan("mipa");
    setRombel(1);
    setKapasitas(35);
    setModalOpen(true);
  }

  function openEdit(r: AdminKelasRecord) {
    setEditingId(r.id);
    setTingkat(r.tingkat);
    // fallback if somehow value isn't standard
    setJurusan(
      ["bahasa", "mipa", "ips", "lainnya"].includes(r.jurusan) 
        ? r.jurusan as "bahasa"|"mipa"|"ips"|"lainnya" 
        : "lainnya"
    );
    setRombel(r.rombel || 1);
    setKapasitas(r.kapasitas_max);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSaving(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (rombel < 1) {
      setToast({ message: "Nomor rombel harus ≥ 1", variant: "err" });
      return;
    }
    if (kapasitas < 1) {
      setToast({ message: "Kapasitas harus ≥ 1", variant: "err" });
      return;
    }

    const payload: AdminKelasPayload = {
      id: editingId ?? undefined,
      tingkat,
      jurusan,
      rombel,
      kapasitas_max: kapasitas,
    };

    setSaving(true);
    const { error } = await adminUpsertKelas(payload);
    setSaving(false);
    if (error) {
      setToast({ message: error, variant: "err" });
      return;
    }
    setToast({
      message: editingId ? "Data kelas diperbarui." : "Kelas baru ditambahkan.",
      variant: "ok",
    });
    closeModal();
    void fetchKelas();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await adminDeleteKelas(deleteTarget.id);
    setDeleting(false);
    if (error) {
      setToast({ message: error, variant: "err" });
      return;
    }
    setToast({ message: "Kelas telah dihapus.", variant: "ok" });
    setDeleteTarget(null);
    void fetchKelas();
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <School className="h-6 w-6" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-widest">
                Manajemen
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sistem Kelas & Rombel
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
              Kelola master data kelas dan rombongan belajar. Nama kelas akan di-generate 
              secara otomatis sesuai kombinasi Tingkat, Jurusan, dan Rombel (contoh: X MIPA 1).
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={() => void fetchKelas()}
              disabled={loading}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm border border-slate-300 transition hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
            >
              {loading ? "Memuat..." : "Muat Ulang"}
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-900/25 transition hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Tambah Kelas
            </button>
          </div>
        </div>

        {toast && (
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
        )}

        {loadError ? (
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
              queryPlaceholder="Cari nama kelas atau tingkat..."
              sortValue={listSort}
              onSortChange={setListSort}
              sortOptions={[
                { value: "nama-asc", label: "Nama A → Z" },
                { value: "nama-desc", label: "Nama Z → A" },
                { value: "kapasitas-asc", label: "Kapasitas Terkecil" },
                { value: "kapasitas-desc", label: "Kapasitas Terbesar" },
              ]}
              shown={displayedRows.length}
              total={rows.length}
            />
            
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-900/5 dark:border-slate-700/80 dark:bg-slate-900/60 dark:shadow-black/40">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
                  <thead className="bg-slate-50/90 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Nama Kelas</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Tingkat</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Jurusan</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Rombel</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Wali Kelas</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">Diisi</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">Kapasitas</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                        >
                          {rows.length === 0
                            ? loading ? "Memuat..." : "Belum ada master kelas."
                            : "Tidak ada yang cocok dengan pencarian."}
                        </td>
                      </tr>
                    ) : null}
                    {displayedRows.map((r) => (
                      <tr
                        key={r.id}
                        className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                          {r.nama}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {r.tingkat}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 capitalize">
                          {r.jurusan}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {r.rombel}
                        </td>
                        <td className="px-4 py-3">
                          {r.wali_kelas_nama ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 dark:text-slate-100">{r.wali_kelas_nama}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{r.wali_kelas_email}</span>
                            </div>
                          ) : (
                            <span className="text-xs italic text-slate-400">Belum ditugaskan</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                          <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold ${
                            r.jumlah_siswa >= r.kapasitas_max 
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                          }`}>
                            {r.jumlah_siswa}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                          {r.kapasitas_max}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="mr-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !saving && closeModal()}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? "Edit Kelas" : "Tambah Kelas Baru"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Nama kelas akan menyesuaikan tingkat, jurusan, dan rombel secara otomatis.
              </p>
              
              <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tingkat
                  </label>
                  <select
                    value={tingkat}
                    onChange={(e) => setTingkat(Number(e.target.value))}
                    className="w-full rounded-lg border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value={10}>10 (X)</option>
                    <option value={11}>11 (XI)</option>
                    <option value={12}>12 (XII)</option>
                  </select>
                </div>
                
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Jurusan
                  </label>
                  <select
                    value={jurusan}
                    onChange={(e) => setJurusan(e.target.value as any)}
                    className="w-full rounded-lg border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="mipa">MIPA</option>
                    <option value="ips">IPS</option>
                    <option value="bahasa">Bahasa</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Rombel
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={rombel}
                      onChange={(e) => setRombel(Number(e.target.value))}
                      className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Kapasitas Maksimal
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={kapasitas}
                      onChange={(e) => setKapasitas(Number(e.target.value))}
                      className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
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
                    className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Hapus Kelas?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Apakah Anda yakin ingin menghapus kelas <strong>{deleteTarget.nama}</strong>?
              Jika kelas masih memiliki siswa ({deleteTarget.jumlah_siswa} orang), penghapusan akan ditolak otomatis.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
