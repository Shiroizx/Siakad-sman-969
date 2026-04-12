"use client";

import {
  calculateProfileMatching,
  listStudentsForPeminatan,
} from "@/app/actions/peminatan";
import type { PeminatanStudentOption } from "@/app/actions/peminatan";
import { isSiswaUser } from "@/lib/auth/siswa";
import type { HasilJurusan } from "@/lib/peminatan/profile-matching";
import { createClient } from "@/utils/supabase/client";
import { ChevronDown, Info, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function barFillWidth(nilaiSiswa: number) {
  return Math.min(100, Math.max(0, Math.round(nilaiSiswa * 10) / 10));
}

function MapelProgressRow(props: {
  item: HasilJurusan["detail"][number];
  accent: "violet" | "emerald";
}) {
  const { item, accent } = props;
  const fill = barFillWidth(item.nilaiSiswa);
  const targetPos = Math.min(100, Math.max(0, item.target));
  const fillClass =
    accent === "violet"
      ? "bg-gradient-to-r from-violet-500 to-fuchsia-500"
      : "bg-gradient-to-r from-emerald-500 to-teal-400";

  return (
    <div className="rounded-xl bg-white/60 p-3 shadow-inner ring-1 ring-black/5 dark:bg-slate-900/50 dark:ring-white/10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {item.label}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {item.tipe === "Core" ? "Core factor" : "Secondary factor"}
            {item.mapelTerpakai ? (
              <>
                {" "}
                · nilai dari{" "}
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {item.mapelTerpakai}
                </span>
              </>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                {" "}
                · belum ada nilai di rapor
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
            {item.nilaiSiswa.toFixed(1)}
            <span className="text-slate-400 dark:text-slate-500">
              {" "}
              / {item.target}
            </span>
          </p>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            bobot {item.bobot.toFixed(1)} · gap {item.gap >= 0 ? "+" : ""}
            {item.gap}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <span>0</span>
          <span className="text-violet-600 dark:text-violet-300">
            Target profil: {item.target}
          </span>
          <span>100</span>
        </div>
        <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${fillClass}`}
            style={{ width: `${fill}%` }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 w-0.5 bg-slate-900/70 ring-1 ring-white/30 dark:bg-amber-300 dark:ring-amber-950/30"
            style={{ left: `${targetPos}%` }}
            title={`Target ideal ${item.target}`}
          />
        </div>
        <p className="mt-1 text-center text-[10px] text-slate-500 dark:text-slate-400">
          Isi bar: nilai rapor (0–100) · garis: target profil jurusan
        </p>
      </div>
    </div>
  );
}

function applyMatchResult(
  res: Awaited<ReturnType<typeof calculateProfileMatching>>,
  setters: {
    setNama: (v: string | null) => void;
    setNisn: (v: string | null) => void;
    setHasil: (v: HasilJurusan[]) => void;
    setUtama: (v: "MIPA" | "IPS" | null) => void;
    setAnalysisError: (v: string | null) => void;
  }
) {
  if (res.error) {
    setters.setAnalysisError(res.error);
    setters.setHasil([]);
    setters.setUtama(null);
    setters.setNama(res.studentNama);
    setters.setNisn(res.studentNisn);
  } else {
    setters.setAnalysisError(null);
    setters.setNama(res.studentNama);
    setters.setNisn(res.studentNisn);
    setters.setHasil(res.hasil);
    setters.setUtama(res.rekomendasiUtama);
  }
}

export default function SiswaPeminatanPage() {
  const [bootLoading, setBootLoading] = useState(true);
  const [isSiswaPortal, setIsSiswaPortal] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [students, setStudents] = useState<PeminatanStudentOption[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [switchLoading, setSwitchLoading] = useState(false);

  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [nama, setNama] = useState<string | null>(null);
  const [nisn, setNisn] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilJurusan[]>([]);
  const [utama, setUtama] = useState<"MIPA" | "IPS" | null>(null);

  const [authEmail, setAuthEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      setAuthEmail(user?.email ?? null);

      const studentIdMeta =
        typeof user?.user_metadata?.student_id === "string"
          ? user.user_metadata.student_id
          : null;

      if (user && isSiswaUser(user)) {
        setIsSiswaPortal(true);
        if (!studentIdMeta) {
          setAnalysisError(
            "Akun siswa tidak terhubung ke data students. Hubungi admin."
          );
          setBootLoading(false);
          return;
        }
        setSelectedId(studentIdMeta);
        const res = await calculateProfileMatching(studentIdMeta);
        if (cancelled) return;
        applyMatchResult(res, {
          setNama,
          setNisn,
          setHasil,
          setUtama,
          setAnalysisError,
        });
        setBootLoading(false);
        return;
      }

      setIsSiswaPortal(false);
      const listRes = await listStudentsForPeminatan();
      if (cancelled) return;

      if (listRes.error) {
        setListError(listRes.error);
        setStudents([]);
        setBootLoading(false);
        return;
      }

      setListError(null);
      setStudents(listRes.students);

      if (listRes.students.length === 0) {
        setBootLoading(false);
        return;
      }

      const firstId = listRes.students[0].id;
      setSelectedId(firstId);
      const res = await calculateProfileMatching(firstId);
      if (cancelled) return;
      applyMatchResult(res, {
        setNama,
        setNisn,
        setHasil,
        setUtama,
        setAnalysisError,
      });
      setBootLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSelectStudent = useCallback(
    async (studentId: string) => {
      if (isSiswaPortal) return;
      if (!studentId || studentId === selectedId) return;
      setSelectedId(studentId);
      setSwitchLoading(true);
      const res = await calculateProfileMatching(studentId);
      applyMatchResult(res, {
        setNama,
        setNisn,
        setHasil,
        setUtama,
        setAnalysisError,
      });
      setSwitchLoading(false);
    },
    [selectedId, isSiswaPortal]
  );

  const mipa = hasil.find((h) => h.kode === "MIPA");
  const ips = hasil.find((h) => h.kode === "IPS");

  const judulJurusan =
    utama === "MIPA"
      ? "Matematika dan Ilmu Pengetahuan Alam (MIPA)"
      : utama === "IPS"
        ? "Ilmu Pengetahuan Sosial (IPS)"
        : "Jurusan";

  if (bootLoading) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-50 via-violet-50/40 to-fuchsia-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <main className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 px-4 py-24 sm:px-6">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600 dark:border-violet-900 dark:border-t-violet-400" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Memuat data peminatan…
          </p>
        </main>
      </div>
    );
  }

  if (!isSiswaPortal && listError && students.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-16 dark:from-slate-950 dark:to-slate-900">
        <main className="mx-auto max-w-lg">
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          >
            <p className="font-semibold">Gagal memuat daftar siswa</p>
            <p className="mt-1 text-sm opacity-90">{listError}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isSiswaPortal && students.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-16 dark:from-slate-950 dark:to-slate-900">
        <main className="mx-auto max-w-lg text-center">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Belum ada data siswa
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Tambahkan siswa di tabel <code className="rounded bg-slate-200 px-1 dark:bg-slate-800">students</code>{" "}
            di Supabase agar modul peminatan bisa digunakan.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-50 via-violet-50/40 to-fuchsia-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-200/50 via-transparent to-transparent dark:from-violet-950/40" />

      <main className="relative mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {!isSiswaPortal ? (
          <>
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-indigo-200/90 bg-indigo-50/95 p-4 text-sm text-indigo-950 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-50 sm:flex-row sm:items-start">
              <Users
                className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300"
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-bold text-indigo-900 dark:text-indigo-100">
                  Pilih siswa untuk melihat rekomendasi peminatan
                </p>
                <p className="text-xs leading-relaxed text-indigo-900/90 dark:text-indigo-100/90">
                  Semua siswa diambil dari database. Ganti pilihan di dropdown
                  untuk memuat ulang analisis MIPA vs IPS berdasarkan rapor siswa
                  tersebut.
                </p>
                <p className="text-xs font-medium text-indigo-950/80 dark:text-indigo-100/80">
                  <span className="text-indigo-800/80 dark:text-indigo-300/90">
                    Operator (login):
                  </span>{" "}
                  <span className="font-mono break-all">{authEmail ?? "—"}</span>
                </p>
              </div>
            </div>

            <div className="relative mb-8 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 sm:p-5">
              <label
                htmlFor="student-select"
                className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                <ChevronDown className="h-4 w-4" aria-hidden />
                Siswa
              </label>
              <div className="relative">
                <select
                  id="student-select"
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3.5 pl-4 pr-11 text-sm font-medium text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  value={selectedId ?? ""}
                  disabled={switchLoading}
                  onChange={(e) => void onSelectStudent(e.target.value)}
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} — NISN {s.nisn}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
              {switchLoading ? (
                <p className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  Memuat analisis…
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="mb-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4 text-sm text-emerald-950 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-50">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              Mode siswa
            </p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
              Menampilkan rekomendasi untuk akun yang kamu pakai login (data rapor
              sesuai siswa di database).
            </p>
          </div>
        )}

        {analysisError ? (
          <div
            role="alert"
            className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          >
            <p className="font-semibold">Tidak bisa memuat rekomendasi</p>
            <p className="mt-1 text-sm opacity-90">{analysisError}</p>
          </div>
        ) : null}

        {!analysisError ? (
          <>
            <div className="mb-6 flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
              <Info
                className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400"
                aria-hidden
              />
              <p className="text-xs leading-relaxed">
                Rekomendasi dihitung dari nilai di{" "}
                <code className="rounded bg-white px-1 font-mono text-[11px] dark:bg-slate-900">
                  academic_records
                </code>{" "}
                {isSiswaPortal
                  ? "untuk akun siswa ini. Hasil bersifat panduan BK/orang tua."
                  : "untuk siswa yang dipilih. Hasil bersifat panduan BK/orang tua."}
              </p>
            </div>

            <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-8 shadow-xl shadow-violet-200/40 ring-1 ring-violet-100 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/40 dark:ring-violet-900/30 sm:p-10">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-violet-400/30 to-fuchsia-400/20 blur-2xl dark:from-violet-600/20" />
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-gradient-to-tr from-emerald-300/25 to-cyan-300/20 blur-2xl dark:from-emerald-600/15" />

              <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
                Rekomendasi peminatan
              </p>
              <h1 className="relative mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Halo{nama ? `, ${nama.split(" ")[0]}` : ""}! 👋
              </h1>
              <p className="relative mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Berikut perbandingan rapor{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {nama ?? "siswa terpilih"}
                </span>{" "}
                dengan{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  profil ideal
                </span>{" "}
                MIPA & IPS (faktor inti & sekunder).
              </p>

              <div className="relative mt-8 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 p-[1px] shadow-lg dark:border-violet-500/30">
                <div className="rounded-2xl bg-slate-950/5 px-6 py-6 backdrop-blur-sm dark:bg-slate-950/40">
                  <p className="text-center text-4xl drop-shadow-sm">🎓</p>
                  <p className="mt-3 text-center text-lg font-bold leading-snug text-white sm:text-xl">
                    Berdasarkan nilai rapor, direkomendasikan jurusan
                  </p>
                  <p className="mt-2 text-center text-2xl font-black tracking-tight text-white drop-shadow-md sm:text-3xl">
                    {utama ?? "—"}
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-center text-sm font-medium text-white/90">
                    {judulJurusan}
                  </p>
                  {nisn ? (
                    <p className="mt-4 text-center font-mono text-xs text-white/70">
                      NISN {nisn}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="mt-10">
              <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Perbandingan jurusan
              </h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {mipa ? (
                  <article className="group flex flex-col rounded-3xl border border-violet-200/80 bg-white/90 p-6 shadow-lg shadow-violet-100/50 transition hover:-translate-y-0.5 hover:shadow-xl dark:border-violet-900/50 dark:bg-slate-900/80 dark:shadow-none">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                          MIPA
                        </span>
                        <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                          Rapor vs profil IPA
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase text-slate-400">
                          Skor kecocokan
                        </p>
                        <p className="text-3xl font-black tabular-nums text-violet-600 dark:text-violet-400">
                          {mipa.persentaseKecocokan.toFixed(0)}
                          <span className="text-lg font-bold">%</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
                        <p className="font-medium text-slate-500 dark:text-slate-400">
                          NCF (60%)
                        </p>
                        <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                          {mipa.ncf.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
                        <p className="font-medium text-slate-500 dark:text-slate-400">
                          NSF (40%)
                        </p>
                        <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                          {mipa.nsf.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                        style={{
                          width: `${Math.min(100, mipa.persentaseKecocokan)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-5 flex flex-col gap-3">
                      {mipa.detail.map((d, i) => (
                        <MapelProgressRow
                          key={`mipa-${i}-${d.label}`}
                          item={d}
                          accent="violet"
                        />
                      ))}
                    </div>
                  </article>
                ) : null}

                {ips ? (
                  <article className="group flex flex-col rounded-3xl border border-emerald-200/80 bg-white/90 p-6 shadow-lg shadow-emerald-100/50 transition hover:-translate-y-0.5 hover:shadow-xl dark:border-emerald-900/50 dark:bg-slate-900/80 dark:shadow-none">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          IPS
                        </span>
                        <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                          Rapor vs profil IPS
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase text-slate-400">
                          Skor kecocokan
                        </p>
                        <p className="text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                          {ips.persentaseKecocokan.toFixed(0)}
                          <span className="text-lg font-bold">%</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
                        <p className="font-medium text-slate-500 dark:text-slate-400">
                          NCF (60%)
                        </p>
                        <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                          {ips.ncf.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
                        <p className="font-medium text-slate-500 dark:text-slate-400">
                          NSF (40%)
                        </p>
                        <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                          {ips.nsf.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                        style={{
                          width: `${Math.min(100, ips.persentaseKecocokan)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-5 flex flex-col gap-3">
                      {ips.detail.map((d, i) => (
                        <MapelProgressRow
                          key={`ips-${i}-${d.label}`}
                          item={d}
                          accent="emerald"
                        />
                      ))}
                    </div>
                  </article>
                ) : null}
              </div>
            </section>

            <footer className="mt-12 text-center text-xs text-slate-500 dark:text-slate-500">
              Metode: gap → bobot (≥0: 4.5, 0: 5, negatif: 5+gap, min 0) · NCF &
              NSF rata-rata · total = 0.6×NCF + 0.4×NSF · persentase = total/5×
              100.
            </footer>
          </>
        ) : null}
      </main>
    </div>
  );
}
