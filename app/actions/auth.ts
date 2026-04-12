"use server";

import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type LoginState = {
  error: string | null;
};

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && isSiswaUser(user)) {
    await supabase.auth.signOut();
    return {
      error:
        "Ini halaman masuk staf/admin. Siswa silakan gunakan /siswa/login (NISN & tanggal lahir).",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const siswa = isSiswaUser(user);
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(siswa ? "/siswa/login" : "/login");
}
