import type { User } from "@supabase/supabase-js";

/** Role identifier untuk Guru BK di user_metadata Supabase. */
export const GURU_BK_ROLE = "guru_bk";

export function isGuruBkUser(user: User | null): boolean {
  if (!user) return false;
  return user.user_metadata?.role === GURU_BK_ROLE;
}
