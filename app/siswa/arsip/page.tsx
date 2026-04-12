"use client";

import { getMyArsipOverview } from "@/app/actions/arsip";
import { ArsipBlocksView } from "@/components/arsip/ArsipBlocksView";
import { Archive } from "lucide-react";
import { useEffect, useState } from "react";

export default function SiswaArsipPage() {
  const [blocks, setBlocks] = useState<
    Awaited<ReturnType<typeof getMyArsipOverview>>["blocks"]
  >([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      const res = await getMyArsipOverview();
      if (c) return;
      setLoading(false);
      if (res.error) {
        setErr(res.error);
        setBlocks([]);
      } else {
        setErr(null);
        setBlocks(res.blocks);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <Archive className="h-4 w-4" aria-hidden />
          Siswa · Arsip akademik
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          Arsip saya
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Ringkasan semua tahun ajaran: nilai, kehadiran, pelanggaran, dan riwayat
          penempatan kelas. Data tahun ajaran aktif tampil di modul EWS, Akademik,
          dan Kedisiplinan; tahun lain tersimpan di sini.
        </p>
      </header>

      {err ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
        >
          {err}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Memuat arsip…</p>
      ) : (
        <ArsipBlocksView blocks={blocks} />
      )}
    </div>
  );
}
