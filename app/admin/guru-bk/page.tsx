"use client";

import { getAdminGuruBkList, adminCreateGuruBk, adminDeleteGuruBk, type GuruBkRecord } from "@/app/actions/guru-bk";
import { ClipboardList, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminGuruBkPage() {
  const [list, setList] = useState<GuruBkRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadList() {
    setLoading(true);
    const { list: l, error: e } = await getAdminGuruBkList();
    setList(l);
    setError(e);
    setLoading(false);
  }

  useEffect(() => { void loadList(); }, []);

  async function handleCreate() {
    setSaving(true);
    setToast(null);
    const { error } = await adminCreateGuruBk({
      full_name: formName,
      email: formEmail,
      password: formPassword,
    });
    setSaving(false);
    if (error) { setToast(error); return; }
    setToast("Akun Guru BK berhasil dibuat.");
    setShowForm(false);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    await loadList();
  }

  async function handleDelete(userId: string) {
    if (!confirm("Hapus akun Guru BK ini?")) return;
    const { error } = await adminDeleteGuruBk(userId);
    if (error) { setToast(error); return; }
    setToast("Akun dihapus.");
    await loadList();
  }

  return (
    <div className="min-h-screen bg-slate-50/80 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-2 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <ClipboardList className="h-4 w-4" aria-hidden />
              Admin · Guru BK
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Manajemen Guru BK
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Kelola akun Guru Bimbingan Konseling.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Batal" : "Tambah Guru BK"}
          </button>
        </header>

        {toast && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
            {toast}
          </div>
        )}
        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

        {showForm && (
          <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/30">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Buat akun baru</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Nama Lengkap</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Drs. Nama, S.Pd." className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Email</label>
                <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="guru.bk@sman969.sch.id" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Password</label>
                <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Min. 6 karakter" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={saving || !formName.trim() || !formEmail.trim() || !formPassword}
                onClick={() => void handleCreate()}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? "Membuat…" : "Buat akun"}
              </button>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={3} className="px-4 py-12 text-center text-sm text-slate-500">Memuat…</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-12 text-center text-sm text-slate-500">Belum ada akun Guru BK.</td></tr>
              ) : list.map((u) => (
                <tr key={u.user_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{u.full_name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void handleDelete(u.user_id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
