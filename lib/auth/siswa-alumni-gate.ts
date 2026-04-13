import { isSiswaUser } from "@/lib/auth/siswa";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const ALUMNI_MSG =
  "Akun alumni hanya dapat mengakses menu Arsip alumni pada portal siswa.";

export function getSiswaAlumniOnlyPortalMessage(): string {
  return ALUMNI_MSG;
}

/**
 * Untuk akun portal siswa: jika baris `students.is_alumni`, blokir fitur selain arsip alumni.
 */
export async function denyIfSiswaAlumni(
  supabase: SupabaseClient,
  user: User | null
): Promise<string | null> {
  if (!user || !isSiswaUser(user)) return null;

  const sid = String(user.user_metadata?.student_id ?? "").trim();
  let q = supabase.from("students").select("is_alumni").limit(1);
  q = sid ? q.eq("id", sid) : q.eq("user_id", user.id);
  const { data, error } = await q.maybeSingle();
  if (error) return `Tidak dapat memverifikasi data siswa: ${error.message}`;
  if (data && Boolean(data.is_alumni)) {
    return ALUMNI_MSG;
  }
  return null;
}
