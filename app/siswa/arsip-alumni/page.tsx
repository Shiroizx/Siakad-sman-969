"use client";

import { getMyAlumniArsipOverview } from "@/app/actions/arsip";
import { ArsipBlocksView } from "@/components/arsip/ArsipBlocksView";
import { GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";

export default function SiswaArsipAlumniPage() {
  const [blocks, setBlocks] = useState<
    Awaited<ReturnType<typeof getMyAlumniArsipOverview>>["blocks"]
  >([]);
  const [siswaNama, setSiswaNama] = useState<string | null>(null);
  const [siswaNisn, setSiswaNisn] = useState<string | null>(null);
  const [angkatanLulus, setAngkatanLulus] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      const res = await getMyAlumniArsipOverview();
      if (c) return;
      setLoading(false);
      if (res.error) {
        setErr(res.error);
        setBlocks([]);
        setSiswaNama(null);
        setSiswaNisn(null);
        setAngkatanLulus(null);
      } else {
        setErr(null);
        setBlocks(res.blocks);
        setSiswaNama(res.siswaNama);
        setSiswaNisn(res.siswaNisn);
        setAngkatanLulus(res.angkatanLulus);
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
          <GraduationCap className="h-4 w-4" aria-hidden />
          Alumni · Arsip akademik
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          Arsip alumni saya
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Ringkasan tahun ajaran selama di sekolah, termasuk blok kelulusan. Akun
          alumni hanya memiliki akses ke halaman ini di portal siswa.
        </p>
        {siswaNama ? (
          <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
            {siswaNama}
            {siswaNisn ? (
              <span className="font-normal text-slate-500 dark:text-slate-400">
                {" "}
                · NISN {siswaNisn}
              </span>
            ) : null}
            {angkatanLulus != null ? (
              <span className="font-normal text-slate-500 dark:text-slate-400">
                {" "}
                · Angkatan lulus {angkatanLulus}
              </span>
            ) : null}
          </p>
        ) : null}
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
