"use client";

import { getKelasWithTingkat, listStudentsInKelas, type KelasWithTingkat, type StudentMini } from "@/app/actions/akademik";
import { getCatatanKonseling, addCatatanKonseling, updateCatatanKonseling, deleteCatatanKonseling, type CatatanKonselingRow } from "@/app/actions/guru-bk";
import { ClipboardList, Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { useEffect, useState } from "react";

const KATEGORI_OPTIONS = [
  { value: "akademik", label: "Akademik", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "perilaku", label: "Perilaku", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  { value: "pribadi", label: "Pribadi", color: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300" },
  { value: "sosial", label: "Sosial", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  { value: "karir", label: "Karir", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" },
];

function kategoriColor(k: string) {
  return KATEGORI_OPTIONS.find((o) => o.value === k)?.color ?? "bg-slate-100 text-slate-600";
}

export default function GuruBkCatatanPage() {
  const [kelasList, setKelasList] = useState<KelasWithTingkat[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [students, setStudents] = useState<StudentMini[]>([]);
  const [studentId, setStudentId] = useState("");
  const [catatan, setCatatan] = useState<CatatanKonselingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formKategori, setFormKategori] = useState("akademik");
  const [formCatatan, setFormCatatan] = useState("");
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getKelasWithTingkat().then(({ rows }) => setKelasList(rows));
  }, []);

  useEffect(() => {
    if (!kelasId) { setStudents([]); setStudentId(""); return; }
    listStudentsInKelas(kelasId).then(({ students: s }) => {
      setStudents(s);
      setStudentId("");
      setCatatan([]);
    });
  }, [kelasId]);

  useEffect(() => {
    if (!studentId) { setCatatan([]); return; }
    loadCatatan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function loadCatatan() {
    if (!studentId) return;
    setLoading(true);
    const { rows, error: e } = await getCatatanKonseling(studentId);
    setCatatan(rows);
    setError(e);
    setLoading(false);
  }

  function resetForm() {
    setShowForm(false);
    setEditId(null);
    setFormKategori("akademik");
    setFormCatatan("");
    setFormTanggal(new Date().toISOString().slice(0, 10));
  }

  function startEdit(row: CatatanKonselingRow) {
    setEditId(row.id);
    setFormKategori(row.kategori);
    setFormCatatan(row.catatan);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setToast(null);

    let result: { error: string | null };
    if (editId) {
      result = await updateCatatanKonseling({ id: editId, kategori: formKategori, catatan: formCatatan });
    } else {
      result = await addCatatanKonseling({ student_id: studentId, kategori: formKategori, catatan: formCatatan, tanggal: formTanggal });
    }

    setSaving(false);
    if (result.error) {
      setToast(result.error);
      return;
    }
    setToast(editId ? "Catatan diperbarui." : "Catatan ditambahkan.");
    resetForm();
    await loadCatatan();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus catatan konseling ini?")) return;
    const { error } = await deleteCatatanKonseling(id);
    if (error) { setToast(error); return; }
    setToast("Catatan dihapus.");
    await loadCatatan();
  }

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            <ClipboardList className="h-4 w-4" aria-hidden />
            Guru BK · Catatan Konseling
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Catatan Konseling
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Catat hasil konseling per siswa. Hanya Anda yang bisa mengedit catatan milik Anda.
          </p>
        </header>

        {toast && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
            {toast}
          </div>
        )}
        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

        {/* Selector */}
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
            <div className="flex items-end">
              <button
                type="button"
                disabled={!studentId}
                onClick={() => { resetForm(); setShowForm(true); }}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-md transition hover:bg-teal-500 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Tambah catatan
              </button>
            </div>
          </div>
        </div>

        {/* Form tambah/edit */}
        {showForm && (
          <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50/50 p-5 shadow-sm dark:border-teal-900/50 dark:bg-teal-950/30">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editId ? "Edit catatan" : "Tambah catatan baru"}
              </h3>
              <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Kategori</label>
                <select value={formKategori} onChange={(e) => setFormKategori(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100">
                  {KATEGORI_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {!editId && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Tanggal</label>
                  <input type="date" value={formTanggal} onChange={(e) => setFormTanggal(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" />
                </div>
              )}
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Catatan</label>
              <textarea
                value={formCatatan}
                onChange={(e) => setFormCatatan(e.target.value)}
                rows={4}
                placeholder="Tuliskan hasil konseling…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={saving || !formCatatan.trim()}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-teal-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden />
                {saving ? "Menyimpan…" : editId ? "Perbarui" : "Simpan"}
              </button>
            </div>
          </div>
        )}

        {/* List catatan */}
        {loading ? (
          <p className="text-sm text-slate-500">Memuat catatan…</p>
        ) : studentId && catatan.length > 0 ? (
          <div className="space-y-4">
            {catatan.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${kategoriColor(c.kategori)}`}>
                      {c.kategori}
                    </span>
                    <span className="text-xs text-slate-500">
                      {c.tanggal ? new Date(c.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => startEdit(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => void handleDelete(c.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{c.catatan}</p>
              </div>
            ))}
          </div>
        ) : studentId ? (
          <p className="text-sm text-slate-500">Belum ada catatan konseling untuk siswa ini.</p>
        ) : null}
      </main>
    </div>
  );
}
