"use server";

import { resolveActiveAcademicYearId } from "@/app/actions/academic-years";
import { ARSIP_OTOMAT_NAMA } from "@/lib/arsip-constants";
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

async function buildArchiveBlocks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string
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
  if (activeId) yearSet.add(activeId);

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

  const [{ data: recs }, { data: atts }, { data: viols }, { data: hists }] =
    await Promise.all([
      supabase
        .from("academic_records")
        .select(
          "academic_year_id, semester, nilai, subject_id, subjects ( nama_mapel, kkm )"
        )
        .eq("student_id", studentId)
        .in("academic_year_id", yearIds),
      supabase
        .from("attendance_records")
        .select("academic_year_id, hadir, alpa, izin, sakit")
        .eq("student_id", studentId)
        .in("academic_year_id", yearIds),
      supabase
        .from("violation_records")
        .select("academic_year_id, poin")
        .eq("student_id", studentId)
        .in("academic_year_id", yearIds),
      supabase
        .from("class_histories")
        .select("academic_year_id, status, created_at, kelas ( nama )")
        .eq("student_id", studentId)
        .in("academic_year_id", yearIds)
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
      | { nama_mapel: string; kkm: number | string | null }
      | { nama_mapel: string; kkm: number | string | null }[]
      | null;
    const subObj = Array.isArray(sub) ? sub[0] : sub;
    const sidSub = r.subject_id as string | null;
    if (!subObj || !sidSub) continue;
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
    a.riwayat.push({
      kelas_nama: String(kn ?? "—"),
      status: String(h.status ?? ""),
      created_at: String(h.created_at ?? ""),
    });
  }

  /** Riwayat penempatan untuk bucket arsip otomatis disimpan di tahun aktif, jadi riwayat bucket ini kosong — ambil kelas “asal” dari urutan terawal di tahun aktif. */
  let otomatisKelasHint: string | null = null;
  const needsOtomatisHint = (years ?? []).some(
    (y) => String(y.nama ?? "") === ARSIP_OTOMAT_NAMA
  );
  if (needsOtomatisHint && activeId) {
    const { data: chEarly, error: chErr } = await supabase
      .from("class_histories")
      .select("kelas ( nama )")
      .eq("student_id", studentId)
      .eq("academic_year_id", activeId)
      .order("created_at", { ascending: true })
      .limit(1);
    if (!chErr && chEarly?.length) {
      const kl = chEarly[0].kelas as { nama: string } | { nama: string }[] | null;
      const nm = Array.isArray(kl) ? kl[0]?.nama : kl?.nama;
      const s = String(nm ?? "").trim();
      if (s) otomatisKelasHint = s;
    }
  }

  const blocks: ArsipTahunBlok[] = (years ?? []).map((y) => {
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
    let kn = a.riwayat[0]?.kelas_nama?.trim() || "";
    if (
      (!kn || kn === "—") &&
      String(y.nama ?? "") === ARSIP_OTOMAT_NAMA &&
      otomatisKelasHint
    ) {
      kn = otomatisKelasHint;
    }
    const label = kn ? `${String(y.nama ?? "")} · ${kn}` : String(y.nama ?? "");
    const rata =
      a.nilaiCount > 0 ? Math.round((a.nilaiSum / a.nilaiCount) * 100) / 100 : null;
    const nilaiSemesters: ArsipNilaiSemester[] = [];
    if (a.s1.length) nilaiSemesters.push({ semester: 1, rows: a.s1 });
    if (a.s2.length) nilaiSemesters.push({ semester: 2, rows: a.s2 });
    return {
      academic_year_id: id,
      nama: String(y.nama ?? ""),
      is_active: Boolean(y.is_active),
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

/** Arsip lengkap untuk siswa yang sedang login. */
export async function getMyArsipOverview(): Promise<{
  blocks: ArsipTahunBlok[];
  activeAcademicYearId: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertSiswa(auth.user);
  if (deny) return { blocks: [], activeAcademicYearId: null, error: deny };

  const { id: studentId, error: sidErr } = await resolveSiswaStudentId(
    supabase,
    auth.user!
  );
  if (sidErr || !studentId) {
    return { blocks: [], activeAcademicYearId: null, error: sidErr ?? "Siswa tidak ditemukan." };
  }

  return buildArchiveBlocks(supabase, studentId);
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
    sid
  );
  return {
    blocks,
    activeAcademicYearId,
    siswaNama: String(stu.nama ?? ""),
    siswaNisn: String(stu.nisn ?? ""),
    error,
  };
}
