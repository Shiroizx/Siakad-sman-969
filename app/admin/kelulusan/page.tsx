"use client";

import { getKelasWithTingkat, type KelasWithTingkat } from "@/app/actions/akademik";
import { bulkGraduateClass12 } from "@/app/actions/promotion";
import { AlertTriangle, GraduationCap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function AdminKelulusanPage() {
  const [kelasList, setKelasList] = useState<KelasWithTingkat[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [kelasId, setKelasId] = useState("");
  const [angkatan, setAngkatan] = useState(() => new Date().getFullYear());
  const [working, setWorking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const kelas12 = useMemo(
    () => kelasList.filter((k) => k.tingkat === 12).sort((a, b) => a.nama.localeCompare(b.nama, "id")),
    [kelasList]
  );

  useEffect(() => {
    let c = false;
    (async () => {
      const res = await getKelasWithTingkat();
      if (c) return;
      setLoading(false);
      if (res.error) {
        setLoadErr(res.error);
        setKelasList([]);
        return;
      }
      setLoadErr(null);
      setKelasList(res.rows);
      const xii = res.rows.filter((k) => k.tingkat === 12);
      setKelasId((prev) =>
        prev && xii.some((k) => k.id === prev) ? prev : xii[0]?.id || ""
      );
    })();
    return () => {
      c = true;
    };
  }, []);

  const selectedLabel = useMemo(
    () => kelas12.find((k) => k.id === kelasId)?.nama ?? "—",
    [kelas12, kelasId]
  );

  const runGraduate = useCallback(async () => {
    if (!kelasId) return;
    setWorking(true);
    setToast(null);
    const { graduated, error } = await bulkGraduateClass12(kelasId, angkatan);
    setWorking(false);
    setConfirmOpen(false);
    if (error) setToast(error);
    else setToast(`Berhasil meluluskan ${graduated} siswa (angkatan ${angkatan}).`);
  }, [kelasId, angkatan]);

  return (
    <div className="min-h-screen bg-slate-50/80 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <GraduationCap className="h-4 w-4" aria-hidden />
            Admin · Kelulusan
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Kelulusan massal (kelas XII)
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Hanya rombel tingkat 12. Nilai, absensi, dan pelanggaran tahun ajaran aktif
            dipindah ke arsip alumni dengan label angkatan; siswa ditandai alumni dan
            dikeluarkan dari rombel. Lihat hasil di menu{" "}
            <strong>Arsip alumni</strong>.
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
              Jalankan migrasi <strong>migration_students_alumni.sql</strong> di Supabase
              sebelum memakai fitur ini. Pastikan juga migrasi tahun ajaran &amp; arsip
              sudah ada.
            </span>
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Memuat kelas…</p>
          ) : kelas12.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tidak ada rombel tingkat 12 di master kelas.
            </p>
          ) : (
            <>
              <div>
                <label
                  htmlFor="kelulusan-kelas"
                  className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400"
                >
                  Rombel kelas XII
                </label>
                <select
                  id="kelulusan-kelas"
                  value={kelasId}
                  onChange={(e) => setKelasId(e.target.value)}
                  className="w-full max-w-xl rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                >
                  {kelas12.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="kelulusan-angkatan"
                  className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400"
                >
                  Angkatan (tahun kelulusan)
                </label>
                <input
                  id="kelulusan-angkatan"
                  type="number"
                  min={1990}
                  max={2100}
                  value={angkatan}
                  onChange={(e) => setAngkatan(Number(e.target.value) || angkatan)}
                  className="w-40 rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Angkatan tercatat di profil alumni dan dipakai filter Arsip alumni.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={working || !kelasId}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {working ? "Memproses…" : "Luluskan semua siswa di rombel ini"}
                </button>
              </div>
            </>
          )}
        </div>

        {confirmOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kelulusan-dialog-title"
          >
            <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <h2
                id="kelulusan-dialog-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                Konfirmasi kelulusan
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Luluskan semua siswa non-alumni di <strong>{selectedLabel}</strong> dengan
                angkatan <strong>{angkatan}</strong>? Data tahun ajaran aktif akan
                dipindah ke arsip alumni; siswa tidak lagi terdaftar di rombel ini.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => void runGraduate()}
                  disabled={working}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Ya, luluskan
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {toast ? (
          <div
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              toast.startsWith("Berhasil")
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
            }`}
          >
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  );
}
