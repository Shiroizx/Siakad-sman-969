"use server";

import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";

export type AcademicYearRow = {
  id: string;
  nama: string;
  is_active: boolean;
};

/** Tahun ajaran bertanda aktif, atau terbaru jika tidak ada yang aktif. */
export async function resolveActiveAcademicYearId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (row?.id) return String(row.id);
  const { data: anyRow } = await supabase
    .from("academic_years")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return anyRow?.id ? String(anyRow.id) : null;
}

export async function listAcademicYearsAdmin(): Promise<{
  rows: AcademicYearRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { rows: [], error: "Anda belum masuk." };
  if (isSiswaUser(auth.user)) return { rows: [], error: "Akses ditolak." };

  const { data, error } = await supabase
    .from("academic_years")
    .select("id, nama, is_active")
    .order("created_at", { ascending: false });

  if (error) return { rows: [], error: error.message };
  return {
    rows: (data ?? []).map((r) => ({
      id: String(r.id),
      nama: String(r.nama ?? ""),
      is_active: Boolean(r.is_active),
    })),
    error: null,
  };
}
