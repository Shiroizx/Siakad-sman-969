"use client";

import {
  adminCreateWaliKelas,
  adminDeleteWaliKelas,
  adminUpdateWaliKelas,
  getAdminKelasWithWali,
  getAdminWaliKelasList,
  type KelasWithWaliRecord,
  type WaliKelasRecord,
} from "@/app/actions/wali-kelas";
import { Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Toast = { message: string; variant: "ok" | "err" };
type Modal = "create" | "edit" | null;

export default function AdminWaliKelasPage() {
  const [waliList, setWaliList] = useState<WaliKelasRecord[]>([]);
  const [kelasList, setKelasList] = useState<KelasWithWaliRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [editTarget, setEditTarget] = useState<WaliKelasRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WaliKelasRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formKelasIds, setFormKelasIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [waliRes, kelasRes] = await Promise.all([
      getAdminWaliKelasList(),
      getAdminKelasWithWali(),
    ]);
    setWaliList(waliRes.list);
    setKelasList(kelasRes.rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  function openCreate() {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormKelasIds([]);
    setEditTarget(null);
    setModal("create");
  }

  function openEdit(wk: WaliKelasRecord) {
    setFormName(wk.full_name || wk.email);
    setFormEmail(wk.email);
    setFormPassword("");
    setFormKelasIds(wk.kelas.map((k) => k.id));
    setEditTarget(wk);
    setModal("edit");
  }

  function toggleKelas(id: string) {
    setFormKelasIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) { setToast({ message: "Nama wajib diisi.", variant: "err" }); return; }
    if (modal === "create" && !formEmail.trim()) { setToast({ message: "Email wajib diisi.", variant: "err" }); return; }
    if (modal === "create" && formPassword.length < 6) { setToast({ message: "Password minimal 6 karakter.", variant: "err" }); return; }

    setSaving(true);
    let result: { error: string | null };

    if (modal === "create") {
      result = await adminCreateWaliKelas({
        full_name: formName,
        email: formEmail,
        password: formPassword,
        kelas_ids: formKelasIds,
      });
    } else {
      result = await adminUpdateWaliKelas({
        user_id: editTarget!.user_id,
        full_name: formName,
        kelas_ids: formKelasIds,
      });
    }

    setSaving(false);
    if (result.error) {
      setToast({ message: result.error, variant: "err" });
      return;
    }
    setToast({ message: modal === "create" ? "Akun wali kelas berhasil dibuat." : "Data wali kelas diperbarui.", variant: "ok" });
    setModal(null);
    void fetchData();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await adminDeleteWaliKelas(deleteTarget.user_id);
    setDeleting(false);
    if (error) { setToast({ message: error, variant: "err" }); return; }
    setToast({ message: "Akun wali kelas dihapus.", variant: "ok" });
    setDeleteTarget(null);
    void fetchData();
  }

  // Kelas yang belum punya wali kelas atau dipegang wali yg sedang diedit
  const availableKelas = kelasList.filter((k) =>
    !k.wali_kelas_user_id || k.wali_kelas_user_id === editTarget?.user_id
  );

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <UserCog className="h-6 w-6" />
              <span className="text-xs font-bold uppercase tracking-widest">Admin · Manajemen</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Wali Kelas
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Buat akun wali kelas dan tugaskan mereka ke kelas tertentu. Login menggunakan portal yang sama dengan Admin.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void fetchData()} disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {loading ? "Memuat..." : "Muat Ulang"}
            </button>
            <button onClick={openCreate}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-semibold text-white shadow-md hover:bg-amber-500">
              <Plus className="h-4 w-4" />
              Tambah Wali Kelas
            </button>
          </div>
        </div>

        {toast && (
          <div role="status" className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${
            toast.variant === "ok"
              ? "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100"
              : "border-rose-300/80 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100"
          }`}>{toast.message}</div>
        )}

        {/* Tabel Wali Kelas */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Nama</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Kelas Dipegang</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {waliList.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    {loading ? "Memuat..." : "Belum ada wali kelas."}
                  </td></tr>
                ) : waliList.map((wk) => (
                  <tr key={wk.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{wk.full_name || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{wk.email}</td>
                    <td className="px-4 py-3">
                      {wk.kelas.length === 0 ? (
                        <span className="text-xs text-slate-400">Belum ditugaskan</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {wk.kelas.map((k) => (
                            <span key={k.id} className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                              {k.nama}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button onClick={() => openEdit(wk)}
                        className="mr-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                        <Pencil className="h-3.5 w-3.5" />Edit
                      </button>
                      <button onClick={() => setDeleteTarget(wk)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                        <Trash2 className="h-3.5 w-3.5" />Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info kelas belum ada wali */}
        {kelasList.filter((k) => !k.wali_kelas_user_id).length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            <strong>{kelasList.filter((k) => !k.wali_kelas_user_id).length} kelas</strong> belum memiliki wali kelas:{" "}
            {kelasList.filter((k) => !k.wali_kelas_user_id).map((k) => k.nama).join(", ")}
          </div>
        )}
      </div>

      {/* Modal Create / Edit */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16">
          <button type="button" aria-label="Tutup" onClick={() => !saving && setModal(null)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {modal === "create" ? "Tambah Wali Kelas Baru" : `Edit: ${editTarget?.full_name || editTarget?.email}`}
              </h2>

              <form onSubmit={handleSave} className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                </div>

                {modal === "create" && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                      <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                      <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tugaskan ke Kelas
                    <span className="ml-1 text-xs text-slate-400">(pilih satu atau lebih)</span>
                  </label>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                    {availableKelas.length === 0 ? (
                      <p className="px-2 py-4 text-center text-xs text-slate-500">Semua kelas sudah memiliki wali kelas.</p>
                    ) : availableKelas.map((k) => (
                      <label key={k.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={formKelasIds.includes(k.id)}
                          onChange={() => toggleKelas(k.id)}
                          className="h-4 w-4 rounded accent-amber-600"
                        />
                        <span className="text-sm text-slate-800 dark:text-slate-200">{k.nama}</span>
                        <span className="ml-auto text-xs text-slate-400">{k.jumlah_siswa}/{k.kapasitas_max}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button type="button" disabled={saving} onClick={() => setModal(null)}
                    className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200">
                    Batal
                  </button>
                  <button type="submit" disabled={saving}
                    className="h-10 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50">
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button type="button" aria-label="Tutup" onClick={() => !deleting && setDeleteTarget(null)}
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hapus Wali Kelas?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Anda akan menghapus akun <strong>{deleteTarget.full_name || deleteTarget.email}</strong>. 
              Kelas yang dipegang akan dilepas secara otomatis.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)}
                className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200">
                Batal
              </button>
              <button type="button" disabled={deleting} onClick={confirmDelete}
                className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50">
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
