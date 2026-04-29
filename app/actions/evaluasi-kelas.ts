"use server";

import { resolveActiveAcademicYearId } from "@/app/actions/academic-years";
import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type EvalKelasBobot = {
  nilai: number;
  kehadiran: number;
  pelanggaran: number;
};

export type EvalKelasRow = {
  kelasId: string;
  namaKelas: string;
  tingkat: number;
  jumlahSiswa: number;
  /* Aggregated raw */
  avgNilai: number;
  avgKehadiran: number;
  avgPelanggaran: number;
  /* WP scores */
  skorS: number;
  skorV: number;
  rank: number;
  /** Kategori: Sangat Baik / Baik / Cukup / Perlu Perhatian */
  kategori: string;
};

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

const CHUNK = 400;

export async function getEvaluasiKelas(
  semester: 0 | 1 | 2,
  bobot: EvalKelasBobot
): Promise<{
  rows: EvalKelasRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { rows: [], error: "Anda belum masuk." };
  if (isSiswaUser(auth.user)) return { rows: [], error: "Akses ditolak." };

  /* --- 1. Fetch all kelas --------------------------------------- */
  const { data: kelasList, error: kErr } = await supabase
    .from("kelas")
    .select("id, nama, tingkat")
    .order("tingkat", { ascending: true })
    .order("nama", { ascending: true });
  if (kErr) return { rows: [], error: kErr.message };
  if (!kelasList?.length) return { rows: [], error: "Belum ada kelas." };

  /* --- 2. Fetch all students with kelas_id --------------------- */
  const { data: allStudents, error: sErr } = await supabase
    .from("students")
    .select("id, kelas_id")
    .not("kelas_id", "is", null);
  if (sErr) return { rows: [], error: sErr.message };

  // Group students by kelas
  const studentsByKelas = new Map<string, string[]>();
  for (const s of allStudents ?? []) {
    const kid = s.kelas_id as string;
    if (!studentsByKelas.has(kid)) studentsByKelas.set(kid, []);
    studentsByKelas.get(kid)!.push(s.id as string);
  }

  const activeYearId = await resolveActiveAcademicYearId();

  /* --- 3. Fetch records for all students ----------------------- */
  const allSids = (allStudents ?? []).map((s) => String(s.id));

  const nilaiByStudent = new Map<string, number[]>();
  const attendanceByStudent = new Map<
    string,
    { hadir: number; alpa: number; izin: number; sakit: number }
  >();
  const poinByStudent = new Map<string, number>();

  for (let i = 0; i < allSids.length; i += CHUNK) {
    const chunk = allSids.slice(i, i + CHUNK);

    let acadQ = supabase
      .from("academic_records")
      .select("student_id, nilai")
      .in("student_id", chunk);
    if (semester !== 0) acadQ = acadQ.eq("semester", semester);
    if (activeYearId) acadQ = acadQ.eq("academic_year_id", activeYearId);
    const { data: acadPart } = await acadQ;
    for (const r of acadPart ?? []) {
      const sid = r.student_id as string;
      const n = Number(r.nilai);
      if (!Number.isFinite(n)) continue;
      if (!nilaiByStudent.has(sid)) nilaiByStudent.set(sid, []);
      nilaiByStudent.get(sid)!.push(n);
    }

    let attQ = supabase
      .from("attendance_records")
      .select("student_id, hadir, alpa, izin, sakit")
      .in("student_id", chunk);
    if (semester !== 0) attQ = attQ.eq("semester", semester);
    if (activeYearId) attQ = attQ.eq("academic_year_id", activeYearId);
    const { data: attPart } = await attQ;
    for (const r of attPart ?? []) {
      const sid = r.student_id as string;
      const prev = attendanceByStudent.get(sid) ?? { hadir: 0, alpa: 0, izin: 0, sakit: 0 };
      prev.hadir += Number(r.hadir) || 0;
      prev.alpa += Number(r.alpa) || 0;
      prev.izin += Number(r.izin) || 0;
      prev.sakit += Number(r.sakit) || 0;
      attendanceByStudent.set(sid, prev);
    }

    let violQ = supabase
      .from("violation_records")
      .select("student_id, poin")
      .in("student_id", chunk);
    if (semester !== 0) violQ = violQ.eq("semester", semester);
    if (activeYearId) violQ = violQ.eq("academic_year_id", activeYearId);
    const { data: violPart } = await violQ;
    for (const r of violPart ?? []) {
      const sid = r.student_id as string;
      poinByStudent.set(sid, (poinByStudent.get(sid) ?? 0) + (Number(r.poin) || 0));
    }
  }

  /* --- 4. Aggregate per kelas ---------------------------------- */
  type RawKelas = {
    kelasId: string;
    namaKelas: string;
    tingkat: number;
    jumlahSiswa: number;
    avgNilai: number;
    avgKehadiran: number;
    avgPelanggaran: number;
  };

  const rawKelas: RawKelas[] = [];

  for (const k of kelasList) {
    const kid = k.id as string;
    const sids = studentsByKelas.get(kid);
    if (!sids || sids.length === 0) continue;

    let sumNilai = 0, cntNilai = 0;
    let sumKehadiran = 0, cntKehadiran = 0;
    let sumPoin = 0;

    for (const sid of sids) {
      const arr = nilaiByStudent.get(sid);
      if (arr && arr.length > 0) {
        sumNilai += arr.reduce((a, b) => a + b, 0) / arr.length;
        cntNilai++;
      }
      const att = attendanceByStudent.get(sid);
      if (att) {
        const total = att.hadir + att.alpa + att.izin + att.sakit;
        if (total > 0) {
          sumKehadiran += (att.hadir / total) * 100;
          cntKehadiran++;
        }
      }
      sumPoin += poinByStudent.get(sid) ?? 0;
    }

    rawKelas.push({
      kelasId: kid,
      namaKelas: String(k.nama ?? ""),
      tingkat: Number(k.tingkat ?? 10),
      jumlahSiswa: sids.length,
      avgNilai: cntNilai > 0 ? sumNilai / cntNilai : 0,
      avgKehadiran: cntKehadiran > 0 ? sumKehadiran / cntKehadiran : 0,
      avgPelanggaran: sids.length > 0 ? sumPoin / sids.length : 0,
    });
  }

  if (rawKelas.length === 0) return { rows: [], error: null };

  /* --- 5. WP (Weighted Product) -------------------------------- */
  // Normalize bobot
  const totalW = bobot.nilai + bobot.kehadiran + bobot.pelanggaran;
  const w1 = totalW > 0 ? bobot.nilai / totalW : 1 / 3;       // benefit (+)
  const w2 = totalW > 0 ? bobot.kehadiran / totalW : 1 / 3;    // benefit (+)
  const w3 = totalW > 0 ? bobot.pelanggaran / totalW : 1 / 3;  // cost (-)

  // S_i = (C1^w1) * (C2^w2) * (C3^(-w3))
  // For cost, we use negative exponent
  // Handle 0 values: if avgPelanggaran = 0, treat as epsilon
  const eps = 0.001;

  const sScores: number[] = rawKelas.map((r) => {
    const c1 = Math.max(r.avgNilai, eps);
    const c2 = Math.max(r.avgKehadiran, eps);
    const c3 = Math.max(r.avgPelanggaran, eps);
    return Math.pow(c1, w1) * Math.pow(c2, w2) * Math.pow(c3, -w3);
  });

  const sumS = sScores.reduce((a, b) => a + b, 0);

  const result: EvalKelasRow[] = rawKelas.map((r, i) => {
    const skorS = sScores[i];
    const skorV = sumS > 0 ? skorS / sumS : 0;
    return {
      ...r,
      skorS: Math.round(skorS * 10000) / 10000,
      skorV: Math.round(skorV * 10000) / 10000,
      rank: 0,
      kategori: "",
    };
  });

  // Sort by V descending
  result.sort((a, b) => b.skorV - a.skorV || a.namaKelas.localeCompare(b.namaKelas, "id"));
  for (let i = 0; i < result.length; i++) {
    result[i].rank = i + 1;
    // Assign kategori based on percentile
    const pct = (i + 1) / result.length;
    if (pct <= 0.25) result[i].kategori = "Sangat Baik";
    else if (pct <= 0.5) result[i].kategori = "Baik";
    else if (pct <= 0.75) result[i].kategori = "Cukup";
    else result[i].kategori = "Perlu Perhatian";
  }

  return { rows: result, error: null };
}
