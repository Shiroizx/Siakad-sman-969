"use server";

import {
  computePeminatanBahasa,
  computePeminatanResults,
  type HasilJurusan,
  type HasilProfilJurusan,
} from "@/lib/peminatan/profile-matching";
import { denyIfSiswaAlumni } from "@/lib/auth/siswa-alumni-gate";
import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PeminatanStudentOption = {
  id: string;
  nama: string;
  nisn: string;
};

async function resolveOwnStudentId(
  supabase: SupabaseClient,
  user: { id: string; user_metadata?: Record<string, unknown> }
): Promise<string | null> {
  const sid = String(user.user_metadata?.student_id ?? "").trim();
  let st = supabase.from("students").select("id").limit(1);
  st = sid ? st.eq("id", sid) : st.eq("user_id", user.id);
  const { data } = await st.maybeSingle();
  return data?.id ? String(data.id) : null;
}

/** Daftar siswa untuk pemilih admin (urut nama); portal siswa hanya diri sendiri. */
export async function listStudentsForPeminatan(): Promise<{
  students: PeminatanStudentOption[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { students: [], error: "Anda belum masuk." };

  if (isSiswaUser(auth.user)) {
    const alumniDeny = await denyIfSiswaAlumni(supabase, auth.user);
    if (alumniDeny) {
      return { students: [], error: alumniDeny };
    }
    const ownId = await resolveOwnStudentId(supabase, auth.user);
    if (!ownId) {
      return {
        students: [],
        error: "Akun siswa tidak terhubung ke data students.",
      };
    }
    const { data: one, error } = await supabase
      .from("students")
      .select("id, nama, nisn")
      .eq("id", ownId)
      .maybeSingle();
    if (error) return { students: [], error: error.message };
    if (!one) return { students: [], error: "Data siswa tidak ditemukan." };
    return {
      students: [
        {
          id: String(one.id),
          nama: String(one.nama ?? ""),
          nisn: String(one.nisn ?? ""),
        },
      ],
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("students")
    .select("id, nama, nisn")
    .order("nama", { ascending: true });

  if (error) {
    return { students: [], error: error.message };
  }

  return {
    students: (data ?? []).map((r) => ({
      id: String(r.id),
      nama: String(r.nama ?? ""),
      nisn: String(r.nisn ?? ""),
    })),
    error: null,
  };
}

export async function calculateProfileMatching(studentId: string): Promise<{
  studentNama: string | null;
  studentNisn: string | null;
  hasil: HasilJurusan[];
  rekomendasiUtama: "MIPA" | "IPS" | null;
  hasilBahasa: HasilProfilJurusan[];
  rekomendasiBahasaUtama: "BAHASA_1" | "BAHASA_2" | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return {
      studentNama: null,
      studentNisn: null,
      hasil: [],
      rekomendasiUtama: null,
      hasilBahasa: [],
      rekomendasiBahasaUtama: null,
      error: "Anda belum masuk.",
    };
  }

  if (isSiswaUser(auth.user)) {
    const alumniDeny = await denyIfSiswaAlumni(supabase, auth.user);
    if (alumniDeny) {
      return {
        studentNama: null,
        studentNisn: null,
        hasil: [],
        rekomendasiUtama: null,
        hasilBahasa: [],
        rekomendasiBahasaUtama: null,
        error: alumniDeny,
      };
    }
    const ownId = await resolveOwnStudentId(supabase, auth.user);
    if (!ownId || ownId !== String(studentId)) {
      return {
        studentNama: null,
        studentNisn: null,
        hasil: [],
        rekomendasiUtama: null,
        hasilBahasa: [],
        rekomendasiBahasaUtama: null,
        error: "Akses ditolak.",
      };
    }
  }

  const { data: siswa, error: siswaError } = await supabase
    .from("students")
    .select("id, nama, nisn")
    .eq("id", studentId)
    .maybeSingle();

  if (siswaError) {
    return {
      studentNama: null,
      studentNisn: null,
      hasil: [],
      rekomendasiUtama: null,
      hasilBahasa: [],
      rekomendasiBahasaUtama: null,
      error: siswaError.message,
    };
  }

  if (!siswa) {
    return {
      studentNama: null,
      studentNisn: null,
      hasil: [],
      rekomendasiUtama: null,
      hasilBahasa: [],
      rekomendasiBahasaUtama: null,
      error: "Siswa tidak ditemukan.",
    };
  }

  const { data: records, error: recError } = await supabase
    .from("academic_records")
    .select("nilai, subjects ( nama_mapel, tingkat_kelas )")
    .eq("student_id", studentId);

  if (recError) {
    return {
      studentNama: String(siswa.nama ?? ""),
      studentNisn: String(siswa.nisn ?? ""),
      hasil: [],
      rekomendasiUtama: null,
      hasilBahasa: [],
      rekomendasiBahasaUtama: null,
      error: recError.message,
    };
  }

  const buckets = new Map<string, number[]>();

  for (const r of records ?? []) {
    const sub = r.subjects as
      | { nama_mapel: string; tingkat_kelas: number | null }
      | { nama_mapel: string; tingkat_kelas: number | null }[]
      | null;
    const subObj = Array.isArray(sub) ? sub[0] : sub;
    if (!subObj) continue;
    const tingkat = Number(subObj.tingkat_kelas);
    if (tingkat !== 10) continue;

    const nama = String(subObj.nama_mapel ?? "").trim();
    if (!nama) continue;

    const v = Number(r.nilai);
    if (!Number.isFinite(v)) continue;

    const list = buckets.get(nama) ?? [];
    list.push(v);
    buckets.set(nama, list);
  }

  const nilaiByMapel = new Map<string, number>();
  for (const [nama, list] of buckets) {
    const avg = list.reduce((a, b) => a + b, 0) / list.length;
    nilaiByMapel.set(nama, Math.round(avg * 100) / 100);
  }

  const { hasil, rekomendasiUtama } = computePeminatanResults(nilaiByMapel);
  const { hasil: hasilBahasa, rekomendasiUtama: rekomendasiBahasaUtama } =
    computePeminatanBahasa(nilaiByMapel);

  return {
    studentNama: String(siswa.nama ?? ""),
    studentNisn: String(siswa.nisn ?? ""),
    hasil,
    rekomendasiUtama,
    hasilBahasa,
    rekomendasiBahasaUtama,
    error: null,
  };
}
