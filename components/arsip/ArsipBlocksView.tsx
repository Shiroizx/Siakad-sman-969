"use client";

import type { ArsipTahunBlok } from "@/app/actions/arsip";

function statusLabel(s: string) {
  if (s === "naik_kelas") return "Naik kelas";
  if (s === "tinggal_kelas") return "Tinggal kelas";
  if (s === "lulus") return "Lulus";
  return s;
}

function lulus(nilai: number | null, kkm: number) {
  if (nilai === null || !Number.isFinite(nilai)) return null;
  return nilai >= kkm;
}

export function ArsipBlocksView({ blocks }: { blocks: ArsipTahunBlok[] }) {
  if (blocks.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Belum ada data arsip (nilai, absensi, pelanggaran, atau riwayat kelas).
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {blocks.map((b) => (
        <section
          key={b.academic_year_id}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {b.label}
              </h2>
              {b.is_active ? (
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                  Tahun ajaran aktif
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <p className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                Nilai (mapel)
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {b.jumlahNilai}
              </p>
              {b.rataNilai != null ? (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Rata-rata {b.rataNilai.toFixed(2)}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">—</p>
              )}
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <p className="text-[11px] font-semibold uppercase text-emerald-800 dark:text-emerald-300">
                Hadir
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
                {b.totalHadir}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800">
              <p className="text-[11px] font-semibold uppercase text-slate-500">Alpa</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {b.totalAlpa}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Izin {b.totalIzin} · Sakit {b.totalSakit}
              </p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 dark:border-rose-900/40 dark:bg-rose-950/30">
              <p className="text-[11px] font-semibold uppercase text-rose-800 dark:text-rose-300">
                Pelanggaran
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-rose-900 dark:text-rose-100">
                {b.totalPoinPelanggaran}
              </p>
              <p className="mt-1 text-xs text-rose-800/90 dark:text-rose-300/90">
                {b.jumlahPelanggaran} catatan
              </p>
            </div>
          </div>

          {b.riwayat.length > 0 ? (
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                Riwayat penempatan (tahun ini)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="py-2 pr-4">Waktu</th>
                      <th className="py-2 pr-4">Kelas</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {b.riwayat.map((r, i) => (
                      <tr key={`${r.created_at}-${i}`}>
                        <td className="py-2 pr-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleString("id-ID")
                            : "—"}
                        </td>
                        <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">
                          {r.kelas_nama}
                        </td>
                        <td className="py-2 text-slate-600 dark:text-slate-400">
                          {statusLabel(r.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {b.nilaiSemesters.length > 0 ? (
            <div className="space-y-4 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Rapor per semester
              </h3>
              {b.nilaiSemesters.map((ns) => (
                <details
                  key={ns.semester}
                  className="group rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 marker:content-none dark:text-white [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-2">
                      Semester {ns.semester}
                      <span className="text-xs font-normal text-slate-500 group-open:hidden">
                        {ns.rows.length} mapel · klik untuk buka
                      </span>
                    </span>
                  </summary>
                  <div className="border-t border-slate-100 px-2 pb-3 dark:border-slate-800">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                            <th className="px-3 py-2">Mapel</th>
                            <th className="px-3 py-2 text-right">KKM</th>
                            <th className="px-3 py-2 text-right">Nilai</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {ns.rows.map((row) => {
                            const ok = lulus(row.nilai, row.kkm);
                            return (
                              <tr key={`${ns.semester}-${row.subject_id}`}>
                                <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                                  {row.nama_mapel}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                                  {row.kkm}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                                  {row.nilai != null && Number.isFinite(row.nilai)
                                    ? row.nilai.toFixed(1)
                                    : "—"}
                                </td>
                                <td className="px-3 py-2 text-xs">
                                  {ok === null ? (
                                    <span className="text-slate-400">—</span>
                                  ) : ok ? (
                                    <span className="text-emerald-700 dark:text-emerald-300">
                                      Lulus
                                    </span>
                                  ) : (
                                    <span className="text-rose-700 dark:text-rose-300">
                                      Tidak lulus
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
