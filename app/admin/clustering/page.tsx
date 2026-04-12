"use client";

import {
  applyClusteringAssignments,
  simulateClustering,
  type ClusterClassResult,
  type ClusterJurusan,
  type ClusteringScope,
} from "@/app/actions/clustering";
import { getKelasList, type KelasOption } from "@/app/actions/students";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import {
  type ClusterSiswaSort,
  sortClusterStudents,
} from "@/lib/admin-list-utils";
import { useCallback, useEffect, useMemo, useState } from "react";

const JURUSAN_LABEL: Record<ClusterJurusan, string> = {
  bahasa: "Bahasa",
  mipa: "MIPA",
  ips: "IPS",
};

export default function AdminClusteringPage() {
  const [kelasMaster, setKelasMaster] = useState<KelasOption[]>([]);
  const [kelasLoadErr, setKelasLoadErr] = useState<string | null>(null);
  const [tingkat, setTingkat] = useState(10);
  const [jurusan, setJurusan] = useState<ClusterJurusan>("bahasa");
  const [pool, setPool] = useState<ClusteringScope["pool"]>("same_jurusan");
  const [minSkorStr, setMinSkorStr] = useState("");
  const [jumlahSlot, setJumlahSlot] = useState(1);

  const [classes, setClasses] = useState<ClusterClassResult[]>([]);
  const [slotCount, setSlotCount] = useState(0);
  const [poolSebelumFilter, setPoolSebelumFilter] = useState(0);
  const [siswaSetelahFilter, setSiswaSetelahFilter] = useState(0);

  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyMsg, setApplyMsg] = useState<string | null>(null);
  const [siswaSort, setSiswaSort] = useState<ClusterSiswaSort>("nama-asc");
  const [clusterQuery, setClusterQuery] = useState("");

  useEffect(() => {
    let c = false;
    void (async () => {
      const res = await getKelasList();
      if (c) return;
      if (res.error) {
        setKelasLoadErr(res.error);
        setKelasMaster([]);
        return;
      }
      setKelasLoadErr(null);
      setKelasMaster(res.rows);
    })();
    return () => {
      c = true;
    };
  }, []);

  const tingkatOptions = useMemo(() => {
    const s = new Set(kelasMaster.map((k) => k.tingkat));
    return [...s].sort((a, b) => a - b);
  }, [kelasMaster]);

  const jurusanOptions = useMemo(() => {
    const s = new Set(
      kelasMaster
        .filter((k) => k.tingkat === tingkat)
        .map((k) => k.jurusan)
        .filter((j): j is ClusterJurusan =>
          j === "bahasa" || j === "mipa" || j === "ips"
        )
    );
    return [...s] as ClusterJurusan[];
  }, [kelasMaster, tingkat]);

  useEffect(() => {
    if (tingkatOptions.length === 0) return;
    if (!tingkatOptions.includes(tingkat)) {
      setTingkat(tingkatOptions[0]!);
    }
  }, [tingkatOptions, tingkat]);

  useEffect(() => {
    if (jurusanOptions.length === 0) return;
    if (!jurusanOptions.includes(jurusan)) {
      setJurusan(jurusanOptions[0]!);
    }
  }, [jurusanOptions, jurusan]);

  const slotsForScope = useMemo(
    () =>
      kelasMaster.filter(
        (k) => k.tingkat === tingkat && (k.jurusan ?? "") === jurusan
      ),
    [kelasMaster, tingkat, jurusan]
  );

  const maxSlots = slotsForScope.length;
  useEffect(() => {
    if (maxSlots <= 0) return;
    setJumlahSlot((p) => Math.min(Math.max(1, p), maxSlots));
  }, [maxSlots, tingkat, jurusan]);

  const classesView = useMemo(() => {
    if (classes.length === 0) return [];
    const q = clusterQuery.trim().toLowerCase();
    return classes.map((kelas) => {
      let siswa = sortClusterStudents(kelas.siswa, siswaSort);
      if (q) {
        siswa = siswa.filter(
          (s) =>
            s.nama.toLowerCase().includes(q) ||
            String(s.nisn).toLowerCase().includes(q)
        );
      }
      return { ...kelas, siswa };
    });
  }, [classes, siswaSort, clusterQuery]);

  const totalSiswaShown = useMemo(
    () => classesView.reduce((a, c) => a + c.siswa.length, 0),
    [classesView]
  );
  const totalSiswaAll = useMemo(
    () => classes.reduce((a, c) => a + c.siswa.length, 0),
    [classes]
  );

  const handleGenerate = useCallback(async () => {
    const minRaw = minSkorStr.trim() === "" ? NaN : Number(minSkorStr);
    const minSkorMapel =
      Number.isFinite(minRaw) && minRaw > 0 ? minRaw : null;
    const scope: ClusteringScope = {
      tingkat,
      jurusan,
      pool,
      minSkorMapel,
    };
    setLoading(true);
    setError(null);
    setApplyError(null);
    setApplyMsg(null);
    const {
      classes: next,
      slotCount: sc,
      poolSebelumFilter: psf,
      siswaSetelahFilter: ssf,
      error: err,
    } = await simulateClustering(scope, jumlahSlot);
    if (err) {
      setError(err);
      setClasses([]);
      setSlotCount(0);
      setPoolSebelumFilter(0);
      setSiswaSetelahFilter(0);
    } else {
      setClasses(next);
      setSlotCount(sc);
      setPoolSebelumFilter(psf);
      setSiswaSetelahFilter(ssf);
    }
    setLoading(false);
  }, [tingkat, jurusan, pool, minSkorStr, jumlahSlot]);

  const slotPreview = useMemo(() => {
    const n = Math.min(maxSlots, Math.max(1, jumlahSlot));
    return slotsForScope.slice(0, n);
  }, [slotsForScope, maxSlots, jumlahSlot]);

  const handleApply = useCallback(async () => {
    if (classes.length === 0) return;
    const assignments: Record<string, string> = {};
    for (const kelas of classes) {
      if (!kelas.kelasId) continue;
      for (const s of kelas.siswa) {
        assignments[s.id] = kelas.kelasId;
      }
    }
    const n = Object.keys(assignments).length;
    if (n === 0) {
      setApplyMsg("Tidak ada penempatan yang bisa diterapkan.");
      return;
    }
    const ok = window.confirm(
      `Terapkan pembagian ke database?\n\n` +
        `${n} siswa akan dipindahkan ke kelas sesuai simulasi (siswa lain tidak diubah). ` +
        `Pastikan kapasitas kelas mencukupi.`
    );
    if (!ok) return;
    setApplying(true);
    setApplyMsg(null);
    setApplyError(null);
    setError(null);
    const { updated, error: err } = await applyClusteringAssignments({
      assignments,
    });
    setApplying(false);
    if (err) {
      setApplyError(err);
      return;
    }
    setApplyMsg(`Berhasil memperbarui kelas untuk ${updated} siswa.`);
  }, [classes]);

  const spreadRata =
    classes.length > 0
      ? Math.max(...classes.map((c) => c.rataNilaiKelas)) -
        Math.min(...classes.map((c) => c.rataNilaiKelas))
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-slate-200 pb-8 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Admin · SPK
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Distribusi kelas per jurusan
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Pilih <strong>tingkat</strong> dan <strong>jurusan</strong> (sesuai
            master kelas). Slot simulasi = kelas master untuk kombinasi itu.
            Pool hanya mencakup siswa yang <strong>belum punya rombel</strong> (
            <code className="rounded bg-slate-100 px-1 text-[11px] dark:bg-slate-800">
              kelas_id
            </code>{" "}
            kosong). Opsional{" "}
            <strong>skor mapel jurusan</strong> memfilter yang “cocok” (rerata
            nilai mapel relevan, mis. Bahasa Indonesia / Inggris untuk jalur
            Bahasa). Algoritma pembagian: <strong>Greedy S-curve</strong>{" "}
            (L/P, nilai rata). Hasil bisa{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              diterapkan ke database
            </strong>
            .
          </p>
        </header>

        <section className="mb-8 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="cluster-tingkat"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Tingkat
              </label>
              <select
                id="cluster-tingkat"
                value={tingkat}
                onChange={(e) => setTingkat(Number(e.target.value) || 10)}
                disabled={tingkatOptions.length === 0}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              >
                {tingkatOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="cluster-jurusan"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Jurusan
              </label>
              <select
                id="cluster-jurusan"
                value={jurusan}
                onChange={(e) =>
                  setJurusan(e.target.value as ClusterJurusan)
                }
                disabled={jurusanOptions.length === 0}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              >
                {jurusanOptions.map((j) => (
                  <option key={j} value={j}>
                    {JURUSAN_LABEL[j]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="cluster-jumlah-slot"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Jumlah slot dipakai
              </label>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Maks {maxSlots || "—"} kelas untuk tingkat + jurusan ini.
              </p>
              <input
                id="cluster-jumlah-slot"
                type="number"
                min={1}
                max={Math.max(1, maxSlots)}
                value={jumlahSlot}
                onChange={(e) => {
                  const m = Math.max(1, maxSlots);
                  setJumlahSlot(
                    Math.min(m, Math.max(1, Number(e.target.value) || 1))
                  );
                }}
                disabled={maxSlots === 0}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-medium text-slate-900 shadow-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="cluster-min-skor"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Min. skor mapel jurusan (opsional)
              </label>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Kosong = semua siswa di pool. Isi angka = hanya siswa dengan
                rerata mapel relevan ≥ nilai ini.
              </p>
              <input
                id="cluster-min-skor"
                type="number"
                min={0}
                max={100}
                step={1}
                placeholder="—"
                value={minSkorStr}
                onChange={(e) => setMinSkorStr(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <fieldset className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Pool siswa
            </legend>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Hanya siswa yang <strong>belum punya rombel</strong> (belum ada penempatan
              kelas). Kalau Anda sudah berhasil &quot;Terapkan&quot; sebelumnya, siswa
              sudah masuk kelas—generate akan kosong sampai ada siswa baru atau
              rombel dikosongkan lagi.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                <input
                  type="radio"
                  name="pool-siswa"
                  checked={pool === "same_jurusan"}
                  onChange={() => setPool("same_jurusan")}
                  className="text-indigo-600"
                />
                Belum rombel: peminatan sama dengan jurusan ini, tingkat akademik
                sama
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                <input
                  type="radio"
                  name="pool-siswa"
                  checked={pool === "same_tingkat"}
                  onChange={() => setPool("same_tingkat")}
                  className="text-indigo-600"
                />
                Belum rombel: semua peminatan di tingkat akademik yang sama
              </label>
            </div>
          </fieldset>

          {slotPreview.length > 0 ? (
            <div className="rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Slot → kelas master ({slotPreview.length} dipakai)
              </p>
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {slotPreview.map((k, i) => (
                  <span key={k.id}>
                    {i > 0 ? " · " : ""}
                    <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                      {i + 1}
                    </span>{" "}
                    {k.nama}
                  </span>
                ))}
              </p>
            </div>
          ) : maxSlots === 0 && kelasMaster.length > 0 ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Tidak ada kelas master untuk tingkat {tingkat} jurusan{" "}
              {JURUSAN_LABEL[jurusan]}. Pilih kombinasi lain.
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading || maxSlots === 0}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {loading ? "Menghitung…" : "Generate simulasi"}
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={applying || loading || classes.length === 0}
              className="inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/60"
            >
              {applying ? "Menerapkan…" : "Terapkan ke database"}
            </button>
          </div>
        </section>

        {kelasLoadErr ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100"
          >
            Gagal memuat daftar kelas: {kelasLoadErr}
          </div>
        ) : null}

        {applyMsg ? (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
          >
            {applyMsg}
          </div>
        ) : null}

        {applyError ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100"
          >
            <span className="font-semibold">Gagal menerapkan ke database.</span>{" "}
            {applyError}
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100"
          >
            <span className="font-semibold">Simulasi tidak bisa dihitung.</span>{" "}
            {error}
          </div>
        ) : null}

        {classes.length > 0 ? (
          <>
            <AdminListToolbar
              className="mb-6"
              query={clusterQuery}
              onQueryChange={setClusterQuery}
              queryPlaceholder="Saring nama / NISN di semua kelas simulasi…"
              sortValue={siswaSort}
              onSortChange={(v) => setSiswaSort(v as ClusterSiswaSort)}
              sortOptions={[
                { value: "nama-asc", label: "Nama A → Z (tiap kelas)" },
                { value: "nama-desc", label: "Nama Z → A" },
                { value: "nilai-desc", label: "Nilai rata-rata tertinggi" },
                { value: "skor-jurusan-desc", label: "Skor mapel jurusan tertinggi" },
                { value: "nisn-asc", label: "NISN terkecil" },
              ]}
              shown={totalSiswaShown}
              total={totalSiswaAll}
              itemLabel="baris siswa (semua kelas)"
            />
            <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
              Pool: {poolSebelumFilter} siswa
              {siswaSetelahFilter !== poolSebelumFilter
                ? ` → setelah filter skor: ${siswaSetelahFilter} siswa`
                : null}
              . Slot master tersedia untuk jurusan ini: {slotCount}.
            </p>
            <section className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                  Kelas simulasi
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {classes.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                  Total siswa terbagi
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {classes.reduce((a, c) => a + c.totalSiswa, 0)}
                </p>
              </div>
              <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/80 px-4 py-3 dark:border-indigo-900/50 dark:bg-indigo-950/40">
                <p className="text-xs font-medium uppercase text-indigo-700 dark:text-indigo-300">
                  Sebaran rata-rata nilai antar kelas (Δ)
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-indigo-900 dark:text-indigo-100">
                  {spreadRata.toFixed(2)}
                </p>
                <p className="mt-0.5 text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                  Semakin kecil, semakin merata kemampuan antar kelas.
                </p>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {classesView.map((kelas) => (
                <article
                  key={kelas.index}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10"
                >
                  <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/60 px-4 py-3 dark:border-slate-800 dark:from-slate-800/80 dark:to-indigo-950/40">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {kelas.namaKelas}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {clusterQuery.trim()
                        ? `${kelas.siswa.length} cocok saringan`
                        : `${kelas.totalSiswa} siswa`}
                      {clusterQuery.trim() &&
                      kelas.siswa.length !== kelas.totalSiswa
                        ? ` (dari ${kelas.totalSiswa})`
                        : ""}{" "}
                      · rasio L:P{" "}
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {kelas.rasioLP}
                      </span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-semibold text-indigo-800 shadow-sm ring-1 ring-indigo-200 dark:bg-slate-950 dark:text-indigo-200 dark:ring-indigo-900">
                        Rata nilai:{" "}
                        <span className="ml-1 font-mono tabular-nums">
                          {kelas.rataNilaiKelas.toFixed(2)}
                        </span>
                      </span>
                      <span className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-700">
                        L {kelas.jumlahL} · P {kelas.jumlahP}
                      </span>
                    </div>
                  </div>

                  <div className="max-h-[280px] flex-1 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/95 dark:text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Nama</th>
                          <th className="px-3 py-2 text-right">Skor mapel</th>
                          <th className="px-3 py-2 text-right">Nilai</th>
                          <th className="px-3 py-2 text-center">JK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {kelas.siswa.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                            >
                              (kosong)
                            </td>
                          </tr>
                        ) : (
                          kelas.siswa.map((s) => (
                            <tr
                              key={s.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                            >
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                                {s.nama}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                                {(s.skorMapelJurusan ?? 0).toFixed(1)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                                {s.nilaiRata.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={
                                    s.jenisKelamin === "L"
                                      ? "rounded bg-sky-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                                      : "rounded bg-fuchsia-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200"
                                  }
                                >
                                  {s.jenisKelamin}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : !loading && !error ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
            {kelasMaster.length === 0 && !kelasLoadErr ? (
              <>
                Belum ada kelas di master. Tambahkan kelas lalu kembali ke halaman
                ini.
              </>
            ) : (
              <>
                Atur tingkat, jurusan, dan pool (siswa belum rombel), lalu klik{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Generate simulasi
                </span>
                .
              </>
            )}
          </p>
        ) : null}
      </main>
    </div>
  );
}
