"use server";

import { resolveActiveAcademicYearId } from "@/app/actions/academic-years";
import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { ARSIP_OTOMAT_NAMA } from "@/lib/arsip-constants";

/** Tahun tujuan pemindahan nilai/absensi/pelanggaran dari tahun aktif. */
async function resolveArchiveAcademicYearId(
  supabase: SupabaseClient,
  promotionFormYearId: string,
  activeYearId: string | null
): Promise<string> {
  const promo = String(promotionFormYearId ?? "").trim();
  if (activeYearId && promo && promo !== activeYearId) {
    return promo;
  }
  const { data: existing } = await supabase
    .from("academic_years")
    .select("id")
    .eq("nama", ARSIP_OTOMAT_NAMA)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return String(existing.id);
  const { data: ins, error } = await supabase
    .from("academic_years")
    .insert({ nama: ARSIP_OTOMAT_NAMA, is_active: false })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (!ins?.id) throw new Error("Gagal membuat tahun ajaran arsip.");
  return String(ins.id);
}

/**
 * Pindahkan nilai, absensi, pelanggaran dari tahun AKTIF → tahun arsip
 * (supaya di kelas baru dimulai “bersih” di tahun aktif).
 */
async function archiveActiveYearDataForStudents(
  supabase: SupabaseClient,
  studentIds: string[],
  promotionFormYearId: string
): Promise<{ error: string | null }> {
  const activeId = await resolveActiveAcademicYearId();
  if (!activeId || studentIds.length === 0) {
    return { error: null };
  }

  let archiveId: string;
  try {
    archiveId = await resolveArchiveAcademicYearId(
      supabase,
      promotionFormYearId,
      activeId
    );
  } catch (e) {
    return { error: String(e) };
  }

  const uniq = [...new Set(studentIds.map((id) => String(id).trim()).filter(Boolean))];
  const chunkSize = 80;
  for (let i = 0; i < uniq.length; i += chunkSize) {
    const chunk = uniq.slice(i, i + chunkSize);
    const { error: e1 } = await supabase
      .from("academic_records")
      .update({ academic_year_id: archiveId })
      .in("student_id", chunk)
      .eq("academic_year_id", activeId);
    if (e1) return { error: e1.message };

    const { error: e2 } = await supabase
      .from("attendance_records")
      .update({ academic_year_id: archiveId })
      .in("student_id", chunk)
      .eq("academic_year_id", activeId);
    if (e2) return { error: e2.message };

    const { error: e3 } = await supabase
      .from("violation_records")
      .update({ academic_year_id: archiveId })
      .in("student_id", chunk)
      .eq("academic_year_id", activeId);
    if (e3) {
      if (
        e3.message.includes("academic_year_id") ||
        e3.message.includes("column") ||
        e3.code === "42703"
      ) {
        return {
          error:
            "Kolom academic_year_id pada violation_records belum ada. Jalankan sql/migration_violation_academic_year.sql.",
        };
      }
      return { error: e3.message };
    }
  }

  return { error: null };
}

export type ClassPromotionStatus = "naik_kelas" | "tinggal_kelas" | "lulus";

function assertAdmin(user: User | null): string | null {
  if (!user) return "Anda belum masuk.";
  if (isSiswaUser(user)) return "Akses ditolak.";
  return null;
}

function normStatus(s: string): ClassPromotionStatus | null {
  if (s === "naik_kelas" || s === "tinggal_kelas" || s === "lulus") return s;
  return null;
}

/**
 * Pindahkan semua siswa dari kelas asal ke kelas tujuan dan catat riwayat.
 */
export async function bulkPromoteClass(
  fromKelasId: string,
  toKelasId: string,
  academicYearId: string
): Promise<{ moved: number; error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { moved: 0, error: deny };

  const fromId = String(fromKelasId ?? "").trim();
  const toId = String(toKelasId ?? "").trim();
  const yearId = String(academicYearId ?? "").trim();
  if (!fromId || !toId || !yearId) {
    return { moved: 0, error: "Kelas asal, tujuan, dan tahun ajaran wajib diisi." };
  }
  if (fromId === toId) {
    return { moved: 0, error: "Kelas asal dan tujuan tidak boleh sama." };
  }

  const { data: pupils, error: pErr } = await supabase
    .from("students")
    .select("id")
    .eq("kelas_id", fromId);

  if (pErr) return { moved: 0, error: pErr.message };
  const ids = (pupils ?? []).map((r) => String(r.id));
  if (ids.length === 0) {
    return { moved: 0, error: "Tidak ada siswa di kelas asal." };
  }

  const historyRows = ids.map((student_id) => ({
    student_id,
    kelas_id: toId,
    academic_year_id: yearId,
    status: "naik_kelas" as const,
  }));

  const { error: hErr } = await supabase.from("class_histories").insert(historyRows);
  if (hErr) return { moved: 0, error: hErr.message };

  const { error: uErr } = await supabase
    .from("students")
    .update({ kelas_id: toId })
    .eq("kelas_id", fromId);

  if (uErr) return { moved: 0, error: uErr.message };

  const arch = await archiveActiveYearDataForStudents(supabase, ids, yearId);
  if (arch.error) return { moved: 0, error: arch.error };

  revalidatePath("/admin/kenaikan-kelas");
  revalidatePath("/admin/students");
  revalidatePath("/admin/akademik");
  revalidatePath("/siswa/akademik");
  revalidatePath("/admin/kedisiplinan");
  revalidatePath("/siswa/kedisiplinan");
  revalidatePath("/admin/ews");
  revalidatePath("/siswa/ews");
  revalidatePath("/admin/arsip");
  revalidatePath("/siswa/arsip");
  return { moved: ids.length, error: null };
}

/**
 * Kenaikan / tinggal kelas / lulus untuk satu siswa.
 * `academicYearId` opsional: jika kosong dipakai tahun ajaran bertanda aktif.
 */
export async function manualPromoteStudent(
  studentId: string,
  targetKelasId: string,
  status: ClassPromotionStatus,
  academicYearIdOpt?: string | null
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { error: deny };

  const sid = String(studentId ?? "").trim();
  const kid = String(targetKelasId ?? "").trim();
  const st = normStatus(status);
  if (!sid || !kid || !st) {
    return { error: "Data siswa, kelas tujuan, atau status tidak valid." };
  }

  const { data: exists, error: e1 } = await supabase
    .from("students")
    .select("id")
    .eq("id", sid)
    .maybeSingle();
  if (e1) return { error: e1.message };
  if (!exists) return { error: "Siswa tidak ditemukan." };

  const optYear = String(academicYearIdOpt ?? "").trim();
  let academicYearId = optYear;

  if (!academicYearId) {
    const { data: ayPick, error: ayErr } = await supabase
      .from("academic_years")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (ayErr) return { error: ayErr.message };
    academicYearId = String(ayPick?.id ?? "");
  }

  if (!academicYearId) {
    const { data: yearRow, error: yErr } = await supabase
      .from("academic_years")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (yErr) return { error: yErr.message };
    academicYearId = String(yearRow?.id ?? "");
  }

  if (!academicYearId) {
    return { error: "Belum ada tahun ajaran. Tambahkan di tabel academic_years." };
  }

  if (optYear) {
    const { data: yCheck, error: cErr } = await supabase
      .from("academic_years")
      .select("id")
      .eq("id", academicYearId)
      .maybeSingle();
    if (cErr) return { error: cErr.message };
    if (!yCheck) return { error: "Tahun ajaran tidak ditemukan." };
  }

  const { error: uErr } = await supabase
    .from("students")
    .update({ kelas_id: kid })
    .eq("id", sid);
  if (uErr) return { error: uErr.message };

  const { error: iErr } = await supabase.from("class_histories").insert({
    student_id: sid,
    kelas_id: kid,
    academic_year_id: academicYearId,
    status: st,
  });
  if (iErr) return { error: iErr.message };

  if (st === "naik_kelas" || st === "lulus") {
    const arch = await archiveActiveYearDataForStudents(supabase, [sid], academicYearId);
    if (arch.error) return { error: arch.error };
  }

  revalidatePath("/admin/kenaikan-kelas");
  revalidatePath("/admin/students");
  revalidatePath("/admin/akademik");
  revalidatePath("/siswa/akademik");
  revalidatePath("/admin/kedisiplinan");
  revalidatePath("/siswa/kedisiplinan");
  revalidatePath("/admin/ews");
  revalidatePath("/siswa/ews");
  revalidatePath("/admin/arsip");
  revalidatePath("/siswa/arsip");
  return { error: null };
}
