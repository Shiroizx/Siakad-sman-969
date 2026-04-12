"use server";

import { resolveActiveAcademicYearId } from "@/app/actions/academic-years";
import { createClient } from "@/utils/supabase/server";

export type StudentForClustering = {
  id: string;
  nisn: string;
  nama: string;
  jenisKelamin: "L" | "P";
  nilaiRata: number;
};

export type ClusterClassResult = {
  index: number;
  namaKelas: string;
  siswa: StudentForClustering[];
  totalSiswa: number;
  jumlahL: number;
  jumlahP: number;
  /** Ringkas rasio L:P, mis. "12 : 10" */
  rasioLP: string;
  rataNilaiKelas: number;
};

/** Indeks kelas 0..n-1 untuk penempatan ke-n (urutan global), pola S / zig-zag. */
function sCurveClassIndex(globalIndex: number, n: number): number {
  if (n <= 1) return 0;
  const period = 2 * n;
  const pos = globalIndex % period;
  if (pos < n) return pos;
  return 2 * n - 1 - pos;
}

/**
 * Greedy S-curve: pisah L/P, urut nilai desc, tempatkan L dulu lalu P dengan indeks S-curve berkelanjutan.
 * Async agar valid sebagai Server Action di file `'use server'` (Next.js).
 */
export async function generateClusters(
  students: StudentForClustering[],
  numberOfClasses: number
): Promise<ClusterClassResult[]> {
  const n = Math.max(1, Math.floor(numberOfClasses));

  const laki = students
    .filter((s) => s.jenisKelamin === "L")
    .sort((a, b) => b.nilaiRata - a.nilaiRata);
  const perempuan = students
    .filter((s) => s.jenisKelamin === "P")
    .sort((a, b) => b.nilaiRata - a.nilaiRata);

  const buckets: StudentForClustering[][] = Array.from({ length: n }, () => []);
  let globalIdx = 0;

  for (const s of laki) {
    buckets[sCurveClassIndex(globalIdx++, n)].push(s);
  }
  for (const s of perempuan) {
    buckets[sCurveClassIndex(globalIdx++, n)].push(s);
  }

  return buckets.map((siswa, index) => {
    const jumlahL = siswa.filter((x) => x.jenisKelamin === "L").length;
    const jumlahP = siswa.length - jumlahL;
    const rataNilaiKelas =
      siswa.length === 0
        ? 0
        : siswa.reduce((acc, x) => acc + x.nilaiRata, 0) / siswa.length;

    return {
      index,
      namaKelas: `Kelas Draft ${index + 1}`,
      siswa,
      totalSiswa: siswa.length,
      jumlahL,
      jumlahP,
      rasioLP: `${jumlahL} : ${jumlahP}`,
      rataNilaiKelas: Math.round(rataNilaiKelas * 100) / 100,
    };
  });
}

export async function getStudentsForClustering(): Promise<{
  students: StudentForClustering[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, nisn, nama, jenis_kelamin");

  if (studentsError) {
    return { students: [], error: studentsError.message };
  }

  const activeYearId = await resolveActiveAcademicYearId();
  let recQuery = supabase.from("academic_records").select("student_id, nilai");
  if (activeYearId) recQuery = recQuery.eq("academic_year_id", activeYearId);
  const { data: records, error: recordsError } = await recQuery;

  if (recordsError) {
    return { students: [], error: recordsError.message };
  }

  const agg = new Map<string, { sum: number; count: number }>();
  for (const r of records ?? []) {
    const sid = r.student_id as string;
    const v = Number(r.nilai);
    if (!Number.isFinite(v)) continue;
    const cur = agg.get(sid) ?? { sum: 0, count: 0 };
    cur.sum += v;
    cur.count += 1;
    agg.set(sid, cur);
  }

  const list: StudentForClustering[] = (students ?? []).map((s) => {
    const id = s.id as string;
    const a = agg.get(id);
    const nilaiRata =
      a && a.count > 0 ? Math.round((a.sum / a.count) * 100) / 100 : 0;
    const jkRaw = s.jenis_kelamin as string | null;
    const jenisKelamin: "L" | "P" = jkRaw === "P" ? "P" : "L";

    return {
      id,
      nisn: String(s.nisn ?? ""),
      nama: String(s.nama ?? ""),
      jenisKelamin,
      nilaiRata,
    };
  });

  list.sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  return { students: list, error: null };
}

/** Satu round-trip: ambil siswa dari DB lalu jalankan simulasi clustering. */
export async function simulateClustering(numberOfClasses: number): Promise<{
  classes: ClusterClassResult[];
  error: string | null;
}> {
  const { students, error } = await getStudentsForClustering();
  if (error) {
    return { classes: [], error };
  }

  const n = Math.min(12, Math.max(1, Math.floor(Number(numberOfClasses) || 1)));

  return {
    classes: await generateClusters(students, n),
    error: null,
  };
}
