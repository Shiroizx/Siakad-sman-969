"use server";

import { resolveActiveAcademicYearId } from "@/app/actions/academic-years";
import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

/** Stempel waktu arsip: jam Jakarta (UTC+7), label WIB. */
function formatArchiveTimestampWibJakarta(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  const day = get("day");
  const month = get("month");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  return `${day} ${month} ${year}, ${hour}.${minute} WIB`;
}

/** Nama tahun ajaran arsip kelulusan (dipakai admin Arsip alumni, disembunyikan dari portal siswa). */
function buildAlumniArchiveYearNama(
  angkatanTahun: number,
  rombelTerakhirNama: string
): string {
  const nama = rombelTerakhirNama.trim() || "—";
  const stamp = formatArchiveTimestampWibJakarta();
  return `Alumni · Angkatan ${angkatanTahun} · ${nama} · ${stamp}`;
}

/** Label unik per kenaikan agar tiap tingkat punya tahun ajaran arsip sendiri (tidak digabung). */
function buildPromotionArchiveYearNama(
  fromNama: string,
  fromTingkat: number | null,
  toNama: string,
  toTingkat: number | null,
  kind: "naik" | "lulus"
): string {
  const fn = fromNama.trim() || "—";
  const tn = toNama.trim() || "—";
  const ft = Number(fromTingkat);
  const tt = Number(toTingkat);
  const fStr = Number.isFinite(ft) ? String(ft) : "?";
  const tStr = Number.isFinite(tt) ? String(tt) : "?";
  const stamp = formatArchiveTimestampWibJakarta();
  if (kind === "lulus") {
    return `Arsip kelulusan (tingkat ${fStr} · ${fn}) · ${stamp}`;
  }
  return `Arsip naik kelas (tingkat ${fStr} ${fn} → tingkat ${tStr} ${tn}) · ${stamp}`;
}

/**
 * Tahun tujuan pemindahan dari tahun aktif.
 * - Jika admin memilih tahun selain aktif: pakai id itu.
 * - Selain itu: buat baris academic_years baru (satu per kenaikan) supaya arsip tidak menyatu.
 */
async function resolveArchiveAcademicYearId(
  supabase: SupabaseClient,
  promotionFormYearId: string,
  activeYearId: string | null,
  newArchiveYearNama: string
): Promise<string> {
  const promo = String(promotionFormYearId ?? "").trim();
  if (activeYearId && promo && promo !== activeYearId) {
    return promo;
  }
  const nama = newArchiveYearNama.trim();
  if (!nama) {
    throw new Error("Nama tahun ajaran arsip kosong.");
  }
  const { data: ins, error } = await supabase
    .from("academic_years")
    .insert({ nama, is_active: false })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (!ins?.id) throw new Error("Gagal membuat tahun ajaran arsip.");
  return String(ins.id);
}

/**
 * Pindahkan nilai, absensi, pelanggaran dari tahun AKTIF → tahun arsip baru
 * (satu academic_year per kenaikan, supaya tingkat 10 / 11 / dst. tidak tercampur).
 */
async function archiveActiveYearDataForStudents(
  supabase: SupabaseClient,
  studentIds: string[],
  promotionFormYearId: string,
  newArchiveYearNama: string
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
      activeId,
      newArchiveYearNama
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

/** Tahun ajaran untuk riwayat kenaikan + acuan arsip: selalu yang bertanda aktif (fallback: terbaru). */
async function resolvePromotionAcademicYearId(
  supabase: SupabaseClient
): Promise<{ id: string; error: string | null }> {
  const { data: ayPick, error: ayErr } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (ayErr) return { id: "", error: ayErr.message };
  let id = String(ayPick?.id ?? "");
  if (!id) {
    const { data: yearRow, error: yErr } = await supabase
      .from("academic_years")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (yErr) return { id: "", error: yErr.message };
    id = String(yearRow?.id ?? "");
  }
  if (!id) {
    return {
      id: "",
      error: "Belum ada tahun ajaran. Tambahkan di tabel academic_years.",
    };
  }
  return { id, error: null };
}

function normStatus(s: string): ClassPromotionStatus | null {
  if (s === "naik_kelas" || s === "tinggal_kelas" || s === "lulus") return s;
  return null;
}

/**
 * Pindahkan semua siswa dari kelas asal ke kelas tujuan dan catat riwayat.
 * Tahun ajaran riwayat & arsip memakai tahun ajaran **aktif** (tanpa pilihan admin).
 */
export async function bulkPromoteClass(
  fromKelasId: string,
  toKelasId: string
): Promise<{ moved: number; error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { moved: 0, error: deny };

  const fromId = String(fromKelasId ?? "").trim();
  const toId = String(toKelasId ?? "").trim();
  if (!fromId || !toId) {
    return { moved: 0, error: "Kelas asal dan tujuan wajib diisi." };
  }

  const { id: yearId, error: yErr } = await resolvePromotionAcademicYearId(supabase);
  if (yErr || !yearId) return { moved: 0, error: yErr ?? "Tahun ajaran tidak ditemukan." };
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

  const { data: kelasPair, error: kpErr } = await supabase
    .from("kelas")
    .select("id, nama, tingkat")
    .in("id", [fromId, toId]);
  if (kpErr) return { moved: 0, error: kpErr.message };
  const kMap = new Map((kelasPair ?? []).map((k) => [String(k.id), k]));
  const fromK = kMap.get(fromId);
  const toK = kMap.get(toId);
  const archiveNama = buildPromotionArchiveYearNama(
    String(fromK?.nama ?? ""),
    fromK?.tingkat != null ? Number(fromK.tingkat) : null,
    String(toK?.nama ?? ""),
    toK?.tingkat != null ? Number(toK.tingkat) : null,
    "naik"
  );
  const arch = await archiveActiveYearDataForStudents(supabase, ids, yearId, archiveNama);
  if (arch.error) return { moved: 0, error: arch.error };

  const historyRows = ids.map((student_id) => ({
    student_id,
    kelas_id: toId,
    kelas_asal_id: fromId,
    academic_year_id: yearId,
    status: "naik_kelas" as const,
  }));

  const { error: hErr } = await supabase.from("class_histories").insert(historyRows);
  if (hErr) return { moved: 0, error: hErr.message };

  const { data: toKelas, error: tkErr } = await supabase
    .from("kelas")
    .select("tingkat, jurusan")
    .eq("id", toId)
    .maybeSingle();
  if (tkErr) return { moved: 0, error: tkErr.message };
  const tk = Number(toKelas?.tingkat);
  const tingkatAkademik = Number.isFinite(tk) ? tk : 10;
  const j = String(toKelas?.jurusan ?? "");
  const peminatanPatch =
    j === "bahasa" || j === "mipa" || j === "ips"
      ? { peminatan_jurusan: j as "bahasa" | "mipa" | "ips" }
      : {};

  const { error: uErr } = await supabase
    .from("students")
    .update({ kelas_id: toId, tingkat_akademik: tingkatAkademik, ...peminatanPatch })
    .eq("kelas_id", fromId);

  if (uErr) return { moved: 0, error: uErr.message };

  revalidatePath("/admin/kenaikan-kelas");
  revalidatePath("/admin/students");
  revalidatePath("/admin/akademik");
  revalidatePath("/siswa/akademik");
  revalidatePath("/admin/kedisiplinan");
  revalidatePath("/siswa/kedisiplinan");
  revalidatePath("/admin/ews");
  revalidatePath("/siswa/ews");
  revalidatePath("/admin/arsip");
  revalidatePath("/admin/arsip-alumni");
  revalidatePath("/admin/kelulusan");
  revalidatePath("/siswa/arsip");
  return { moved: ids.length, error: null };
}

/**
 * Kenaikan / tinggal kelas / lulus untuk satu siswa.
 * Riwayat & arsip memakai tahun ajaran **aktif** (sama seperti bulk).
 */
export async function manualPromoteStudent(
  studentId: string,
  targetKelasId: string,
  status: ClassPromotionStatus
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

  const { id: academicYearId, error: yRes } =
    await resolvePromotionAcademicYearId(supabase);
  if (yRes || !academicYearId) {
    return { error: yRes ?? "Tahun ajaran tidak ditemukan." };
  }

  const { data: prevRow, error: prevErr } = await supabase
    .from("students")
    .select("kelas_id")
    .eq("id", sid)
    .maybeSingle();
  if (prevErr) return { error: prevErr.message };
  const kelasAsalId =
    (st === "naik_kelas" || st === "lulus") && prevRow?.kelas_id
      ? String(prevRow.kelas_id)
      : null;

  const { data: kTujuan, error: kErr } = await supabase
    .from("kelas")
    .select("tingkat, jurusan")
    .eq("id", kid)
    .maybeSingle();
  if (kErr) return { error: kErr.message };
  const tk = Number(kTujuan?.tingkat);
  const tingkatAkademik = Number.isFinite(tk) ? tk : 10;
  const j = String(kTujuan?.jurusan ?? "");
  const peminatanPatch =
    j === "bahasa" || j === "mipa" || j === "ips"
      ? { peminatan_jurusan: j as "bahasa" | "mipa" | "ips" }
      : {};

  if (st === "naik_kelas" || st === "lulus") {
    const idsKelas = [...new Set([kid, ...(kelasAsalId ? [kelasAsalId] : [])])];
    const { data: kRows, error: kFetchErr } = await supabase
      .from("kelas")
      .select("id, nama, tingkat")
      .in("id", idsKelas);
    if (kFetchErr) return { error: kFetchErr.message };
    const m = new Map((kRows ?? []).map((k) => [String(k.id), k]));
    const fk = kelasAsalId ? m.get(kelasAsalId) : null;
    const tkRow = m.get(kid);
    const archiveNama = buildPromotionArchiveYearNama(
      String(fk?.nama ?? "—"),
      fk?.tingkat != null ? Number(fk.tingkat) : null,
      String(tkRow?.nama ?? "—"),
      tkRow?.tingkat != null ? Number(tkRow.tingkat) : null,
      st === "lulus" ? "lulus" : "naik"
    );
    const arch = await archiveActiveYearDataForStudents(
      supabase,
      [sid],
      academicYearId,
      archiveNama
    );
    if (arch.error) return { error: arch.error };
  }

  const { error: uErr } = await supabase
    .from("students")
    .update({ kelas_id: kid, tingkat_akademik: tingkatAkademik, ...peminatanPatch })
    .eq("id", sid);
  if (uErr) return { error: uErr.message };

  const histInsert: Record<string, unknown> = {
    student_id: sid,
    kelas_id: kid,
    academic_year_id: academicYearId,
    status: st,
  };
  if (kelasAsalId) histInsert.kelas_asal_id = kelasAsalId;

  const { error: iErr } = await supabase.from("class_histories").insert(histInsert);
  if (iErr) return { error: iErr.message };

  revalidatePath("/admin/kenaikan-kelas");
  revalidatePath("/admin/students");
  revalidatePath("/admin/akademik");
  revalidatePath("/siswa/akademik");
  revalidatePath("/admin/kedisiplinan");
  revalidatePath("/siswa/kedisiplinan");
  revalidatePath("/admin/ews");
  revalidatePath("/siswa/ews");
  revalidatePath("/admin/arsip");
  revalidatePath("/admin/arsip-alumni");
  revalidatePath("/admin/kelulusan");
  revalidatePath("/siswa/arsip");
  return { error: null };
}

/**
 * Luluskan massal satu rombel kelas XII: arsip ke tahun ajaran "Alumni · Angkatan …",
 * siswa ditandai alumni, kelas_id dikosongkan. Hanya tingkat 12.
 */
export async function bulkGraduateClass12(
  fromKelasId: string,
  angkatanTahun: number
): Promise<{ graduated: number; error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { graduated: 0, error: deny };

  const kid = String(fromKelasId ?? "").trim();
  if (!kid) return { graduated: 0, error: "Kelas wajib dipilih." };

  const ang = Number(angkatanTahun);
  if (!Number.isFinite(ang) || ang < 1990 || ang > 2100) {
    return { graduated: 0, error: "Angkatan tidak valid (tahun 1990–2100)." };
  }

  const { data: kRow, error: kErr } = await supabase
    .from("kelas")
    .select("id, nama, tingkat")
    .eq("id", kid)
    .maybeSingle();
  if (kErr) return { graduated: 0, error: kErr.message };
  if (!kRow) return { graduated: 0, error: "Kelas tidak ditemukan." };
  if (Number(kRow.tingkat) !== 12) {
    return {
      graduated: 0,
      error: "Kelulusan massal hanya untuk rombel kelas XII (tingkat 12).",
    };
  }

  const { id: yearId, error: yErr } = await resolvePromotionAcademicYearId(supabase);
  if (yErr || !yearId) {
    return { graduated: 0, error: yErr ?? "Tahun ajaran tidak ditemukan." };
  }

  const { data: pupils, error: pErr } = await supabase
    .from("students")
    .select("id")
    .eq("kelas_id", kid)
    .eq("is_alumni", false);

  if (pErr) return { graduated: 0, error: pErr.message };
  const ids = (pupils ?? []).map((r) => String(r.id));
  if (ids.length === 0) {
    return { graduated: 0, error: "Tidak ada siswa non-alumni di kelas ini." };
  }

  const archiveNama = buildAlumniArchiveYearNama(ang, String(kRow.nama ?? ""));
  const arch = await archiveActiveYearDataForStudents(supabase, ids, yearId, archiveNama);
  if (arch.error) return { graduated: 0, error: arch.error };

  const historyRows = ids.map((student_id) => ({
    student_id,
    kelas_id: kid,
    academic_year_id: yearId,
    status: "lulus" as const,
  }));
  const { error: hErr } = await supabase.from("class_histories").insert(historyRows);
  if (hErr) return { graduated: 0, error: hErr.message };

  const { error: uErr } = await supabase
    .from("students")
    .update({
      kelas_id: null,
      is_alumni: true,
      angkatan_lulus: ang,
      tingkat_akademik: 12,
    })
    .in("id", ids);
  if (uErr) return { graduated: 0, error: uErr.message };

  revalidatePath("/admin/kenaikan-kelas");
  revalidatePath("/admin/kelulusan");
  revalidatePath("/admin/students");
  revalidatePath("/admin/akademik");
  revalidatePath("/siswa/akademik");
  revalidatePath("/admin/kedisiplinan");
  revalidatePath("/siswa/kedisiplinan");
  revalidatePath("/admin/ews");
  revalidatePath("/siswa/ews");
  revalidatePath("/admin/arsip");
  revalidatePath("/admin/arsip-alumni");
  revalidatePath("/siswa/arsip");
  return { graduated: ids.length, error: null };
}
