import { createClient } from "@supabase/supabase-js";

/**
 * Client service role — hanya dipakai di Server Action / Route Handler.
 * Wajib set `SUPABASE_SERVICE_ROLE_KEY` di .env.local (bukan NEXT_PUBLIC_*).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY atau NEXT_PUBLIC_SUPABASE_URL tidak terset."
    );
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
