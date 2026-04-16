"use server";

import { isGuruBkUser } from "@/lib/auth/guru-bk";
import { isSiswaUser } from "@/lib/auth/siswa";
import { resolveActiveAcademicYearId } from "@/app/actions/academic-years";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// ============================================================
// Guards
// ============================================================

function assertGuruBk(user: User | null): string | null {
  if (!user) return "Anda belum masuk.";
  if (!isGuruBkUser(user)) return "Akses ditolak. Hanya untuk Guru BK.";
  return null;
}

function assertAdmin(user: User | null): string | null {
  if (!user) return "Anda belum masuk.";
  if (isSiswaUser(user)) return "Akses ditolak.";
  if (isGuruBkUser(user)) return "Akses ditolak.";
  return null;
}

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================================
// Guru BK: Data Siswa (read-only, seluruh kelas)
// ============================================================

export type GuruBkStudentRow = {
  id: string;
  nisn: string;
  nama: string;
  jenis_kelamin: string | null;
  kelas_id: string | null;
  kelas_nama: string | null;
};

export async function getGuruBkStudents(kelasId?: string): Promise<{
  students: GuruBkStudentRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertGuruBk(auth.user);
  if (deny) return { students: [], error: deny };

  let query = supabase
    .from("students")
    .select("id, nisn, nama, jenis_kelamin, kelas_id")
    .order("nama", { ascending: true });

  if (kelasId) {
    query = query.eq("kelas_id", kelasId);
  }

  const { data, error } = await query;
  if (error) return { students: [], error: error.message };

  // Fetch kelas names
  const kelasIds = [...new Set((data ?? []).map((s) => s.kelas_id as string | null).filter(Boolean))] as string[];
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

  return {
    students: (data ?? []).map((s) => ({
      id: String(s.id),
      nisn: String(s.nisn ?? ""),
      nama: String(s.nama ?? ""),
      jenis_kelamin: (s.jenis_kelamin as string | null) ?? null,
      kelas_id: (s.kelas_id as string | null) ?? null,
      kelas_nama: s.kelas_id ? kelasMap.get(s.kelas_id as string) ?? null : null,
    })),
    error: null,
  };
}

// ============================================================
// Guru BK: Catatan Konseling (CRUD)
// ============================================================

export type CatatanKonselingRow = {
  id: string;
  student_id: string;
  guru_bk_id: string | null;
  kategori: string;
  catatan: string;
  tanggal: string;
  created_at: string;
};

export async function getCatatanKonseling(studentId: string): Promise<{
  rows: CatatanKonselingRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertGuruBk(auth.user);
  if (deny) return { rows: [], error: deny };

  const { data, error } = await supabase
    .from("catatan_konseling")
    .select("id, student_id, guru_bk_id, kategori, catatan, tanggal, created_at")
    .eq("student_id", studentId)
    .order("tanggal", { ascending: false });

  if (error) return { rows: [], error: error.message };

  return {
    rows: (data ?? []).map((r) => ({
      id: String(r.id),
      student_id: String(r.student_id),
      guru_bk_id: r.guru_bk_id ? String(r.guru_bk_id) : null,
      kategori: String(r.kategori ?? ""),
      catatan: String(r.catatan ?? ""),
      tanggal: String(r.tanggal ?? ""),
      created_at: String(r.created_at ?? ""),
    })),
    error: null,
  };
}

export async function addCatatanKonseling(payload: {
  student_id: string;
  kategori: string;
  catatan: string;
  tanggal?: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertGuruBk(auth.user);
  if (deny) return { error: deny };

  const cat = String(payload.catatan ?? "").trim();
  if (!cat) return { error: "Catatan tidak boleh kosong." };

  const validKategori = ["akademik", "perilaku", "pribadi", "sosial", "karir"];
  if (!validKategori.includes(payload.kategori)) {
    return { error: "Kategori tidak valid." };
  }

  const { error } = await supabase.from("catatan_konseling").insert({
    student_id: payload.student_id,
    guru_bk_id: auth.user!.id,
    kategori: payload.kategori,
    catatan: cat,
    tanggal: payload.tanggal || new Date().toISOString().slice(0, 10),
  });

  if (error) return { error: error.message };
  revalidatePath("/guru-bk/catatan");
  return { error: null };
}

export async function updateCatatanKonseling(payload: {
  id: string;
  kategori: string;
  catatan: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertGuruBk(auth.user);
  if (deny) return { error: deny };

  const cat = String(payload.catatan ?? "").trim();
  if (!cat) return { error: "Catatan tidak boleh kosong." };

  const validKategori = ["akademik", "perilaku", "pribadi", "sosial", "karir"];
  if (!validKategori.includes(payload.kategori)) {
    return { error: "Kategori tidak valid." };
  }

  const { error } = await supabase
    .from("catatan_konseling")
    .update({
      kategori: payload.kategori,
      catatan: cat,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.id)
    .eq("guru_bk_id", auth.user!.id);

  if (error) return { error: error.message };
  revalidatePath("/guru-bk/catatan");
  return { error: null };
}

export async function deleteCatatanKonseling(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertGuruBk(auth.user);
  if (deny) return { error: deny };

  const { error } = await supabase
    .from("catatan_konseling")
    .delete()
    .eq("id", id)
    .eq("guru_bk_id", auth.user!.id);

  if (error) return { error: error.message };
  revalidatePath("/guru-bk/catatan");
  return { error: null };
}

// ============================================================
// Admin: Manajemen Guru BK
// ============================================================

export type GuruBkRecord = {
  user_id: string;
  email: string;
  full_name: string;
};

export async function getAdminGuruBkList(): Promise<{
  list: GuruBkRecord[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { list: [], error: deny };

  const adminClient = createSupabaseAdmin();
  const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (error) return { list: [], error: error.message };

  const list: GuruBkRecord[] = users
    .filter((u) => u.user_metadata?.role === "guru_bk")
    .map((u) => ({
      user_id: u.id,
      email: u.email ?? "",
      full_name: String(u.user_metadata?.full_name ?? u.email ?? ""),
    }));

  return { list, error: null };
}

export async function adminCreateGuruBk(payload: {
  full_name: string;
  email: string;
  password: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { error: deny };

  if (!payload.email.trim() || !payload.password || !payload.full_name.trim()) {
    return { error: "Nama, email, dan password wajib diisi." };
  }
  if (payload.password.length < 6) return { error: "Password minimal 6 karakter." };

  const adminClient = createSupabaseAdmin();
  const { error: createErr } = await adminClient.auth.admin.createUser({
    email: payload.email.trim(),
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      role: "guru_bk",
      full_name: payload.full_name.trim(),
    },
  });

  if (createErr) return { error: createErr.message };
  return { error: null };
}

export async function adminDeleteGuruBk(userId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { error: deny };

  const adminClient = createSupabaseAdmin();
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return { error: null };
}
