"use server";

import { resolveActiveAcademicYearId } from "@/app/actions/academic-years";
import { denyIfSiswaAlumni } from "@/lib/auth/siswa-alumni-gate";
import { isSiswaUser } from "@/lib/auth/siswa";
import { isWaliKelasUser } from "@/lib/auth/wali-kelas";
import { createClient } from "@/utils/supabase/server";
import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export type KelasWithTingkat = {
  id: string;
  nama: string;
  tingkat: number;
  jurusan: string | null;
  rombel: number | null;
  jumlah_siswa: number;
  kapasitas_max: number;
  /** Untuk dropdown admin */
  label: string;
};

export type StudentMini = {
  id: string;
  nama: string;
  nisn: string;
};

export type SubjectRow = {
  id: string;
  nama_mapel: string;
  tingkat_kelas: number;
  kkm: number;
};

export type GradeRow = {
  subject_id: string;
  nama_mapel: string;
  kkm: number;
  nilai: number | null;
};

function assertAdmin(user: User | null): string | null {
  if (!user) return "Anda belum masuk.";
  if (isSiswaUser(user)) return "Akses ditolak.";
  return null;
}

function assertWaliKelas(user: User | null): string | null {
  if (!user) return "Anda belum masuk.";
  if (!isWaliKelasUser(user)) return "Hanya Wali Kelas yang dapat mengubah nilai akademik.";
  return null;
}

function assertSiswa(user: User | null): string | null {
  if (!user) return "Anda belum masuk.";
  if (!isSiswaUser(user)) return "Hanya untuk akun siswa.";
  return null;
}

async function requireActiveAcademicYearId(): Promise<{
  id: string;
  error: string | null;
}> {
  const id = await resolveActiveAcademicYearId();
  if (!id) {
    return {
      id: "",
      error:
        "Tahun ajaran belum dikonfigurasi. Jalankan sql/migration_academic_years_archive.sql di Supabase.",
    };
  }
  return { id, error: null };
}

function jurusanSortKey(j: string | null | undefined): number {
  if (j === "bahasa") return 1;
  if (j === "mipa") return 2;
  if (j === "ips") return 3;
  return 99;
}

function mapKelasWithTingkat(r: Record<string, unknown>): KelasWithTingkat {
  const nama = String(r.nama ?? "");
  const jumlah = Number(r.jumlah_siswa ?? 0) || 0;
  const cap = Number(r.kapasitas_max ?? 35) || 35;
  return {
    id: String(r.id),
    nama,
    tingkat: Number(r.tingkat ?? 10) || 10,
    jurusan: (r.jurusan as string | null) ?? null,
    rombel: r.rombel != null ? Number(r.rombel) : null,
    jumlah_siswa: jumlah,
    kapasitas_max: cap,
    label: `${nama} (${jumlah}/${cap})`,
  };
}

function sortKelasWithTingkat(rows: KelasWithTingkat[]): KelasWithTingkat[] {
  return [...rows].sort((a, b) => {
    const t = a.tingkat - b.tingkat;
    if (t !== 0) return t;
    const j = jurusanSortKey(a.jurusan) - jurusanSortKey(b.jurusan);
    if (j !== 0) return j;
    const ra = a.rombel ?? 999;
    const rb = b.rombel ?? 999;
    if (ra !== rb) return ra - rb;
    return a.nama.localeCompare(b.nama, "id");
  });
}

export async function getKelasWithTingkat(): Promise<{
  rows: KelasWithTingkat[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { rows: [], error: deny };

  const v = await supabase
    .from("kelas_with_siswa_count")
    .select("id, nama, tingkat, jurusan, rombel, jumlah_siswa, kapasitas_max");

  if (!v.error && v.data) {
    return {
      rows: sortKelasWithTingkat(
        (v.data ?? []).map((r) => mapKelasWithTingkat(r as Record<string, unknown>))
      ),
      error: null,
    };
  }

  const full = await supabase
    .from("kelas")
    .select("id, nama, tingkat, jurusan, rombel, kapasitas_max")
    .order("nama", { ascending: true });

  if (!full.error && full.data) {
    return {
      rows: sortKelasWithTingkat(
        (full.data ?? []).map((r) => {
          const row = r as Record<string, unknown>;
          return mapKelasWithTingkat({
            ...row,
            jumlah_siswa: 0,
            kapasitas_max: row.kapasitas_max ?? 35,
          });
        })
      ),
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("kelas")
    .select("id, nama, tingkat")
    .order("nama", { ascending: true });

  if (error) return { rows: [], error: error.message };
  return {
    rows: sortKelasWithTingkat(
      (data ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        return mapKelasWithTingkat({
          ...row,
          jurusan: null,
          rombel: null,
          jumlah_siswa: 0,
          kapasitas_max: 35,
        });
      })
    ),
    error: null,
  };
}

export async function listStudentsInKelas(kelasId: string): Promise<{
  students: StudentMini[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { students: [], error: deny };

  const { data, error } = await supabase
    .from("students")
    .select("id, nama, nisn")
    .eq("kelas_id", kelasId)
    .order("nama", { ascending: true });

  if (error) return { students: [], error: error.message };
  return {
    students: (data ?? []).map((r) => ({
      id: String(r.id),
      nama: String(r.nama ?? ""),
      nisn: String(r.nisn ?? ""),
    })),
    error: null,
  };
}

export async function getSubjectsForTingkat(tingkat: number): Promise<{
  subjects: SubjectRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { subjects: [], error: deny };

  const t = tingkat === 11 || tingkat === 12 ? tingkat : 10;
  const { data, error } = await supabase
    .from("subjects")
    .select("id, nama_mapel, tingkat_kelas, kkm")
    .eq("tingkat_kelas", t)
    .order("nama_mapel", { ascending: true });

  if (error) return { subjects: [], error: error.message };
  return {
    subjects: (data ?? []).map((r) => ({
      id: String(r.id),
      nama_mapel: String(r.nama_mapel ?? ""),
      tingkat_kelas: Number(r.tingkat_kelas),
      kkm: Number(r.kkm ?? 75),
    })),
    error: null,
  };
}

/** Ambil tingkat dari kelas siswa (untuk UI admin). */
export async function getTingkatForStudent(studentId: string): Promise<{
  tingkat: number;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { tingkat: 10, error: deny };

  const { data: st, error } = await supabase
    .from("students")
    .select("kelas_id")
    .eq("id", studentId)
    .maybeSingle();

  if (error) return { tingkat: 10, error: error.message };
  const kid = st?.kelas_id as string | null | undefined;
  if (!kid) return { tingkat: 10, error: null };

  const { data: kl } = await supabase
    .from("kelas")
    .select("tingkat")
    .eq("id", kid)
    .maybeSingle();

  const tingkat = Number(kl?.tingkat ?? 10) || 10;
  return { tingkat: tingkat >= 10 && tingkat <= 12 ? tingkat : 10, error: null };
}

export async function getGradesForSemester(
  studentId: string,
  semester: 1 | 2
): Promise<{ grades: GradeRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { grades: [], error: deny };

  const { id: academicYearId, error: ye } = await requireActiveAcademicYearId();
  if (ye) return { grades: [], error: ye };

  const { tingkat, error: te } = await getTingkatForStudent(studentId);
  if (te) return { grades: [], error: te };

  const { subjects, error: se } = await getSubjectsForTingkat(tingkat);
  if (se) return { grades: [], error: se };

  const { data: recs, error: re } = await supabase
    .from("academic_records")
    .select("subject_id, nilai")
    .eq("student_id", studentId)
    .eq("semester", semester)
    .eq("academic_year_id", academicYearId);

  if (re) return { grades: [], error: re.message };

  const bySub = new Map<string, number>();
  for (const r of recs ?? []) {
    const sid = r.subject_id as string | null;
    if (!sid) continue;
    bySub.set(sid, Number(r.nilai));
  }

  const grades: GradeRow[] = subjects.map((s) => ({
    subject_id: s.id,
    nama_mapel: s.nama_mapel,
    kkm: s.kkm,
    nilai: bySub.has(s.id) ? (bySub.get(s.id) as number) : null,
  }));

  return { grades, error: null };
}

export async function inputNilai(
  studentId: string,
  subjectId: string,
  semester: 1 | 2,
  nilai: number | null
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertWaliKelas(auth.user);
  if (deny) return { error: deny };

  const { id: academicYearId, error: ye } = await requireActiveAcademicYearId();
  if (ye) return { error: ye };

  if (nilai === null || Number.isNaN(Number(nilai))) {
    const { error } = await supabase
      .from("academic_records")
      .delete()
      .eq("student_id", studentId)
      .eq("subject_id", subjectId)
      .eq("semester", semester)
      .eq("academic_year_id", academicYearId);
    if (error) return { error: error.message };
    revalidatePath("/admin/akademik");
    revalidatePath("/siswa/akademik");
    revalidatePath("/admin/ews");
    revalidatePath("/siswa/ews");
    return { error: null };
  }

  const v = Math.round(Number(nilai) * 100) / 100;
  if (v < 0 || v > 100) {
    return { error: "Nilai harus antara 0 dan 100." };
  }

  await supabase
    .from("academic_records")
    .delete()
    .eq("student_id", studentId)
    .eq("subject_id", subjectId)
    .eq("semester", semester)
    .eq("academic_year_id", academicYearId);

  const { error } = await supabase.from("academic_records").insert({
    student_id: studentId,
    subject_id: subjectId,
    semester,
    academic_year_id: academicYearId,
    nilai: v,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/akademik");
  revalidatePath("/siswa/akademik");
  revalidatePath("/admin/ews");
  revalidatePath("/siswa/ews");
  return { error: null };
}

/** Simpan banyak nilai sekaligus (satu semester). */
export async function saveGradesSemester(
  studentId: string,
  semester: 1 | 2,
  entries: { subjectId: string; nilaiRaw: string }[]
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertWaliKelas(auth.user);
  if (deny) return { error: deny };

  const { id: academicYearId, error: ye } = await requireActiveAcademicYearId();
  if (ye) return { error: ye };

  for (const e of entries) {
    const raw = String(e.nilaiRaw ?? "").trim();
    let nilai: number | null = null;
    if (raw !== "") {
      const n = Number(raw.replace(",", "."));
      if (!Number.isFinite(n)) {
        return { error: "Nilai harus angka valid, atau kosong untuk menghapus." };
      }
      nilai = Math.round(n * 100) / 100;
      if (nilai < 0 || nilai > 100) {
        return { error: "Nilai harus antara 0 dan 100." };
      }
    }

    if (nilai === null) {
      const { error } = await supabase
        .from("academic_records")
        .delete()
        .eq("student_id", studentId)
        .eq("subject_id", e.subjectId)
        .eq("semester", semester)
        .eq("academic_year_id", academicYearId);
      if (error) return { error: error.message };
    } else {
      await supabase
        .from("academic_records")
        .delete()
        .eq("student_id", studentId)
        .eq("subject_id", e.subjectId)
        .eq("semester", semester)
        .eq("academic_year_id", academicYearId);
      const { error } = await supabase.from("academic_records").insert({
        student_id: studentId,
        subject_id: e.subjectId,
        semester,
        academic_year_id: academicYearId,
        nilai,
      });
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/admin/akademik");
  revalidatePath("/siswa/akademik");
  revalidatePath("/admin/ews");
  revalidatePath("/siswa/ews");
  return { error: null };
}

export type AcademicYearOption = {
  id: string;
  label: string;
};

/** Dropdown arsip: tahun ajaran yang punya nilai + tahun aktif bila belum ada nilai. */
export async function getMyAcademicYearArchiveOptions(): Promise<{
  options: AcademicYearOption[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertSiswa(auth.user);
  if (deny) return { options: [], error: deny };

  const user = auth.user!;
  const sid = String(user.user_metadata?.student_id ?? "").trim();
  let st = supabase.from("students").select("id").limit(1);
  st = sid ? st.eq("id", sid) : st.eq("user_id", user.id);
  const { data: stu, error: sErr } = await st.maybeSingle();
  if (sErr) return { options: [], error: sErr.message };
  if (!stu) return { options: [], error: "Data siswa tidak ditemukan." };

  const studentId = String(stu.id);

  const { data: recYears, error: ryErr } = await supabase
    .from("academic_records")
    .select("academic_year_id")
    .eq("student_id", studentId);

  if (ryErr) return { options: [], error: ryErr.message };

  const yearIdSet = new Set<string>();
  for (const r of recYears ?? []) {
    const y = r.academic_year_id as string | null | undefined;
    if (y) yearIdSet.add(String(y));
  }

  const activeId = await resolveActiveAcademicYearId();
  if (activeId) yearIdSet.add(activeId);

  const yearIds = [...yearIdSet];
  if (yearIds.length === 0) {
    return { options: [], error: null };
  }

  const { data: years, error: yErr } = await supabase
    .from("academic_years")
    .select("id, nama, created_at")
    .in("id", yearIds)
    .order("created_at", { ascending: false });

  if (yErr) return { options: [], error: yErr.message };

  const { data: hist, error: hErr } = await supabase
    .from("class_histories")
    .select("academic_year_id, created_at, kelas_id")
    .eq("student_id", studentId)
    .in("academic_year_id", yearIds)
    .order("created_at", { ascending: false });

  if (hErr) return { options: [], error: hErr.message };

  const kelasIds = [
    ...new Set(
      (hist ?? [])
        .map((h) => h.kelas_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const kelasNamaById = new Map<string, string>();
  if (kelasIds.length > 0) {
    const { data: klRows } = await supabase
      .from("kelas")
      .select("id, nama")
      .in("id", kelasIds);
    for (const k of klRows ?? []) {
      kelasNamaById.set(String(k.id), String(k.nama ?? ""));
    }
  }

  const latestKelasByYear = new Map<string, string>();
  for (const h of hist ?? []) {
    const yid = String(h.academic_year_id ?? "");
    if (!yid || latestKelasByYear.has(yid)) continue;
    const kn = kelasNamaById.get(String(h.kelas_id ?? ""));
    if (kn) latestKelasByYear.set(yid, kn);
  }

  const options: AcademicYearOption[] = (years ?? []).map((y) => {
    const id = String(y.id);
    const kn = latestKelasByYear.get(id);
    const label = kn ? `${String(y.nama ?? "")} · ${kn}` : String(y.nama ?? "");
    return { id, label };
  });

  return { options, error: null };
}

/** Nilai rapor per tahun ajaran (hanya mapel yang punya baris di academic_records). */
export async function getMyGradesForYear(
  academicYearId: string,
  semester: 1 | 2
): Promise<{ rows: GradeRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertSiswa(auth.user);
  if (deny) return { rows: [], error: deny };

  const user = auth.user!;
  const alumniDeny = await denyIfSiswaAlumni(supabase, user);
  if (alumniDeny) return { rows: [], error: alumniDeny };

  const sid = String(user.user_metadata?.student_id ?? "").trim();
  let st = supabase.from("students").select("id").limit(1);
  st = sid ? st.eq("id", sid) : st.eq("user_id", user.id);
  const { data: stu, error: sErr } = await st.maybeSingle();
  if (sErr) return { rows: [], error: sErr.message };
  if (!stu) return { rows: [], error: "Data siswa tidak ditemukan." };

  const studentId = String(stu.id);
  const yearId = String(academicYearId ?? "").trim();
  if (!yearId) return { rows: [], error: "Tahun ajaran tidak valid." };

  const { data: recs, error: rErr } = await supabase
    .from("academic_records")
    .select("subject_id, nilai, subjects ( nama_mapel, kkm )")
    .eq("student_id", studentId)
    .eq("academic_year_id", yearId)
    .eq("semester", semester);

  if (rErr) return { rows: [], error: rErr.message };

  const rows: GradeRow[] = [];
  for (const r of recs ?? []) {
    const sub = r.subjects as
      | { nama_mapel: string; kkm: number | string | null }
      | { nama_mapel: string; kkm: number | string | null }[]
      | null;
    const subObj = Array.isArray(sub) ? sub[0] : sub;
    const sidSub = r.subject_id as string | null;
    if (!sidSub || !subObj) continue;
    const nv = Number(r.nilai);
    rows.push({
      subject_id: String(sidSub),
      nama_mapel: String(subObj.nama_mapel ?? ""),
      kkm: Number(subObj.kkm ?? 75),
      nilai: Number.isFinite(nv) ? nv : null,
    });
  }

  rows.sort((a, b) => a.nama_mapel.localeCompare(b.nama_mapel, "id"));
  return { rows, error: null };
}
