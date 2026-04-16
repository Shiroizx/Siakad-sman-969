import type { User } from "@supabase/supabase-js";

/** Role identifier untuk Wali Kelas di user_metadata Supabase. */
export const WALI_KELAS_ROLE = "wali_kelas";

export function isWaliKelasUser(user: User | null): boolean {
  if (!user) return false;
  return user.user_metadata?.role === WALI_KELAS_ROLE;
}
