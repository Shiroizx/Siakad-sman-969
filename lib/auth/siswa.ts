import type { User } from "@supabase/supabase-js";

/** Domain sintetis untuk akun Auth siswa (bukan email nyata). */
export const SISWA_AUTH_EMAIL_DOMAIN = "@siswa.sman969.sch.id";

/** Email unik per NISN untuk Supabase Auth. */
export function siswaSyntheticEmail(nisnDigits: string): string {
  const clean = nisnDigits.replace(/\D/g, "");
  return `nisn_${clean}${SISWA_AUTH_EMAIL_DOMAIN}`;
}

export function isSiswaUser(user: User | null): boolean {
  if (!user) return false;
  if (user.user_metadata?.role === "siswa") return true;
  if (user.email?.endsWith(SISWA_AUTH_EMAIL_DOMAIN)) return true;
  return false;
}

export function normalizeNisnInput(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\D/g, "")
    .trim();
}

/** Validasi format YYYY-MM-DD */
export function isIsoDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Bandingkan tanggal DB (bisa ISO datetime) dengan input YYYY-MM-DD */
export function tanggalLahirCocok(dbValue: string | null, inputYmd: string): boolean {
  if (!dbValue) return false;
  const slice = dbValue.slice(0, 10);
  return slice === inputYmd;
}
