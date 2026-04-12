"use server";

import { resolveActiveAcademicYearId } from "@/app/actions/academic-years";
import { getKelasList } from "@/app/actions/students";
import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/** Supabase/PostgREST memakai filter di URL; `.in('id', [...])` terlalu panjang → 400 Bad Request. */
const IN_CLAUSE_CHUNK = 80;
const STUDENT_IN_CHUNK = 40;

export type ClusterJurusan = "bahasa" | "mipa" | "ips";

export type ClusteringScope = {
  tingkat: number;
  jurusan: ClusterJurusan;
  /**
   * Hanya siswa dengan `kelas_id` null (belum dapat rombel).
   * `same_jurusan`: peminatan = jurusan target, tingkat akademik = tingkat scope.
   * `same_tingkat`: semua peminatan di tingkat akademik scope (tetap belum rombel).
   */
  pool: "same_jurusan" | "same_tingkat";
  /** Min rerata nilai mapel relevan jurusan; kosong/null = tidak difilter */
  minSkorMapel?: number | null;
};

export type StudentForClustering = {
  id: string;
  nisn: string;
  nama: string;
  jenisKelamin: "L" | "P";
  nilaiRata: number;
  /** Rerata nilai mapel yang relevan dengan jurusan target (0 = tidak ada mapel cocok). */
  skorMapelJurusan?: number;
};

export type ClusterClassResult = {
  index: number;
  namaKelas: string;
  /** UUID kelas master (slot simulasi); null jika tanpa mapping kelas. */
  kelasId: string | null;
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
  numberOfClasses: number,
  /** Satu slot per indeks 0..n-1; dipakai untuk nama & terapkan ke DB. */
  kelasSlots?: { id: string; nama: string }[]
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

    const slot = kelasSlots?.[index];
    return {
      index,
      namaKelas: slot?.nama?.trim() ? slot.nama : `Kelas Draft ${index + 1}`,
      kelasId: slot?.id ?? null,
      siswa,
      totalSiswa: siswa.length,
      jumlahL,
      jumlahP,
      rasioLP: `${jumlahL} : ${jumlahP}`,
      rataNilaiKelas: Math.round(rataNilaiKelas * 100) / 100,
    };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mapelNamaRelevanJurusan(namaMapel: string, jurusan: ClusterJurusan): boolean {
  const n = namaMapel.trim().toLowerCase();
  if (jurusan === "bahasa") {
    return /bahasa|sastra|inggris|english/.test(n);
  }
  if (jurusan === "mipa") {
    return (
      /matematika/.test(n) ||
      /biologi/.test(n) ||
      /fisika/.test(n) ||
      /kimia/.test(n) ||
      n === "ipa"
    );
  }
  if (jurusan === "ips") {
    return (
      /ekonomi/.test(n) ||
      /sosiologi/.test(n) ||
      /sejarah/.test(n) ||
      /geografi/.test(n) ||
      n === "ips"
    );
  }
  return false;
}

function skorMapelJurusanDariMapel(
  nilaiPerMapel: Map<string, number>,
  jurusan: ClusterJurusan
): number {
  const vals: number[] = [];
  for (const [nama, nilai] of nilaiPerMapel) {
    if (!Number.isFinite(nilai)) continue;
    if (mapelNamaRelevanJurusan(nama, jurusan)) vals.push(nilai);
  }
  if (vals.length === 0) return 0;
  return round2(vals.reduce((a, b) => a + b, 0) / vals.length);
}

async function getScopedStudentsWithNilai(args: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  scope: ClusteringScope;
  activeYearId: string | null;
}): Promise<{
  students: StudentForClustering[];
  poolSebelumFilter: number;
  siswaSetelahFilter: number;
  error: string | null;
}> {
  const { supabase, scope, activeYearId } = args;

  const { data: studs, error: sErr } = await supabase
    .from("students")
    .select("id, nisn, nama, jenis_kelamin, kelas_id, peminatan_jurusan, tingkat_akademik");
  if (sErr) {
    return {
      students: [],
      poolSebelumFilter: 0,
      siswaSetelahFilter: 0,
      error: sErr.message,
    };
  }

  const poolIds: string[] = [];
  for (const s of studs ?? []) {
    const kid = s.kelas_id as string | null;
    if (kid) continue;

    const row = s as Record<string, unknown>;
    const ta = Number(row.tingkat_akademik);
    const effectiveTingkat = Number.isFinite(ta) ? ta : 10;
    const effectiveJurusan = (row.peminatan_jurusan as string | null) ?? null;

    if (effectiveTingkat !== scope.tingkat) continue;
    if (scope.pool === "same_jurusan") {
      if ((effectiveJurusan ?? "") !== scope.jurusan) continue;
    }
    poolIds.push(String(s.id));
  }

  const nilaiAgg = new Map<string, Map<string, { sum: number; cnt: number }>>();
  const pageSize = 1000;

  for (let i = 0; i < poolIds.length; i += STUDENT_IN_CHUNK) {
    const chunk = poolIds.slice(i, i + STUDENT_IN_CHUNK);
    let offset = 0;
    for (;;) {
      let q = supabase
        .from("academic_records")
        .select("student_id, nilai, subjects(nama_mapel, tingkat_kelas)")
        .in("student_id", chunk);
      if (activeYearId) q = q.eq("academic_year_id", activeYearId);
      const { data: batch, error: rErr } = await q.range(offset, offset + pageSize - 1);
      if (rErr) {
        return {
          students: [],
          poolSebelumFilter: 0,
          siswaSetelahFilter: 0,
          error: rErr.message,
        };
      }
      const rows = batch ?? [];
      if (rows.length === 0) break;

      for (const r of rows) {
        const sid = String(r.student_id);
        const subRaw = r.subjects as unknown;
        const subObj = Array.isArray(subRaw)
          ? (subRaw[0] as { nama_mapel?: string; tingkat_kelas?: number | null } | undefined)
          : (subRaw as { nama_mapel?: string; tingkat_kelas?: number | null } | null);
        const nm = String(subObj?.nama_mapel ?? "").trim();
        if (!nm) continue;
        const tk =
          subObj?.tingkat_kelas != null ? Number(subObj.tingkat_kelas) : null;
        if (tk != null && Number.isFinite(tk) && tk !== scope.tingkat) continue;
        const v = Number(r.nilai);
        if (!Number.isFinite(v)) continue;
        const inner = nilaiAgg.get(sid) ?? new Map();
        const cur = inner.get(nm) ?? { sum: 0, cnt: 0 };
        cur.sum += v;
        cur.cnt += 1;
        inner.set(nm, cur);
        nilaiAgg.set(sid, inner);
      }

      if (rows.length < pageSize) break;
      offset += pageSize;
    }
  }

  const rataPerMapel = (sid: string): Map<string, number> => {
    const m = new Map<string, number>();
    const inner = nilaiAgg.get(sid);
    if (!inner) return m;
    for (const [nm, { sum, cnt }] of inner) {
      if (cnt > 0) m.set(nm, round2(sum / cnt));
    }
    return m;
  };

  const byId = new Map((studs ?? []).map((s) => [String(s.id), s]));

  const list: StudentForClustering[] = [];
  for (const id of poolIds) {
    const s = byId.get(id) as Record<string, unknown> | undefined;
    if (!s) continue;
    const jkRaw = s.jenis_kelamin as string | null;
    const jenisKelamin: "L" | "P" = jkRaw === "P" ? "P" : "L";
    const rmap = rataPerMapel(id);
    let nilaiSum = 0;
    let nilaiN = 0;
    for (const v of rmap.values()) {
      nilaiSum += v;
      nilaiN += 1;
    }
    const nilaiRata = nilaiN > 0 ? round2(nilaiSum / nilaiN) : 0;
    const skorMapelJurusan = skorMapelJurusanDariMapel(rmap, scope.jurusan);
    list.push({
      id,
      nisn: String(s.nisn ?? ""),
      nama: String(s.nama ?? ""),
      jenisKelamin,
      nilaiRata,
      skorMapelJurusan,
    });
  }

  list.sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  const minSk =
    scope.minSkorMapel != null && scope.minSkorMapel > 0
      ? scope.minSkorMapel
      : null;
  const filtered = minSk
    ? list.filter((s) => (s.skorMapelJurusan ?? 0) >= minSk)
    : list;

  if (filtered.length === 0 && list.length > 0) {
    return {
      students: [],
      poolSebelumFilter: list.length,
      siswaSetelahFilter: 0,
      error: `Tidak ada siswa yang lolos filter skor minimal (${minSk}). Coba kosongkan kolom skor minimal, atau turunkan angkanya.`,
    };
  }
  if (filtered.length === 0) {
    return {
      students: [],
      poolSebelumFilter: 0,
      siswaSetelahFilter: 0,
      error:
        "Tidak ada siswa yang bisa didistribusikan. Yang paling sering: semua siswa tingkat ini sudah punya rombel (sudah pernah ditempatkan / Terapkan). " +
        "Menu ini hanya untuk siswa yang rombelnya masih kosong. " +
        "Cek juga: tingkat & peminatan siswa harus cocok dengan pilihan Anda; opsi pertama butuh peminatan sama dengan jurusan yang dipilih.",
    };
  }

  return {
    students: filtered,
    poolSebelumFilter: list.length,
    siswaSetelahFilter: filtered.length,
    error: null,
  };
}

/** Simulasi clustering per tingkat + jurusan (slot = kelas master yang cocok). */
export async function simulateClustering(
  scope: ClusteringScope,
  jumlahSlot: number
): Promise<{
  classes: ClusterClassResult[];
  /** Jumlah kelas master untuk kombinasi tingkat + jurusan */
  slotCount: number;
  poolSebelumFilter: number;
  siswaSetelahFilter: number;
  error: string | null;
}> {
  const { rows: kelasRows, error: kelasErr } = await getKelasList();
  if (kelasErr) {
    return {
      classes: [],
      slotCount: 0,
      poolSebelumFilter: 0,
      siswaSetelahFilter: 0,
      error: kelasErr,
    };
  }
  if (kelasRows.length === 0) {
    return {
      classes: [],
      slotCount: 0,
      poolSebelumFilter: 0,
      siswaSetelahFilter: 0,
      error: "Belum ada kelas di master. Tambahkan kelas terlebih dahulu.",
    };
  }

  const slots = kelasRows
    .filter(
      (k) => k.tingkat === scope.tingkat && (k.jurusan ?? "") === scope.jurusan
    )
    .map((k) => ({ id: k.id, nama: k.nama }));

  if (slots.length === 0) {
    return {
      classes: [],
      slotCount: 0,
      poolSebelumFilter: 0,
      siswaSetelahFilter: 0,
      error: `Tidak ada kelas master untuk tingkat ${scope.tingkat} jurusan "${scope.jurusan}".`,
    };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return {
      classes: [],
      slotCount: slots.length,
      poolSebelumFilter: 0,
      siswaSetelahFilter: 0,
      error: "Anda belum masuk.",
    };
  }
  if (isSiswaUser(auth.user)) {
    return {
      classes: [],
      slotCount: slots.length,
      poolSebelumFilter: 0,
      siswaSetelahFilter: 0,
      error: "Akses ditolak.",
    };
  }

  const activeYearId = await resolveActiveAcademicYearId();
  const { students, poolSebelumFilter, siswaSetelahFilter, error: stErr } =
    await getScopedStudentsWithNilai({ supabase, scope, activeYearId });
  if (stErr) {
    return {
      classes: [],
      slotCount: slots.length,
      poolSebelumFilter,
      siswaSetelahFilter: 0,
      error: stErr,
    };
  }

  const requested = Math.max(1, Math.floor(Number(jumlahSlot) || 1));
  const n = Math.min(slots.length, requested);
  const slotSlice = slots.slice(0, n);

  return {
    classes: await generateClusters(students, n, slotSlice),
    slotCount: slots.length,
    poolSebelumFilter,
    siswaSetelahFilter,
    error: null,
  };
}

export type ClusterApplyPayload = {
  /** student_id → kelas_id (UUID kelas target) */
  assignments: Record<string, string>;
};

/**
 * Terapkan hasil simulasi ke `students.kelas_id`.
 * Dua fase: kosongkan kelas dulu (aman untuk trigger swap kapasitas), lalu isi target.
 */
export async function applyClusteringAssignments(
  payload: ClusterApplyPayload
): Promise<{ updated: number; error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { updated: 0, error: "Anda belum masuk." };
  if (isSiswaUser(auth.user)) return { updated: 0, error: "Akses ditolak." };

  const assignments = payload.assignments ?? {};
  const studentIds = Object.keys(assignments).filter((id) => {
    const kid = String(assignments[id] ?? "").trim();
    return Boolean(id) && Boolean(kid);
  });
  if (studentIds.length === 0) {
    return { updated: 0, error: "Tidak ada penempatan yang valid." };
  }

  const moving = new Set(studentIds);
  const targetCounts = new Map<string, number>();
  for (const sid of studentIds) {
    const kid = String(assignments[sid]).trim();
    targetCounts.set(kid, (targetCounts.get(kid) ?? 0) + 1);
  }

  const { data: kelasMeta, error: kmErr } = await supabase
    .from("kelas")
    .select("id, nama, kapasitas_max, tingkat, jurusan")
    .in("id", [...targetCounts.keys()]);
  if (kmErr) return { updated: 0, error: kmErr.message };

  const capById = new Map<
    string,
    { cap: number; nama: string; tingkat: number; jurusan: string | null }
  >();
  for (const r of kelasMeta ?? []) {
    const id = String(r.id);
    const cap = Math.min(99, Math.max(1, Number(r.kapasitas_max) || 35));
    const tk = Number(r.tingkat);
    capById.set(id, {
      cap,
      nama: String(r.nama ?? ""),
      tingkat: Number.isFinite(tk) ? tk : 10,
      jurusan: (r.jurusan as string | null) ?? null,
    });
  }

  for (const [kelasId, into] of targetCounts) {
    if (!capById.has(kelasId)) {
      return { updated: 0, error: "Salah satu kelas tujuan tidak ditemukan." };
    }
    const { data: inKelas, error: ikErr } = await supabase
      .from("students")
      .select("id")
      .eq("kelas_id", kelasId);
    if (ikErr) return { updated: 0, error: ikErr.message };

    const stay = (inKelas ?? []).filter((row) => !moving.has(String(row.id)))
      .length;
    const cap = capById.get(kelasId)!.cap;
    if (stay + into > cap) {
      const nm = capById.get(kelasId)!.nama;
      return {
        updated: 0,
        error: `Kelas "${nm}" akan melebihi kapasitas (${stay} tetap + ${into} masuk > maks ${cap}). Sesuaikan simulasi atau kapasitas.`,
      };
    }
  }

  for (let i = 0; i < studentIds.length; i += IN_CLAUSE_CHUNK) {
    const chunk = studentIds.slice(i, i + IN_CLAUSE_CHUNK);
    const { error: nullErr } = await supabase
      .from("students")
      .update({ kelas_id: null })
      .in("id", chunk);
    if (nullErr) return { updated: 0, error: nullErr.message };
  }

  let updated = 0;
  for (const sid of studentIds) {
    const kid = String(assignments[sid]).trim();
    const meta = capById.get(kid);
    const tingkatAkademik = meta?.tingkat ?? 10;
    const j = meta?.jurusan ?? "";
    const peminatanPatch =
      j === "bahasa" || j === "mipa" || j === "ips"
        ? { peminatan_jurusan: j as "bahasa" | "mipa" | "ips" }
        : {};
    const { error: upErr } = await supabase
      .from("students")
      .update({ kelas_id: kid, tingkat_akademik: tingkatAkademik, ...peminatanPatch })
      .eq("id", sid);
    if (upErr) {
      return {
        updated,
        error: `${upErr.message} (terhenti setelah ${updated} siswa; sebagian sudah dikosongkan — periksa data dan coba lagi).`,
      };
    }
    updated += 1;
  }

  revalidatePath("/admin/clustering");
  revalidatePath("/admin/students");
  revalidatePath("/admin/ews");
  revalidatePath("/admin/arsip");
  revalidatePath("/admin/kenaikan-kelas");
  return { updated, error: null };
}
