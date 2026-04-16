"use server";

import { isWaliKelasUser } from "@/lib/auth/wali-kelas";
import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export type WaliKelasRecord = {
  user_id: string;
  email: string;
  full_name: string;
  /** Kelas-kelas yang dipegang wali kelas ini */
  kelas: { id: string; nama: string }[];
};

export type KelasWithWaliRecord = {
  id: string;
  nama: string;
  tingkat: number;
  jurusan: string;
  rombel: number | null;
  kapasitas_max: number;
  jumlah_siswa: number;
  wali_kelas_user_id: string | null;
  wali_kelas_email: string | null;
  wali_kelas_nama: string | null;
};

/** Ambil data kelas milik wali kelas yang sedang login. */
export async function getMyWaliKelas(): Promise<{
  kelas: { id: string; nama: string; tingkat: number; jurusan: string; rombel: number | null }[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { kelas: [], error: "Anda belum masuk." };
  if (!isWaliKelasUser(user)) return { kelas: [], error: "Akses ditolak." };

  const { data, error } = await supabase
    .from("kelas")
    .select("id, nama, tingkat, jurusan, rombel")
    .eq("wali_kelas_user_id", user.id)
    .order("nama", { ascending: true });

  if (error) return { kelas: [], error: error.message };
  return {
    kelas: (data ?? []).map((k) => ({
      id: String(k.id),
      nama: String(k.nama ?? ""),
      tingkat: Number(k.tingkat ?? 10),
      jurusan: String(k.jurusan ?? ""),
      rombel: k.rombel != null ? Number(k.rombel) : null,
    })),
    error: null,
  };
}

/** Ambil daftar siswa dari kelas yang dipegang wali kelas (view-only). */
export async function getWaliKelasStudents(kelasId: string): Promise<{
  students: { id: string; nisn: string; nama: string; jenis_kelamin: string | null }[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { students: [], error: "Anda belum masuk." };
  if (!isWaliKelasUser(user)) return { students: [], error: "Akses ditolak." };

  // Verifikasi kelas ini memang milik wali kelas ini
  const { data: kelasRow, error: kelasErr } = await supabase
    .from("kelas")
    .select("id")
    .eq("id", kelasId)
    .eq("wali_kelas_user_id", user.id)
    .maybeSingle();

  if (kelasErr) return { students: [], error: kelasErr.message };
  if (!kelasRow) return { students: [], error: "Anda tidak memiliki akses ke kelas ini." };

  const { data, error } = await supabase
    .from("students")
    .select("id, nisn, nama, jenis_kelamin")
    .eq("kelas_id", kelasId)
    .order("nama", { ascending: true });

  if (error) return { students: [], error: error.message };
  return {
    students: (data ?? []).map((s) => ({
      id: String(s.id),
      nisn: String(s.nisn ?? ""),
      nama: String(s.nama ?? ""),
      jenis_kelamin: (s.jenis_kelamin as string | null) ?? null,
    })),
    error: null,
  };
}

// ============================================================
// Admin: Manajemen Wali Kelas
// ============================================================

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** List semua wali kelas beserta kelas yang mereka pegang (admin only). */
export async function getAdminWaliKelasList(): Promise<{
  list: WaliKelasRecord[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { list: [], error: "Anda belum masuk." };
  if (isSiswaUser(user) || isWaliKelasUser(user)) return { list: [], error: "Akses ditolak." };

  // Ambil dari view kelas_with_wali_kelas agar dapat info wali kelas
  const { data: kelasRows, error: kelasErr } = await supabase
    .from("kelas_with_wali_kelas")
    .select("id, nama, wali_kelas_user_id, wali_kelas_email, wali_kelas_nama")
    .not("wali_kelas_user_id", "is", null);

  if (kelasErr) return { list: [], error: kelasErr.message };

  // Grup kelas berdasarkan wali kelas
  const waliMap = new Map<string, WaliKelasRecord>();
  for (const k of kelasRows ?? []) {
    const uid = String(k.wali_kelas_user_id ?? "");
    if (!uid) continue;
    if (!waliMap.has(uid)) {
      waliMap.set(uid, {
        user_id: uid,
        email: String(k.wali_kelas_email ?? ""),
        full_name: String(k.wali_kelas_nama ?? k.wali_kelas_email ?? ""),
        kelas: [],
      });
    }
    waliMap.get(uid)!.kelas.push({ id: String(k.id), nama: String(k.nama ?? "") });
  }

  return { list: [...waliMap.values()], error: null };
}

/** Buat akun Supabase Auth untuk Wali Kelas (admin only). */
export async function adminCreateWaliKelas(payload: {
  full_name: string;
  email: string;
  password: string;
  kelas_ids: string[];
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: "Anda belum masuk." };
  if (isSiswaUser(user) || isWaliKelasUser(user)) return { error: "Akses ditolak." };

  if (!payload.email.trim() || !payload.password || !payload.full_name.trim()) {
    return { error: "Nama, email, dan password wajib diisi." };
  }
  if (payload.password.length < 6) return { error: "Password minimal 6 karakter." };

  const adminClient = createSupabaseAdmin();

  // Buat akun Auth
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email: payload.email.trim(),
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      role: "wali_kelas",
      full_name: payload.full_name.trim(),
    },
  });

  if (createErr) {
    console.error("adminCreateWaliKelas:", createErr);
    return { error: createErr.message };
  }

  const newUserId = created.user.id;

  // Assign kelas
  if (payload.kelas_ids.length > 0) {
    const { error: assignErr } = await supabase
      .from("kelas")
      .update({ wali_kelas_user_id: newUserId })
      .in("id", payload.kelas_ids);

    if (assignErr) {
      console.error("Assign kelas error:", assignErr);
      return { error: "Akun dibuat tapi gagal assign kelas: " + assignErr.message };
    }
  }

  return { error: null };
}

/** Update nama dan/atau kelas Wali Kelas (admin only). */
export async function adminUpdateWaliKelas(payload: {
  user_id: string;
  full_name: string;
  kelas_ids: string[];
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: "Anda belum masuk." };
  if (isSiswaUser(user) || isWaliKelasUser(user)) return { error: "Akses ditolak." };

  const adminClient = createSupabaseAdmin();

  // Update metadata nama
  const { error: metaErr } = await adminClient.auth.admin.updateUserById(payload.user_id, {
    user_metadata: { role: "wali_kelas", full_name: payload.full_name.trim() },
  });
  if (metaErr) return { error: metaErr.message };

  // Reset semua kelas yang dipegang user ini
  const { error: resetErr } = await supabase
    .from("kelas")
    .update({ wali_kelas_user_id: null })
    .eq("wali_kelas_user_id", payload.user_id);
  if (resetErr) return { error: resetErr.message };

  // Assign kelas baru
  if (payload.kelas_ids.length > 0) {
    const { error: assignErr } = await supabase
      .from("kelas")
      .update({ wali_kelas_user_id: payload.user_id })
      .in("id", payload.kelas_ids);
    if (assignErr) return { error: assignErr.message };
  }

  return { error: null };
}

/** Hapus akun Wali Kelas (admin only). Kelas otomatis ter-null-kan by FK ON DELETE SET NULL. */
export async function adminDeleteWaliKelas(userId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: "Anda belum masuk." };
  if (isSiswaUser(user) || isWaliKelasUser(user)) return { error: "Akses ditolak." };

  // Reset kelas dulu agar tidak mengandalkan FK cascade di Auth (bisa berbeda implementasi)
  await supabase
    .from("kelas")
    .update({ wali_kelas_user_id: null })
    .eq("wali_kelas_user_id", userId);

  const adminClient = createSupabaseAdmin();
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  return { error: null };
}

/** Ambil semua kelas dengan info wali kelas (untuk halaman admin kelas & wali kelas). */
export async function getAdminKelasWithWali(): Promise<{
  rows: KelasWithWaliRecord[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { rows: [], error: "Anda belum masuk." };
  if (isSiswaUser(user) || isWaliKelasUser(user)) return { rows: [], error: "Akses ditolak." };

  const { data, error } = await supabase
    .from("kelas_with_wali_kelas")
    .select("*")
    .order("tingkat", { ascending: true })
    .order("jurusan", { ascending: true })
    .order("rombel", { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as KelasWithWaliRecord[], error: null };
}
