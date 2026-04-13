"use server";

import { resolveActiveAcademicYearId } from "@/app/actions/academic-years";
import { ARSIP_OTOMAT_NAMA, isAlumniArchiveYearNama } from "@/lib/arsip-constants";
import { denyIfSiswaAlumni } from "@/lib/auth/siswa-alumni-gate";
import type { GradeRow } from "@/app/actions/akademik";
import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";
import type { User } from "@supabase/supabase-js";

export type ArsipRiwayatKelas = {
  kelas_nama: string;
  status: string;
  created_at: string;
};

export type ArsipNilaiSemester = {
  semester: 1 | 2;
  rows: GradeRow[];
};

export type ArsipTahunBlok = {
  academic_year_id: string;
  nama: string;
  is_active: boolean;
  /** Judul kartu arsip (bahasa jelas, bukan nama mentah DB). */
  judulBlok: string;
  /** Subjudul: kelas & tingkat, atau penjelasan singkat. */
  detailBlok: string | null;
  /** Gabungan ringkas untuk kompatibilitas. */
  label: string;
  jumlahNilai: number;
  rataNilai: number | null;
  totalHadir: number;
  totalAlpa: number;
  totalIzin: number;
  totalSakit: number;
  jumlahPelanggaran: number;
  totalPoinPelanggaran: number;
  riwayat: ArsipRiwayatKelas[];
  nilaiSemesters: ArsipNilaiSemester[];
};

function assertAdmin(user: User | null): string | null {
  if (!user) return "Anda belum masuk.";
  if (isSiswaUser(user)) return "Akses ditolak.";
  return null;
}

function assertSiswa(user: User | null): string | null {
  if (!user) return "Anda belum masuk.";
  if (!isSiswaUser(user)) return "Hanya untuk akun siswa.";
  return null;
}

type KelasNamaTingkat = { nama: string; tingkat: number | null };

/** Tingkat 10–12 dari awalan nama rombel (X / XI / XII), jika kolom tingkat kosong. */
function inferTingkatDariNamaKelas(nama: string): number | null {
  const s = nama.trim();
  if (/^\s*XII\b/i.test(s)) return 12;
  if (/^\s*XI\b/i.test(s)) return 11;
  if (/^\s*X\b/i.test(s)) return 10;
  return null;
}

/**
 * Nama rombel di tingkat lebih rendah (mis. "XI Bahasa 1" + tingkat 11 → target 10 → "X Bahasa 1").
 * Hanya pola awalan X / XI / XII yang didukung.
 */
function namaKelasPadaTingkatLebihRendah(
  namaSaatIni: string,
  tingkatSaatIni: number,
  tingkatTarget: number
): string | null {
  if (
    tingkatTarget < 10 ||
    tingkatTarget > 12 ||
    tingkatSaatIni < 10 ||
    tingkatSaatIni > 12 ||
    tingkatSaatIni <= tingkatTarget
  ) {
    return null;
  }
  let n = namaSaatIni.trim();
  let t = tingkatSaatIni;
  while (t > tingkatTarget) {
    if (t === 12) {
      if (!/^\s*XII\b/i.test(n)) return null;
      n = n.replace(/^\s*XII\b/i, "XI");
      t = 11;
    } else if (t === 11) {
      if (!/^\s*XI\b/i.test(n)) return null;
      n = n.replace(/^\s*XI\b/i, "X");
      t = 10;
    } else {
      return null;
    }
  }
  return t === tingkatTarget ? n : null;
}

function resolveTingkatKelas(nama: string, tingkatDb: number | null | undefined): number | null {
  const t = Number(tingkatDb);
  if (Number.isFinite(t) && t >= 10 && t <= 12) return t;
  return inferTingkatDariNamaKelas(nama);
}

/** Nama rombel untuk tingkat arsip: riwayat dulu, lalu turun dari nama kelas sekarang. */
function kelasNamaUntukTingkatArsip(
  minTingkat: number,
  kelasPerTingkat: Map<number, string>,
  kelasSekarangNama: string | null,
  kelasSekarangTingkat: number | null
): string | null {
  const dariRiwayat = kelasPerTingkat.get(minTingkat);
  if (dariRiwayat) return dariRiwayat;
  if (!kelasSekarangNama) return null;
  const curT = resolveTingkatKelas(kelasSekarangNama, kelasSekarangTingkat);
  if (curT == null) return null;
  return namaKelasPadaTingkatLebihRendah(kelasSekarangNama, curT, minTingkat);
}

/** Nama kelas terakhir per tingkat (urut waktu naik kelas + kelas asal dari kenaikan). */
function kelasTerakhirPerTingkatFromHist(
  rows: {
    created_at: string;
    kelas: KelasNamaTingkat | KelasNamaTingkat[] | null;
    kelas_asal?: KelasNamaTingkat | KelasNamaTingkat[] | null;
  }[]
): Map<number, string> {
  const m = new Map<number, string>();
  const apply = (node: KelasNamaTingkat | null | undefined) => {
    if (!node) return;
    const nm = String(node.nama ?? "").trim();
    if (!nm) return;
    let t = Number(node.tingkat);
    if (!Number.isFinite(t) || t < 10 || t > 12) {
      t = inferTingkatDariNamaKelas(nm) ?? NaN;
    }
    if (!Number.isFinite(t) || t < 10 || t > 12) return;
    m.set(t, nm);
  };
  for (const h of rows) {
    const asalRaw = h.kelas_asal;
    const asal = Array.isArray(asalRaw) ? asalRaw[0] : asalRaw;
    apply(asal ?? undefined);
    const kl = h.kelas;
    const k = Array.isArray(kl) ? kl[0] : kl;
    apply(k ?? undefined);
  }
  return m;
}

function judulArsipNamaDb(raw: string): string {
  const t = raw.trim();
  if (t === ARSIP_OTOMAT_NAMA) return "";
  if (isAlumniArchiveYearNama(t)) return "Arsip alumni (kelulusan)";
  if (/migrasi/i.test(t) || /\bdefault\b/i.test(t)) {
    return "Data sekolah (tahun lalu)";
  }
  if (/^arsip /i.test(t)) return t;
  return `Arsip · ${t}`;
}

async function resolveSiswaStudentId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User
): Promise<{ id: string | null; error: string | null }> {
  const sid = String(user.user_metadata?.student_id ?? "").trim();
  let st = supabase.from("students").select("id").limit(1);
  st = sid ? st.eq("id", sid) : st.eq("user_id", user.id);
  const { data: stu, error } = await st.maybeSingle();
  if (error) return { id: null, error: error.message };
  if (!stu) return { id: null, error: "Data siswa tidak ditemukan." };
  return { id: String(stu.id), error: null };
}

export type ArsipBuildMode =
  | "full"
  | "siswa_hide_alumni"
  | "alumni_only"
  /** Admin arsip alumni: semua blok (X–XII + arsip kelulusan), tanpa memaksakan tahun aktif jika siswa tidak punya data di sana. */
  | "admin_alumni_full";

async function buildArchiveBlocks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  mode: ArsipBuildMode = "full"
): Promise<{
  blocks: ArsipTahunBlok[];
  activeAcademicYearId: string | null;
  error: string | null;
}> {
  const activeId = await resolveActiveAcademicYearId();

  const [arY, attY, violY, histY] = await Promise.all([
    supabase
      .from("academic_records")
      .select("academic_year_id")
      .eq("student_id", studentId),
    supabase
      .from("attendance_records")
      .select("academic_year_id")
      .eq("student_id", studentId),
    supabase
      .from("violation_records")
      .select("academic_year_id")
      .eq("student_id", studentId),
    supabase
      .from("class_histories")
      .select("academic_year_id")
      .eq("student_id", studentId),
  ]);

  if (arY.error) return { blocks: [], activeAcademicYearId: activeId, error: arY.error.message };
  if (attY.error) return { blocks: [], activeAcademicYearId: activeId, error: attY.error.message };
  if (violY.error) {
    return {
      blocks: [],
      activeAcademicYearId: activeId,
      error: violY.error.message.includes("academic_year_id")
        ? "Jalankan sql/migration_violation_academic_year.sql untuk arsip pelanggaran."
        : violY.error.message,
    };
  }
  if (histY.error) return { blocks: [], activeAcademicYearId: activeId, error: histY.error.message };

  const yearSet = new Set<string>();
  for (const r of arY.data ?? []) {
    const y = r.academic_year_id as string | null;
    if (y) yearSet.add(String(y));
  }
  for (const r of attY.data ?? []) {
    const y = r.academic_year_id as string | null;
    if (y) yearSet.add(String(y));
  }
  for (const r of violY.data ?? []) {
    const y = r.academic_year_id as string | null;
    if (y) yearSet.add(String(y));
  }
  for (const r of histY.data ?? []) {
    const y = r.academic_year_id as string | null;
    if (y) yearSet.add(String(y));
  }
  // Alumni (admin): jangan tambahkan tahun aktif bila tidak ada data siswa di tahun itu — hindari kartu "berjalan" kosong.
  if (activeId && mode !== "admin_alumni_full") yearSet.add(activeId);

  const yearIds = [...yearSet];
  if (yearIds.length === 0) {
    return { blocks: [], activeAcademicYearId: activeId, error: null };
  }

  const { data: years, error: yErr } = await supabase
    .from("academic_years")
    .select("id, nama, is_active, created_at")
    .in("id", yearIds)
    .order("created_at", { ascending: false });

  if (yErr) return { blocks: [], activeAcademicYearId: activeId, error: yErr.message };

  let effYears = [...(years ?? [])];
  if (mode === "siswa_hide_alumni") {
    effYears = effYears.filter((y) => !isAlumniArchiveYearNama(String(y.nama ?? "")));
  } else if (mode === "alumni_only") {
    effYears = effYears.filter((y) => isAlumniArchiveYearNama(String(y.nama ?? "")));
  }
  const effYearIds = effYears.map((y) => String(y.id));
  if (effYearIds.length === 0) {
    return { blocks: [], activeAcademicYearId: activeId, error: null };
  }

  const [{ data: recs }, { data: atts }, { data: viols }, { data: hists }] =
    await Promise.all([
      supabase
        .from("academic_records")
        .select(
          "academic_year_id, semester, nilai, subject_id, subjects ( nama_mapel, kkm, tingkat_kelas )"
        )
        .eq("student_id", studentId)
        .in("academic_year_id", effYearIds),
      supabase
        .from("attendance_records")
        .select("academic_year_id, hadir, alpa, izin, sakit")
        .eq("student_id", studentId)
        .in("academic_year_id", effYearIds),
      supabase
        .from("violation_records")
        .select("academic_year_id, poin")
        .eq("student_id", studentId)
        .in("academic_year_id", effYearIds),
      supabase
        .from("class_histories")
        .select(
          "academic_year_id, status, created_at, kelas ( nama, tingkat ), kelas_asal:kelas_asal_id ( nama, tingkat )"
        )
        .eq("student_id", studentId)
        .in("academic_year_id", effYearIds)
        .order("created_at", { ascending: false }),
    ]);

  type Agg = {
    nilaiCount: number;
    nilaiSum: number;
    hadir: number;
    alpa: number;
    izin: number;
    sakit: number;
    violCount: number;
    violPoin: number;
    s1: GradeRow[];
    s2: GradeRow[];
    riwayat: ArsipRiwayatKelas[];
  };

  const minTingkatNilaiPerYear = new Map<string, number>();

  const agg = new Map<string, Agg>();
  const ensure = (yid: string): Agg => {
    let a = agg.get(yid);
    if (!a) {
      a = {
        nilaiCount: 0,
        nilaiSum: 0,
        hadir: 0,
        alpa: 0,
        izin: 0,
        sakit: 0,
        violCount: 0,
        violPoin: 0,
        s1: [],
        s2: [],
        riwayat: [],
      };
      agg.set(yid, a);
    }
    return a;
  };

  for (const r of recs ?? []) {
    const yid = String(r.academic_year_id ?? "");
    if (!yid) continue;
    const a = ensure(yid);
    const nv = Number(r.nilai);
    if (Number.isFinite(nv)) {
      a.nilaiCount += 1;
      a.nilaiSum += nv;
    }
    const sub = r.subjects as
      | {
          nama_mapel: string;
          kkm: number | string | null;
          tingkat_kelas?: number | null;
        }
      | {
          nama_mapel: string;
          kkm: number | string | null;
          tingkat_kelas?: number | null;
        }[]
      | null;
    const subObj = Array.isArray(sub) ? sub[0] : sub;
    const sidSub = r.subject_id as string | null;
    if (!subObj || !sidSub) continue;
    const tkMapel = Number(subObj.tingkat_kelas);
    if (Number.isFinite(tkMapel) && tkMapel >= 10 && tkMapel <= 12) {
      const prev = minTingkatNilaiPerYear.get(yid);
      if (prev === undefined || tkMapel < prev) {
        minTingkatNilaiPerYear.set(yid, tkMapel);
      }
    }
    const sem = Number(r.semester) === 2 ? 2 : 1;
    const row: GradeRow = {
      subject_id: String(sidSub),
      nama_mapel: String(subObj.nama_mapel ?? ""),
      kkm: Number(subObj.kkm ?? 75),
      nilai: Number.isFinite(nv) ? nv : null,
    };
    if (sem === 2) a.s2.push(row);
    else a.s1.push(row);
  }

  for (const r of atts ?? []) {
    const yid = String(r.academic_year_id ?? "");
    if (!yid) continue;
    const a = ensure(yid);
    a.hadir += Number(r.hadir) || 0;
    a.alpa += Number(r.alpa) || 0;
    a.izin += Number(r.izin) || 0;
    a.sakit += Number(r.sakit) || 0;
  }

  for (const r of viols ?? []) {
    const yid = String(r.academic_year_id ?? "");
    if (!yid) continue;
    const a = ensure(yid);
    a.violCount += 1;
    a.violPoin += Number(r.poin) || 0;
  }

  for (const h of hists ?? []) {
    const yid = String(h.academic_year_id ?? "");
    if (!yid) continue;
    const a = ensure(yid);
    const kl = h.kelas as { nama: string } | { nama: string }[] | null;
    const kn = Array.isArray(kl) ? kl[0]?.nama : kl?.nama;
    const asalRaw = (h as { kelas_asal?: { nama: string } | { nama: string }[] | null })
      .kelas_asal;
    const ka = Array.isArray(asalRaw) ? asalRaw[0]?.nama : asalRaw?.nama;
    const asalStr = String(ka ?? "").trim();
    const tujuanStr = String(kn ?? "—").trim();
    const labelRiwayat =
      asalStr && tujuanStr && tujuanStr !== "—"
        ? `${asalStr} → ${tujuanStr}`
        : tujuanStr || "—";
    a.riwayat.push({
      kelas_nama: labelRiwayat,
      status: String(h.status ?? ""),
      created_at: String(h.created_at ?? ""),
    });
  }

  const { data: histTimeline } = await supabase
    .from("class_histories")
    .select(
      "created_at, kelas ( nama, tingkat ), kelas_asal:kelas_asal_id ( nama, tingkat )"
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: true });

  const kelasPerTingkat = kelasTerakhirPerTingkatFromHist(histTimeline ?? []);

  const { data: stKelasRow } = await supabase
    .from("students")
    .select("kelas_id, kelas ( nama, tingkat )")
    .eq("id", studentId)
    .maybeSingle();

  const kCur = stKelasRow?.kelas as
    | { nama: string; tingkat: number | null }
    | { nama: string; tingkat: number | null }[]
    | null;
  const kObj = Array.isArray(kCur) ? kCur[0] : kCur;
  const kelasSekarangNama = String(kObj?.nama ?? "").trim() || null;
  const kelasSekarangTingkat = (() => {
    const t = Number(kObj?.tingkat);
    return Number.isFinite(t) ? t : null;
  })();

  const blocks: ArsipTahunBlok[] = effYears.map((y) => {
    const id = String(y.id);
    const a = agg.get(id) ?? {
      nilaiCount: 0,
      nilaiSum: 0,
      hadir: 0,
      alpa: 0,
      izin: 0,
      sakit: 0,
      violCount: 0,
      violPoin: 0,
      s1: [],
      s2: [],
      riwayat: [],
    };
    a.s1.sort((x, b) => x.nama_mapel.localeCompare(b.nama_mapel, "id"));
    a.s2.sort((x, b) => x.nama_mapel.localeCompare(b.nama_mapel, "id"));
    const rawNama = String(y.nama ?? "");
    const minTingkat = minTingkatNilaiPerYear.get(id) ?? null;

    let judulBlok: string;
    let detailBlok: string | null = null;

    if (y.is_active) {
      judulBlok = "Tahun pelajaran berjalan (kelas sekarang)";
      if (kelasSekarangNama && kelasSekarangTingkat != null) {
        detailBlok = `Kelas ${kelasSekarangNama} · tingkat ${kelasSekarangTingkat}`;
      } else if (kelasSekarangNama) {
        detailBlok = `Kelas ${kelasSekarangNama}`;
      } else {
        detailBlok = "Belum ada penempatan kelas";
      }
    } else if (rawNama === ARSIP_OTOMAT_NAMA) {
      judulBlok = "Arsip waktu di kelas sebelumnya";
      if (minTingkat != null) {
        const knAr = kelasNamaUntukTingkatArsip(
          minTingkat,
          kelasPerTingkat,
          kelasSekarangNama,
          kelasSekarangTingkat
        );
        detailBlok = knAr
          ? `Kelas sebelumnya: ${knAr} (tingkat ${minTingkat})`
          : `Nilai & kehadiran tingkat ${minTingkat} — nama rombel untuk tingkat itu belum muncul di riwayat penempatan`;
      } else {
        detailBlok = "Nilai, kehadiran, dan pelanggaran sebelum naik kelas";
      }
    } else if (isAlumniArchiveYearNama(rawNama)) {
      judulBlok = "Arsip alumni (kelulusan)";
      const ang = rawNama.match(/Angkatan\s+(\d{4})/i)?.[1];
      detailBlok = ang
        ? `Angkatan ${ang} — rekap nilai, kehadiran, dan pelanggaran di rombel terakhir (kelas XII)`
        : rawNama.trim();
    } else {
      judulBlok = judulArsipNamaDb(rawNama) || `Arsip · ${rawNama}`;
      const kn = a.riwayat[0]?.kelas_nama?.trim();
      if (kn && kn !== "—") {
        detailBlok = `Riwayat kelas: ${kn}`;
      } else if (minTingkat != null) {
        const knAr = kelasNamaUntukTingkatArsip(
          minTingkat,
          kelasPerTingkat,
          kelasSekarangNama,
          kelasSekarangTingkat
        );
        detailBlok = knAr
          ? `Tingkat ${minTingkat} · kelas ${knAr}`
          : `Pelajaran tingkat ${minTingkat}`;
      }
    }

    const label = detailBlok ? `${judulBlok} · ${detailBlok}` : judulBlok;
    const rata =
      a.nilaiCount > 0 ? Math.round((a.nilaiSum / a.nilaiCount) * 100) / 100 : null;
    const nilaiSemesters: ArsipNilaiSemester[] = [];
    if (a.s1.length) nilaiSemesters.push({ semester: 1, rows: a.s1 });
    if (a.s2.length) nilaiSemesters.push({ semester: 2, rows: a.s2 });
    return {
      academic_year_id: id,
      nama: String(y.nama ?? ""),
      is_active: Boolean(y.is_active),
      judulBlok,
      detailBlok,
      label,
      jumlahNilai: a.nilaiCount,
      rataNilai: rata,
      totalHadir: a.hadir,
      totalAlpa: a.alpa,
      totalIzin: a.izin,
      totalSakit: a.sakit,
      jumlahPelanggaran: a.violCount,
      totalPoinPelanggaran: a.violPoin,
      riwayat: a.riwayat,
      nilaiSemesters,
    };
  });

  return { blocks, activeAcademicYearId: activeId, error: null };
}

/** Arsip untuk portal siswa: tidak menampilkan bucket kelulusan (Alumni). */
export async function getMyArsipOverview(): Promise<{
  blocks: ArsipTahunBlok[];
  activeAcademicYearId: string | null;
  error: string | null;
  isAlumni: boolean;
  angkatanLulus: number | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertSiswa(auth.user);
  if (deny) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      error: deny,
      isAlumni: false,
      angkatanLulus: null,
    };
  }

  const alumniDeny = await denyIfSiswaAlumni(supabase, auth.user);
  if (alumniDeny) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      error: alumniDeny,
      isAlumni: true,
      angkatanLulus: null,
    };
  }

  const { id: studentId, error: sidErr } = await resolveSiswaStudentId(
    supabase,
    auth.user!
  );
  if (sidErr || !studentId) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      error: sidErr ?? "Siswa tidak ditemukan.",
      isAlumni: false,
      angkatanLulus: null,
    };
  }

  const { data: stFlags } = await supabase
    .from("students")
    .select("is_alumni, angkatan_lulus")
    .eq("id", studentId)
    .maybeSingle();

  const { blocks, activeAcademicYearId, error } = await buildArchiveBlocks(
    supabase,
    studentId,
    "siswa_hide_alumni"
  );
  const ang = stFlags?.angkatan_lulus;
  return {
    blocks,
    activeAcademicYearId,
    error,
    isAlumni: Boolean(stFlags?.is_alumni),
    angkatanLulus: ang != null && Number.isFinite(Number(ang)) ? Number(ang) : null,
  };
}

/** Arsip lengkap untuk satu siswa (admin / staf). */
export async function getStudentArsipOverview(studentId: string): Promise<{
  blocks: ArsipTahunBlok[];
  activeAcademicYearId: string | null;
  siswaNama: string | null;
  siswaNisn: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: null,
      siswaNisn: null,
      error: deny,
    };
  }

  const sid = String(studentId ?? "").trim();
  if (!sid) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: null,
      siswaNisn: null,
      error: "ID siswa tidak valid.",
    };
  }

  const { data: stu, error: e1 } = await supabase
    .from("students")
    .select("id, nama, nisn")
    .eq("id", sid)
    .maybeSingle();
  if (e1) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: null,
      siswaNisn: null,
      error: e1.message,
    };
  }
  if (!stu) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: null,
      siswaNisn: null,
      error: "Siswa tidak ditemukan.",
    };
  }

  const { blocks, activeAcademicYearId, error } = await buildArchiveBlocks(
    supabase,
    sid,
    "full"
  );
  return {
    blocks,
    activeAcademicYearId,
    siswaNama: String(stu.nama ?? ""),
    siswaNisn: String(stu.nisn ?? ""),
    error,
  };
}

/** Arsip alumni admin: semua tahun ajaran terkait siswa (kelas X–XII + arsip kelulusan). */
export async function getStudentAlumniArsipOverview(studentId: string): Promise<{
  blocks: ArsipTahunBlok[];
  activeAcademicYearId: string | null;
  siswaNama: string | null;
  siswaNisn: string | null;
  angkatanLulus: number | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: null,
      siswaNisn: null,
      angkatanLulus: null,
      error: deny,
    };
  }

  const sid = String(studentId ?? "").trim();
  if (!sid) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: null,
      siswaNisn: null,
      angkatanLulus: null,
      error: "ID siswa tidak valid.",
    };
  }

  const { data: stu, error: e1 } = await supabase
    .from("students")
    .select("id, nama, nisn, is_alumni, angkatan_lulus")
    .eq("id", sid)
    .maybeSingle();
  if (e1) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: null,
      siswaNisn: null,
      angkatanLulus: null,
      error: e1.message,
    };
  }
  if (!stu) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: null,
      siswaNisn: null,
      angkatanLulus: null,
      error: "Siswa tidak ditemukan.",
    };
  }
  if (!Boolean(stu.is_alumni)) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: String(stu.nama ?? ""),
      siswaNisn: String(stu.nisn ?? ""),
      angkatanLulus: null,
      error: "Hanya untuk siswa yang sudah ditandai sebagai alumni.",
    };
  }

  const { blocks, activeAcademicYearId, error } = await buildArchiveBlocks(
    supabase,
    sid,
    "admin_alumni_full"
  );
  const ang = stu.angkatan_lulus;
  return {
    blocks,
    activeAcademicYearId,
    siswaNama: String(stu.nama ?? ""),
    siswaNisn: String(stu.nisn ?? ""),
    angkatanLulus: ang != null && Number.isFinite(Number(ang)) ? Number(ang) : null,
    error,
  };
}

/** Arsip alumni lengkap untuk siswa yang login (setara admin Arsip alumni, hanya data sendiri). */
export async function getMyAlumniArsipOverview(): Promise<{
  blocks: ArsipTahunBlok[];
  activeAcademicYearId: string | null;
  siswaNama: string | null;
  siswaNisn: string | null;
  angkatanLulus: number | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertSiswa(auth.user);
  if (deny) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: null,
      siswaNisn: null,
      angkatanLulus: null,
      error: deny,
    };
  }

  const user = auth.user!;
  const { id: studentId, error: sidErr } = await resolveSiswaStudentId(
    supabase,
    user
  );
  if (sidErr || !studentId) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: null,
      siswaNisn: null,
      angkatanLulus: null,
      error: sidErr ?? "Siswa tidak ditemukan.",
    };
  }

  const { data: stu, error: e1 } = await supabase
    .from("students")
    .select("id, nama, nisn, is_alumni, angkatan_lulus")
    .eq("id", studentId)
    .maybeSingle();
  if (e1) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: null,
      siswaNisn: null,
      angkatanLulus: null,
      error: e1.message,
    };
  }
  if (!stu) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: null,
      siswaNisn: null,
      angkatanLulus: null,
      error: "Siswa tidak ditemukan.",
    };
  }
  if (!Boolean(stu.is_alumni)) {
    return {
      blocks: [],
      activeAcademicYearId: null,
      siswaNama: String(stu.nama ?? ""),
      siswaNisn: String(stu.nisn ?? ""),
      angkatanLulus: null,
      error: "Menu ini hanya untuk alumni. Gunakan Arsip saya di portal siswa.",
    };
  }

  const { blocks, activeAcademicYearId, error } = await buildArchiveBlocks(
    supabase,
    studentId,
    "admin_alumni_full"
  );
  const ang = stu.angkatan_lulus;
  return {
    blocks,
    activeAcademicYearId,
    siswaNama: String(stu.nama ?? ""),
    siswaNisn: String(stu.nisn ?? ""),
    angkatanLulus: ang != null && Number.isFinite(Number(ang)) ? Number(ang) : null,
    error,
  };
}
