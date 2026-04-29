"use server";

import { resolveActiveAcademicYearId } from "@/app/actions/academic-years";
import { ADMIN_SEMUA_KELAS } from "@/lib/admin-kelas-filter";
import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AnalisisBobot = {
  nilai: number;       // 0-100
  kehadiran: number;   // 0-100
  pelanggaran: number; // 0-100
};

export type AnalisisSiswaRow = {
  id: string;
  nama: string;
  nisn: string;
  kelas: string | null;
  kelasId: string | null;
  /* Raw values */
  nilaiRata: number;
  persenKehadiran: number;
  totalPoinPelanggaran: number;
  /* Normalized SAW */
  normNilai: number;
  normKehadiran: number;
  normPelanggaran: number;
  /* Final */
  skorAkhir: number;
  rank: number;
};

/* ------------------------------------------------------------------ */
/*  Main action                                                        */
/* ------------------------------------------------------------------ */

const CHUNK = 400;

export async function getAnalisisRanking(
  kelasIdFilter: string,
  semester: 0 | 1 | 2,
  bobot: AnalisisBobot
): Promise<{
  rows: AnalisisSiswaRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { rows: [], error: "Anda belum masuk." };
  if (isSiswaUser(auth.user)) return { rows: [], error: "Akses ditolak." };

  const f = String(kelasIdFilter ?? "").trim();
  if (!f) return { rows: [], error: "Pilih kelas terlebih dahulu." };

  const loadAll = f === ADMIN_SEMUA_KELAS;
  const tingkatMatch = f.match(/^TINGKAT_(\d+)$/);
  const filterTingkat = tingkatMatch ? Number(tingkatMatch[1]) : null;

  /* --- 1. Fetch students ----------------------------------------- */
  let stQuery = supabase
    .from("students")
    .select("id, nisn, nama, kelas_id")
    .order("nama", { ascending: true });

  if (filterTingkat) {
    // Get all kelas IDs for this tingkat first
    const { data: kelasForTingkat, error: ktErr } = await supabase
      .from("kelas")
      .select("id")
      .eq("tingkat", filterTingkat);
    if (ktErr) return { rows: [], error: ktErr.message };
    const tKelasIds = (kelasForTingkat ?? []).map((k) => String(k.id));
    if (tKelasIds.length === 0)
      return { rows: [], error: `Tidak ada kelas untuk tingkat ${filterTingkat}.` };
    stQuery = stQuery.in("kelas_id", tKelasIds);
  } else if (!loadAll) {
    stQuery = stQuery.eq("kelas_id", f);
  }

  const { data: students, error: stErr } = await stQuery;
  if (stErr) return { rows: [], error: stErr.message };
  if (!students?.length) return { rows: [], error: null };

  /* --- 2. Fetch kelas names -------------------------------------- */
  const kelasIds = [
    ...new Set(
      students
        .map((s) => s.kelas_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const kelasMap = new Map<string, string>();
  if (kelasIds.length > 0) {
    const { data: kelasRows } = await supabase
      .from("kelas")
      .select("id, nama")
      .in("id", kelasIds);
    for (const k of kelasRows ?? []) {
      kelasMap.set(k.id as string, k.nama as string);
    }
  }

  /* --- 3. Resolve academic year ---------------------------------- */
  const activeYearId = await resolveActiveAcademicYearId();

  /* --- 4. Fetch academic_records, attendance_records, violation_records */
  const studentIds = students.map((s) => String(s.id));

  // Maps for aggregation
  const nilaiByStudent = new Map<string, number[]>();
  const attendanceByStudent = new Map<
    string,
    { hadir: number; alpa: number; izin: number; sakit: number }
  >();
  const poinByStudent = new Map<string, number>();

  for (let i = 0; i < studentIds.length; i += CHUNK) {
    const chunk = studentIds.slice(i, i + CHUNK);

    /* Academic records (for this semester) */
    let acadQ = supabase
      .from("academic_records")
      .select("student_id, nilai")
      .in("student_id", chunk);
    if (semester !== 0) acadQ = acadQ.eq("semester", semester);
    if (activeYearId) acadQ = acadQ.eq("academic_year_id", activeYearId);
    const { data: acadPart, error: aErr } = await acadQ;
    if (aErr) return { rows: [], error: aErr.message };
    for (const r of acadPart ?? []) {
      const sid = r.student_id as string;
      const n = Number(r.nilai);
      if (!Number.isFinite(n)) continue;
      if (!nilaiByStudent.has(sid)) nilaiByStudent.set(sid, []);
      nilaiByStudent.get(sid)!.push(n);
    }

    /* Attendance records (for this semester) */
    let attQ = supabase
      .from("attendance_records")
      .select("student_id, hadir, alpa, izin, sakit")
      .in("student_id", chunk);
    if (semester !== 0) attQ = attQ.eq("semester", semester);
    if (activeYearId) attQ = attQ.eq("academic_year_id", activeYearId);
    const { data: attPart, error: atErr } = await attQ;
    if (atErr) return { rows: [], error: atErr.message };
    for (const r of attPart ?? []) {
      const sid = r.student_id as string;
      const prev = attendanceByStudent.get(sid) ?? {
        hadir: 0,
        alpa: 0,
        izin: 0,
        sakit: 0,
      };
      prev.hadir += Number(r.hadir) || 0;
      prev.alpa += Number(r.alpa) || 0;
      prev.izin += Number(r.izin) || 0;
      prev.sakit += Number(r.sakit) || 0;
      attendanceByStudent.set(sid, prev);
    }

    /* Violation records (for this semester) */
    let violQ = supabase
      .from("violation_records")
      .select("student_id, poin")
      .in("student_id", chunk);
    if (semester !== 0) violQ = violQ.eq("semester", semester);
    if (activeYearId) violQ = violQ.eq("academic_year_id", activeYearId);
    const { data: violPart, error: vErr } = await violQ;
    if (vErr) return { rows: [], error: vErr.message };
    for (const r of violPart ?? []) {
      const sid = r.student_id as string;
      const p = Number(r.poin) || 0;
      poinByStudent.set(sid, (poinByStudent.get(sid) ?? 0) + p);
    }
  }

  /* --- 5. Build raw value array ---------------------------------- */
  type RawRow = {
    id: string;
    nama: string;
    nisn: string;
    kelas: string | null;
    kelasId: string | null;
    nilaiRata: number;
    persenKehadiran: number;
    totalPoinPelanggaran: number;
  };

  const raw: RawRow[] = students.map((s) => {
    const sid = s.id as string;
    const kelasId = s.kelas_id as string | null;

    // Nilai rata-rata
    const nilaiArr = nilaiByStudent.get(sid) ?? [];
    const nilaiRata =
      nilaiArr.length > 0
        ? nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length
        : 0;

    // Persentase kehadiran
    const att = attendanceByStudent.get(sid);
    let persenKehadiran = 0;
    if (att) {
      const total = att.hadir + att.alpa + att.izin + att.sakit;
      persenKehadiran = total > 0 ? (att.hadir / total) * 100 : 0;
    }

    // Total poin pelanggaran
    const totalPoinPelanggaran = poinByStudent.get(sid) ?? 0;

    return {
      id: sid,
      nama: String(s.nama ?? ""),
      nisn: String(s.nisn ?? ""),
      kelas: kelasId ? kelasMap.get(kelasId) ?? null : null,
      kelasId,
      nilaiRata,
      persenKehadiran,
      totalPoinPelanggaran,
    };
  });

  /* --- 6. SAW normalization -------------------------------------- */
  // Find max/min for normalization
  const maxNilai = Math.max(...raw.map((r) => r.nilaiRata), 0.001);
  const maxKehadiran = Math.max(...raw.map((r) => r.persenKehadiran), 0.001);
  const minPelanggaran = Math.min(...raw.map((r) => r.totalPoinPelanggaran));

  // Normalize weights to 0-1
  const totalBobot = bobot.nilai + bobot.kehadiran + bobot.pelanggaran;
  const wN = totalBobot > 0 ? bobot.nilai / totalBobot : 1 / 3;
  const wK = totalBobot > 0 ? bobot.kehadiran / totalBobot : 1 / 3;
  const wP = totalBobot > 0 ? bobot.pelanggaran / totalBobot : 1 / 3;

  const result: AnalisisSiswaRow[] = raw.map((r) => {
    // Benefit criterion: r_ij = x_ij / max(x_ij)
    const normNilai = maxNilai > 0 ? r.nilaiRata / maxNilai : 0;
    const normKehadiran =
      maxKehadiran > 0 ? r.persenKehadiran / maxKehadiran : 0;

    // Cost criterion: r_ij = min(x_ij) / x_ij
    // If totalPoinPelanggaran = 0, that's the best → score = 1
    let normPelanggaran: number;
    if (r.totalPoinPelanggaran === 0) {
      normPelanggaran = 1;
    } else {
      normPelanggaran =
        minPelanggaran >= 0
          ? minPelanggaran === 0
            ? 0 // if min is 0 but student has poin, they're worse than the best
            : minPelanggaran / r.totalPoinPelanggaran
          : 0;
    }
    // Special case: if ALL students have 0 violations, everyone gets 1
    if (minPelanggaran === 0 && r.totalPoinPelanggaran === 0) {
      normPelanggaran = 1;
    }

    const skorAkhir = wN * normNilai + wK * normKehadiran + wP * normPelanggaran;

    return {
      ...r,
      normNilai: Math.round(normNilai * 10000) / 10000,
      normKehadiran: Math.round(normKehadiran * 10000) / 10000,
      normPelanggaran: Math.round(normPelanggaran * 10000) / 10000,
      skorAkhir: Math.round(skorAkhir * 10000) / 10000,
      rank: 0,
    };
  });

  /* --- 7. Sort by skor descending & assign rank ------------------ */
  result.sort((a, b) => b.skorAkhir - a.skorAkhir || a.nama.localeCompare(b.nama, "id"));
  for (let i = 0; i < result.length; i++) {
    result[i].rank = i + 1;
  }

  return { rows: result, error: null };
}
