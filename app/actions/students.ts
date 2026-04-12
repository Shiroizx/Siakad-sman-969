"use server";

import { ADMIN_SEMUA_KELAS } from "@/lib/admin-kelas-filter";
import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";

export type KelasOption = {
  id: string;
  nama: string;
  tingkat: number;
  jurusan: string | null;
  rombel: number | null;
  jumlah_siswa: number;
  kapasitas_max: number;
  /** Teks untuk dropdown (nama + isi/kapasitas). */
  label: string;
};

export type StudentRecord = {
  id: string;
  nisn: string;
  nama: string;
  jenis_kelamin: string | null;
  kelas_id: string | null;
  kelas_nama: string | null;
  is_alumni: boolean;
  angkatan_lulus: number | null;
  user_id: string | null;
  nik: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  agama: string | null;
  alamat: string | null;
  no_hp: string | null;
  email: string | null;
  nama_ayah: string | null;
  pekerjaan_ayah: string | null;
  nama_ibu: string | null;
  pekerjaan_ibu: string | null;
  no_hp_ortu: string | null;
};

/** Payload admin: buat / sunting siswa (termasuk kelas & identitas). */
export type AdminStudentPayload = {
  id?: string;
  nisn: string;
  nama: string;
  jenis_kelamin: "L" | "P";
  kelas_id: string | null;
  tanggal_lahir: string | null;
  nik?: string | null;
  tempat_lahir?: string | null;
  agama?: string | null;
  alamat?: string | null;
  no_hp?: string | null;
  email?: string | null;
  nama_ayah?: string | null;
  pekerjaan_ayah?: string | null;
  nama_ibu?: string | null;
  pekerjaan_ibu?: string | null;
  no_hp_ortu?: string | null;
};

/** Kolom yang boleh diubah siswa sendiri (bukan NISN / kelas / tanggal lahir / jenis kelamin). */
export type SiswaProfilePatch = {
  nama?: string;
  nik?: string | null;
  tempat_lahir?: string | null;
  agama?: string | null;
  alamat?: string | null;
  no_hp?: string | null;
  email?: string | null;
  nama_ayah?: string | null;
  pekerjaan_ayah?: string | null;
  nama_ibu?: string | null;
  pekerjaan_ibu?: string | null;
  no_hp_ortu?: string | null;
};

function emptyToNull(s: string | null | undefined): string | null {
  const t = String(s ?? "").trim();
  return t.length ? t : null;
}

function assertAdmin(user: User | null) {
  if (!user) return "Anda belum masuk.";
  if (isSiswaUser(user)) return "Akses ditolak.";
  return null;
}

function assertSiswa(user: User | null) {
  if (!user) return "Anda belum masuk.";
  if (!isSiswaUser(user)) return "Hanya untuk akun siswa.";
  return null;
}

function jurusanSortKey(j: string | null | undefined): number {
  if (j === "bahasa") return 1;
  if (j === "mipa") return 2;
  if (j === "ips") return 3;
  return 99;
}

function sortKelasOptions(rows: KelasOption[]): KelasOption[] {
  return [...rows].sort((a, b) => {
    const t = a.tingkat - b.tingkat;
    if (t !== 0) return t;
    const j = jurusanSortKey(a.jurusan) - jurusanSortKey(b.jurusan);
    if (j !== 0) return j;
    const ra = a.rombel ?? 999;
    const rb = b.rombel ?? 999;
    if (ra !== rb) return ra - rb;
    return a.nama.localeCompare(b.nama, "id");
  });
}

function mapRowToKelasOption(r: Record<string, unknown>): KelasOption {
  const nama = String(r.nama ?? "");
  const jumlah = Number(r.jumlah_siswa ?? 0) || 0;
  const cap = Number(r.kapasitas_max ?? 35) || 35;
  return {
    id: String(r.id),
    nama,
    tingkat: Number(r.tingkat ?? 10) || 10,
    jurusan: (r.jurusan as string | null) ?? null,
    rombel: r.rombel != null ? Number(r.rombel) : null,
    jumlah_siswa: jumlah,
    kapasitas_max: cap,
    label: `${nama} (${jumlah}/${cap})`,
  };
}

/** Cegah penempatan melebihi kapasitas (selaras trigger DB). */
async function assertKelasTidakPenuh(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kelasId: string,
  excludeStudentId: string | null
): Promise<string | null> {
  const { data: krow, error: ke } = await supabase
    .from("kelas")
    .select("kapasitas_max, nama")
    .eq("id", kelasId)
    .maybeSingle();
  if (ke) return ke.message;
  if (!krow) return "Kelas tidak ditemukan.";
  const cap = Math.min(99, Math.max(1, Number(krow.kapasitas_max) || 35));

  const { data: members, error: me } = await supabase
    .from("students")
    .select("id")
    .eq("kelas_id", kelasId);
  if (me) return me.message;

  const ids = (members ?? []).map((x) => String(x.id));
  const n = excludeStudentId
    ? ids.filter((id) => id !== excludeStudentId).length
    : ids.length;

  if (n >= cap) {
    return `Kelas ${String(krow.nama ?? "")} sudah penuh (maksimum ${cap} siswa).`;
  }
  return null;
}

function mapStudentRow(
  r: Record<string, unknown>,
  kelasNama: string | null
): StudentRecord {
  const tgl = r.tanggal_lahir as string | null;
  return {
    id: String(r.id),
    nisn: String(r.nisn ?? ""),
    nama: String(r.nama ?? ""),
    jenis_kelamin: (r.jenis_kelamin as string | null) ?? null,
    kelas_id: (r.kelas_id as string | null) ?? null,
    kelas_nama: kelasNama,
    is_alumni: Boolean(r.is_alumni),
    angkatan_lulus:
      r.angkatan_lulus != null && Number.isFinite(Number(r.angkatan_lulus))
        ? Number(r.angkatan_lulus)
        : null,
    user_id: (r.user_id as string | null) ?? null,
    nik: (r.nik as string | null) ?? null,
    tempat_lahir: (r.tempat_lahir as string | null) ?? null,
    tanggal_lahir: tgl ? String(tgl).slice(0, 10) : null,
    agama: (r.agama as string | null) ?? null,
    alamat: (r.alamat as string | null) ?? null,
    no_hp: (r.no_hp as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    nama_ayah: (r.nama_ayah as string | null) ?? null,
    pekerjaan_ayah: (r.pekerjaan_ayah as string | null) ?? null,
    nama_ibu: (r.nama_ibu as string | null) ?? null,
    pekerjaan_ibu: (r.pekerjaan_ibu as string | null) ?? null,
    no_hp_ortu: (r.no_hp_ortu as string | null) ?? null,
  };
}

export async function getKelasList(): Promise<{
  rows: KelasOption[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { rows: [], error: deny };

  const v = await supabase
    .from("kelas_with_siswa_count")
    .select("id, nama, tingkat, jurusan, rombel, jumlah_siswa, kapasitas_max");

  if (!v.error && v.data) {
    return {
      rows: sortKelasOptions(
        (v.data ?? []).map((r) => mapRowToKelasOption(r as Record<string, unknown>))
      ),
      error: null,
    };
  }

  const full = await supabase
    .from("kelas")
    .select("id, nama, tingkat, jurusan, rombel, kapasitas_max")
    .order("nama", { ascending: true });

  if (!full.error && full.data) {
    return {
      rows: sortKelasOptions(
        (full.data ?? []).map((r) => {
          const row = r as Record<string, unknown>;
          return mapRowToKelasOption({
            ...row,
            jumlah_siswa: 0,
            kapasitas_max: row.kapasitas_max ?? 35,
          });
        })
      ),
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("kelas")
    .select("id, nama, tingkat")
    .order("nama", { ascending: true });

  if (error) return { rows: [], error: error.message };
  return {
    rows: sortKelasOptions(
      (data ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        return mapRowToKelasOption({
          ...row,
          jurusan: null,
          rombel: null,
          jumlah_siswa: 0,
          kapasitas_max: 35,
        });
      })
    ),
    error: null,
  };
}

async function kelasNamaMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kelasIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniq = [...new Set(kelasIds.filter(Boolean))];
  if (uniq.length === 0) return map;
  const { data, error } = await supabase
    .from("kelas")
    .select("id, nama")
    .in("id", uniq);
  if (error) return map;
  for (const k of data ?? []) {
    map.set(String(k.id), String(k.nama ?? ""));
  }
  return map;
}

export async function getAdminStudents(kelasIdFilter?: string | null): Promise<{
  students: StudentRecord[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { students: [], error: deny };

  const f = String(kelasIdFilter ?? "").trim();
  if (!f) return { students: [], error: null };

  let q = supabase
    .from("students")
    .select(
      "id, nisn, nama, jenis_kelamin, kelas_id, is_alumni, angkatan_lulus, user_id, nik, tempat_lahir, tanggal_lahir, agama, alamat, no_hp, email, nama_ayah, pekerjaan_ayah, nama_ibu, pekerjaan_ibu, no_hp_ortu"
    )
    .order("nama", { ascending: true });
  if (f !== ADMIN_SEMUA_KELAS) {
    q = q.eq("kelas_id", f);
  }

  const { data: rows, error } = await q;

  if (error) return { students: [], error: error.message };

  const kMap = await kelasNamaMap(
    supabase,
    (rows ?? []).map((r) => r.kelas_id as string | null).filter((id): id is string => Boolean(id))
  );

  const list: StudentRecord[] = (rows ?? []).map((r) => {
    const kid = r.kelas_id as string | null;
    return mapStudentRow(r as Record<string, unknown>, kid ? kMap.get(kid) ?? null : null);
  });

  return { students: list, error: null };
}

/** Daftar tahun angkatan yang punya alumni (untuk filter Arsip alumni). */
export async function listAlumniAngkatanOptions(): Promise<{
  angkatan: number[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { angkatan: [], error: deny };

  const { data: rows, error } = await supabase
    .from("students")
    .select("angkatan_lulus")
    .eq("is_alumni", true);
  if (error) return { angkatan: [], error: error.message };

  const set = new Set<number>();
  for (const r of rows ?? []) {
    const a = Number((r as { angkatan_lulus?: unknown }).angkatan_lulus);
    if (Number.isFinite(a)) set.add(a);
  }
  return { angkatan: [...set].sort((a, b) => b - a), error: null };
}

/**
 * Rombel kelas XII saat lulus (dari `class_histories` status `lulus`) untuk satu angkatan —
 * dipakai filter daftar alumni di Arsip alumni.
 */
export async function listAlumniRombelLulusOptions(angkatan: number): Promise<{
  rombel: { id: string; nama: string }[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { rombel: [], error: deny };

  const ang = Number(angkatan);
  if (!Number.isFinite(ang)) return { rombel: [], error: "Angkatan tidak valid." };

  const { data: studRows, error: e1 } = await supabase
    .from("students")
    .select("id")
    .eq("is_alumni", true)
    .eq("angkatan_lulus", ang);
  if (e1) return { rombel: [], error: e1.message };

  const idList = (studRows ?? []).map((r) => String(r.id)).filter(Boolean);
  if (idList.length === 0) return { rombel: [], error: null };

  const { data: hists, error: e2 } = await supabase
    .from("class_histories")
    .select("kelas_id, kelas:kelas_id ( id, nama, tingkat )")
    .eq("status", "lulus")
    .in("student_id", idList);
  if (e2) return { rombel: [], error: e2.message };

  const m = new Map<string, { id: string; nama: string }>();
  for (const h of hists ?? []) {
    const kid = String(h.kelas_id ?? "").trim();
    if (!kid) continue;
    const kl = h.kelas as
      | { id: string; nama: string; tingkat: number | null }
      | { id: string; nama: string; tingkat: number | null }[]
      | null;
    const k = Array.isArray(kl) ? kl[0] : kl;
    if (!k?.id) continue;
    const tingkat = Number(k.tingkat);
    if (Number.isFinite(tingkat) && tingkat !== 12) continue;
    m.set(String(k.id), { id: String(k.id), nama: String(k.nama ?? "").trim() || "—" });
  }
  const rombel = [...m.values()].sort((a, b) =>
    a.nama.localeCompare(b.nama, "id", { sensitivity: "base" })
  );
  return { rombel, error: null };
}

/** Siswa alumni per angkatan; `rombelLulusId` = filter rombel XII saat lulus (opsional). */
export async function getAdminAlumniStudents(
  angkatan: number,
  rombelLulusId?: string | null
): Promise<{
  students: StudentRecord[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { students: [], error: deny };

  const ang = Number(angkatan);
  if (!Number.isFinite(ang)) return { students: [], error: "Angkatan tidak valid." };

  const romId = String(rombelLulusId ?? "").trim();
  let allowedIds: string[] | null = null;
  if (romId) {
    const { data: ch, error: eCh } = await supabase
      .from("class_histories")
      .select("student_id")
      .eq("status", "lulus")
      .eq("kelas_id", romId);
    if (eCh) return { students: [], error: eCh.message };
    allowedIds = [...new Set((ch ?? []).map((r) => String(r.student_id)).filter(Boolean))];
    if (allowedIds.length === 0) {
      return { students: [], error: null };
    }
  }

  let query = supabase
    .from("students")
    .select(
      "id, nisn, nama, jenis_kelamin, kelas_id, is_alumni, angkatan_lulus, user_id, nik, tempat_lahir, tanggal_lahir, agama, alamat, no_hp, email, nama_ayah, pekerjaan_ayah, nama_ibu, pekerjaan_ibu, no_hp_ortu"
    )
    .eq("is_alumni", true)
    .eq("angkatan_lulus", ang);

  if (allowedIds) {
    query = query.in("id", allowedIds);
  }

  const { data: rows, error } = await query.order("nama", { ascending: true });

  if (error) return { students: [], error: error.message };

  const list: StudentRecord[] = (rows ?? []).map((r) =>
    mapStudentRow(r as Record<string, unknown>, null)
  );
  return { students: list, error: null };
}

export async function adminUpsertStudent(
  data: AdminStudentPayload
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { id: null, error: deny };

  const nisn = String(data.nisn ?? "").replace(/\D/g, "");
  const nama = String(data.nama ?? "").trim();
  if (!nisn || nisn.length !== 10) {
    return { id: null, error: "NISN harus 10 digit." };
  }
  if (!nama) return { id: null, error: "Nama wajib diisi." };
  if (data.jenis_kelamin !== "L" && data.jenis_kelamin !== "P") {
    return { id: null, error: "Jenis kelamin tidak valid." };
  }

  if (data.kelas_id) {
    const capErr = await assertKelasTidakPenuh(
      supabase,
      data.kelas_id,
      data.id ?? null
    );
    if (capErr) return { id: null, error: capErr };
  }

  const row = {
    nisn,
    nama,
    jenis_kelamin: data.jenis_kelamin,
    kelas_id: data.kelas_id || null,
    tanggal_lahir: data.tanggal_lahir || null,
    nik: emptyToNull(data.nik ?? undefined),
    tempat_lahir: emptyToNull(data.tempat_lahir ?? undefined),
    agama: emptyToNull(data.agama ?? undefined),
    alamat: emptyToNull(data.alamat ?? undefined),
    no_hp: emptyToNull(data.no_hp ?? undefined),
    email: emptyToNull(data.email ?? undefined),
    nama_ayah: emptyToNull(data.nama_ayah ?? undefined),
    pekerjaan_ayah: emptyToNull(data.pekerjaan_ayah ?? undefined),
    nama_ibu: emptyToNull(data.nama_ibu ?? undefined),
    pekerjaan_ibu: emptyToNull(data.pekerjaan_ibu ?? undefined),
    no_hp_ortu: emptyToNull(data.no_hp_ortu ?? undefined),
  };

  if (data.id) {
    const { error } = await supabase
      .from("students")
      .update(row)
      .eq("id", data.id);
    if (error) return { id: null, error: error.message };
    revalidatePath("/admin/students");
    revalidatePath("/siswa/profil");
    return { id: data.id, error: null };
  }

  const { data: inserted, error } = await supabase
    .from("students")
    .insert(row)
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
  revalidatePath("/admin/students");
  return { id: String(inserted?.id ?? ""), error: null };
}

export async function adminDeleteStudent(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertAdmin(auth.user);
  if (deny) return { error: deny };

  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/students");
  return { error: null };
}

export async function getMyProfile(): Promise<{
  profile: StudentRecord | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertSiswa(auth.user);
  if (deny) return { profile: null, error: deny };

  const user = auth.user!;
  const sid = String(user.user_metadata?.student_id ?? "").trim();

  let q = supabase
    .from("students")
    .select(
      "id, nisn, nama, jenis_kelamin, kelas_id, is_alumni, angkatan_lulus, user_id, nik, tempat_lahir, tanggal_lahir, agama, alamat, no_hp, email, nama_ayah, pekerjaan_ayah, nama_ibu, pekerjaan_ibu, no_hp_ortu"
    );

  if (sid) {
    q = q.eq("id", sid);
  } else {
    q = q.eq("user_id", user.id);
  }

  const { data: raw, error } = await q.maybeSingle();
  if (error) return { profile: null, error: error.message };
  if (!raw) {
    return {
      profile: null,
      error: "Data siswa tidak ditemukan. Hubungi admin.",
    };
  }

  const r = raw as Record<string, unknown>;
  const kid = r.kelas_id as string | null;
  const kMap = await kelasNamaMap(supabase, kid ? [kid] : []);
  const kelasNama = kid ? kMap.get(kid) ?? null : null;

  return { profile: mapStudentRow(r, kelasNama), error: null };
}

export async function updateMyProfile(
  patch: SiswaProfilePatch
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const deny = assertSiswa(auth.user);
  if (deny) return { error: deny };

  const user = auth.user!;
  const sid = String(user.user_metadata?.student_id ?? "").trim();

  const payload: Record<string, string | null> = {};
  if (patch.nama !== undefined) {
    const n = String(patch.nama).trim();
    if (!n) return { error: "Nama tidak boleh kosong." };
    payload.nama = n;
  }
  if (patch.nik !== undefined) payload.nik = emptyToNull(patch.nik);
  if (patch.tempat_lahir !== undefined) {
    payload.tempat_lahir = emptyToNull(patch.tempat_lahir);
  }
  if (patch.agama !== undefined) payload.agama = emptyToNull(patch.agama);
  if (patch.alamat !== undefined) payload.alamat = emptyToNull(patch.alamat);
  if (patch.no_hp !== undefined) payload.no_hp = emptyToNull(patch.no_hp);
  if (patch.email !== undefined) payload.email = emptyToNull(patch.email);
  if (patch.nama_ayah !== undefined) {
    payload.nama_ayah = emptyToNull(patch.nama_ayah);
  }
  if (patch.pekerjaan_ayah !== undefined) {
    payload.pekerjaan_ayah = emptyToNull(patch.pekerjaan_ayah);
  }
  if (patch.nama_ibu !== undefined) {
    payload.nama_ibu = emptyToNull(patch.nama_ibu);
  }
  if (patch.pekerjaan_ibu !== undefined) {
    payload.pekerjaan_ibu = emptyToNull(patch.pekerjaan_ibu);
  }
  if (patch.no_hp_ortu !== undefined) {
    payload.no_hp_ortu = emptyToNull(patch.no_hp_ortu);
  }

  if (Object.keys(payload).length === 0) {
    return { error: "Tidak ada perubahan untuk disimpan." };
  }

  let q = supabase.from("students").update(payload);
  if (sid) q = q.eq("id", sid);
  else q = q.eq("user_id", user.id);

  const { error } = await q;
  if (error) return { error: error.message };
  revalidatePath("/siswa/profil");
  revalidatePath("/siswa/beranda");
  return { error: null };
}
