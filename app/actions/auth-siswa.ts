"use server";

import {
  isIsoDateOnly,
  normalizeNisnInput,
  siswaSyntheticEmail,
  tanggalLahirCocok,
} from "@/lib/auth/siswa";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type LoginSiswaState = {
  error: string | null;
};

export async function loginSiswa(
  _prev: LoginSiswaState,
  formData: FormData
): Promise<LoginSiswaState> {
  const nisn = normalizeNisnInput(formData.get("nisn"));
  const tanggalLahir = String(formData.get("tanggal_lahir") ?? "").trim();

  if (!nisn) {
    return { error: "NISN wajib diisi (10 digit)." };
  }
  if (nisn.length !== 10) {
    return { error: "NISN harus 10 digit." };
  }
  if (!tanggalLahir || !isIsoDateOnly(tanggalLahir)) {
    return {
      error: "Tanggal lahir wajib format tahun-bulan-tanggal (YYYY-MM-DD).",
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Server belum mengatur SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const { data: row, error: qErr } = await admin
    .from("students")
    .select("id, nisn, nama, tanggal_lahir, is_alumni")
    .eq("nisn", nisn)
    .maybeSingle();

  if (qErr) {
    return { error: qErr.message };
  }
  if (!row) {
    return { error: "NISN tidak terdaftar." };
  }

  const dbTgl = row.tanggal_lahir as string | null;
  if (!dbTgl) {
    return {
      error:
        "Data tanggal lahir siswa belum diisi di database. Hubungi admin.",
    };
  }
  if (!tanggalLahirCocok(dbTgl, tanggalLahir)) {
    return { error: "Tanggal lahir tidak sesuai dengan data sekolah." };
  }

  const email = siswaSyntheticEmail(nisn);
  const password = tanggalLahir;

  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "siswa",
      student_id: row.id as string,
      nisn: row.nisn as string,
      nama: String(row.nama ?? ""),
    },
  });

  if (
    createErr &&
    !String(createErr.message).toLowerCase().includes("already") &&
    !String(createErr.message).toLowerCase().includes("registered")
  ) {
    return { error: createErr.message };
  }

  const supabase = await createClient();
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signErr) {
    return {
      error:
        signErr.message === "Invalid login credentials"
          ? "NISN atau tanggal lahir salah."
          : signErr.message,
    };
  }

  const { data: sessionUser } = await supabase.auth.getUser();
  if (sessionUser.user) {
    await admin
      .from("students")
      .update({ user_id: sessionUser.user.id })
      .eq("id", row.id as string);
  }

  revalidatePath("/", "layout");
  redirect(Boolean(row.is_alumni) ? "/siswa/arsip-alumni" : "/siswa/beranda");
}
