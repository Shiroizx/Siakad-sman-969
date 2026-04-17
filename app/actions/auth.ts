"use server";

import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";
import { isAuthApiError } from "@supabase/auth-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type LoginState = {
  error: string | null;
};

const TURNSTILE_FIELD = "cf-turnstile-response";
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerifyJson = {
  success: boolean;
  "error-codes"?: string[];
};

async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return false;
  }
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    return false;
  }
  const data = (await res.json()) as TurnstileVerifyJson;
  return data.success === true;
}

const RATE_LIMIT_MESSAGE =
  "Terlalu banyak percobaan masuk. Demi keamanan, akun Anda dikunci sementara. Silakan coba lagi dalam 15 menit.";

const CAPTCHA_FAIL_MESSAGE =
  "Validasi keamanan (CAPTCHA) gagal";

function isTooManyRequestsError(error: unknown): boolean {
  if (isAuthApiError(error) && error.status === 429) {
    return true;
  }
  if (
    error !== null &&
    typeof error === "object" &&
    "status" in error &&
    (error as { status?: unknown }).status === 429
  ) {
    return true;
  }
  return false;
}

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const turnstileToken = String(formData.get(TURNSTILE_FIELD) ?? "").trim();

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  if (!turnstileToken) {
    return { error: CAPTCHA_FAIL_MESSAGE };
  }

  const turnstileOk = await verifyTurnstileToken(turnstileToken);
  if (!turnstileOk) {
    return { error: CAPTCHA_FAIL_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (isTooManyRequestsError(error)) {
      return { error: RATE_LIMIT_MESSAGE };
    }
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
  redirect("/beranda");
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

/** Logout karena sesi tidak aktif; redirect ke halaman login dengan query `reason=timeout`. */
export async function logoutDueToIdle() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const siswa = isSiswaUser(user);
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(siswa ? "/siswa/login?reason=timeout" : "/login?reason=timeout");
}
