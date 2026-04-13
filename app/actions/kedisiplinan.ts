"use server";

import { resolveActiveAcademicYearId } from "@/app/actions/academic-years";
import { denyIfSiswaAlumni } from "@/lib/auth/siswa-alumni-gate";
import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";
import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export type DisciplineSemester = 1 | 2;

export type AttendanceSummary = {
  student_id: string;
  semester: DisciplineSemester;
  /** Jumlah pertemuan hadir (kehadiran). */
  hadir: number;
  alpa: number;
  izin: number;
  sakit: number;
};

export type ViolationRow = {
  id: string;
  poin: number;
  deskripsi: string;
  created_at: string;
};

export type MyDisciplineRecord = {
  attendance: AttendanceSummary | null;
  violations: ViolationRow[];
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

function normSemester(s: number): DisciplineSemester {
  return s === 2 ? 2 : 1;
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
        "Tahun ajaran belum dikonfigurasi. Jalankan sql/migration_academic_years_archive.sql.",
    };
  }
  return { id, error: null };
}

export async function getAttendanceForStudent(
  studentId: string,
  semester: DisciplineSemester
): Promise<{
  row: AttendanceSummary | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { row: null, error: deny };

  const { id: academicYearId, error: ye } = await requireActiveAcademicYearId();
  if (ye) return { row: null, error: ye };

  const sem = normSemester(semester);

  const { data, error } = await supabase
    .from("attendance_records")
    .select("student_id, semester, hadir, alpa, izin, sakit")
    .eq("student_id", studentId)
    .eq("semester", sem)
    .eq("academic_year_id", academicYearId)
    .maybeSingle();

  if (error) return { row: null, error: error.message };
  if (!data) return { row: null, error: null };

  return {
    row: {
      student_id: String(data.student_id),
      semester: normSemester(Number(data.semester)),
      hadir: Number(data.hadir) || 0,
      alpa: Number(data.alpa) || 0,
      izin: Number(data.izin) || 0,
      sakit: Number(data.sakit) || 0,
    },
    error: null,
  };
}

export async function updateAbsensi(
  studentId: string,
  semester: DisciplineSemester,
  hadir: number,
  alpa: number,
  izin: number,
  sakit: number
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { error: deny };

  const { id: academicYearId, error: ye } = await requireActiveAcademicYearId();
  if (ye) return { error: ye };

  const sem = normSemester(semester);
  const h = Math.max(0, Math.floor(Number(hadir) || 0));
  const a = Math.max(0, Math.floor(Number(alpa) || 0));
  const i = Math.max(0, Math.floor(Number(izin) || 0));
  const s = Math.max(0, Math.floor(Number(sakit) || 0));

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("student_id")
    .eq("student_id", studentId)
    .eq("semester", sem)
    .eq("academic_year_id", academicYearId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("attendance_records")
      .update({ hadir: h, alpa: a, izin: i, sakit: s })
      .eq("student_id", studentId)
      .eq("semester", sem)
      .eq("academic_year_id", academicYearId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("attendance_records").insert({
      student_id: studentId,
      semester: sem,
      academic_year_id: academicYearId,
      hadir: h,
      alpa: a,
      izin: i,
      sakit: s,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/kedisiplinan");
  revalidatePath("/siswa/kedisiplinan");
  revalidatePath("/admin/ews");
  revalidatePath("/siswa/ews");
  return { error: null };
}

export async function addPelanggaran(
  studentId: string,
  semester: DisciplineSemester,
  poin: number,
  deskripsi: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { error: deny };

  const sem = normSemester(semester);
  const p = Math.max(0, Number(poin) || 0);
  const d = String(deskripsi ?? "").trim();
  if (!d) return { error: "Deskripsi pelanggaran wajib diisi." };

  const { id: academicYearId, error: ye } = await requireActiveAcademicYearId();
  if (ye) return { error: ye };

  const { error } = await supabase.from("violation_records").insert({
    student_id: studentId,
    semester: sem,
    academic_year_id: academicYearId,
    poin: p,
    deskripsi: d,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/kedisiplinan");
  revalidatePath("/siswa/kedisiplinan");
  revalidatePath("/admin/ews");
  revalidatePath("/siswa/ews");
  return { error: null };
}

export async function getViolationsForStudent(
  studentId: string,
  semester: DisciplineSemester
): Promise<{
  rows: ViolationRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { rows: [], error: deny };

  const sem = normSemester(semester);

  const { id: academicYearId, error: ye } = await requireActiveAcademicYearId();
  if (ye) return { rows: [], error: ye };

  const { data, error } = await supabase
    .from("violation_records")
    .select("poin, deskripsi, created_at")
    .eq("student_id", studentId)
    .eq("semester", sem)
    .eq("academic_year_id", academicYearId)
    .order("created_at", { ascending: false });

  if (error) return { rows: [], error: error.message };

  return {
    rows: (data ?? []).map((r, i) => ({
      id: `${studentId}-${sem}-${i}-${String(r.created_at ?? "")}-${r.poin}`,
      poin: Number(r.poin) || 0,
      deskripsi: String(r.deskripsi ?? ""),
      created_at: String(r.created_at ?? ""),
    })),
    error: null,
  };
}

export async function getMyDisciplineRecord(
  semester: DisciplineSemester
): Promise<{
  data: MyDisciplineRecord | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertSiswa(auth.user);
  if (deny) return { data: null, error: deny };

  const user = auth.user!;
  const alumniDeny = await denyIfSiswaAlumni(supabase, user);
  if (alumniDeny) return { data: null, error: alumniDeny };

  const sid = String(user.user_metadata?.student_id ?? "").trim();

  let st = supabase.from("students").select("id").limit(1);
  st = sid ? st.eq("id", sid) : st.eq("user_id", user.id);
  const { data: stu, error: sErr } = await st.maybeSingle();
  if (sErr) return { data: null, error: sErr.message };
  if (!stu) return { data: null, error: "Data siswa tidak ditemukan." };

  const studentId = String(stu.id);
  const sem = normSemester(semester);

  const { id: academicYearId, error: ye } = await requireActiveAcademicYearId();
  if (ye) return { data: null, error: ye };

  const [{ data: att, error: aErr }, { data: viol, error: vErr }] =
    await Promise.all([
      supabase
        .from("attendance_records")
        .select("student_id, semester, hadir, alpa, izin, sakit")
        .eq("student_id", studentId)
        .eq("semester", sem)
        .eq("academic_year_id", academicYearId)
        .maybeSingle(),
      supabase
        .from("violation_records")
        .select("poin, deskripsi, created_at")
        .eq("student_id", studentId)
        .eq("semester", sem)
        .eq("academic_year_id", academicYearId)
        .order("created_at", { ascending: false }),
    ]);

  if (aErr) return { data: null, error: aErr.message };
  if (vErr) return { data: null, error: vErr.message };

  const attendance: AttendanceSummary | null = att
    ? {
        student_id: String(att.student_id),
        semester: normSemester(Number(att.semester)),
        hadir: Number(att.hadir) || 0,
        alpa: Number(att.alpa) || 0,
        izin: Number(att.izin) || 0,
        sakit: Number(att.sakit) || 0,
      }
    : null;

  const violations: ViolationRow[] = (viol ?? []).map((r, i) => ({
    id: `${studentId}-${sem}-${i}-${String(r.created_at ?? "")}-${r.poin}`,
    poin: Number(r.poin) || 0,
    deskripsi: String(r.deskripsi ?? ""),
    created_at: String(r.created_at ?? ""),
  }));

  return {
    data: { attendance, violations },
    error: null,
  };
}
