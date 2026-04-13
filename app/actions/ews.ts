"use server";

import { resolveActiveAcademicYearId } from "@/app/actions/academic-years";
import { ADMIN_SEMUA_KELAS } from "@/lib/admin-kelas-filter";
import { denyIfSiswaAlumni } from "@/lib/auth/siswa-alumni-gate";
import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/server";

const STUDENT_IN_CHUNK = 400;

export type EwsStudentRow = {
  id: string;
  nisn: string;
  nama: string;
  kelas: string | null;
  totalAlpa: number;
  totalPoinPelanggaran: number;
  /** Jumlah mapel dengan nilai di bawah KKM mapel (subjects.kkm) */
  jumlahMapelDiBawahKkm: number;
};

export async function getEwsData(kelasIdFilter?: string | null): Promise<{
  students: EwsStudentRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { students: [], error: "Anda belum masuk." };
  if (isSiswaUser(auth.user)) return { students: [], error: "Akses ditolak." };

  const f = String(kelasIdFilter ?? "").trim();
  if (!f) return { students: [], error: null };

  const loadAll = f === ADMIN_SEMUA_KELAS;

  let stQuery = supabase
    .from("students")
    .select("id, nisn, nama, kelas_id")
    .order("nama", { ascending: true });
  if (!loadAll) {
    stQuery = stQuery.eq("kelas_id", f);
  }

  const { data: students, error: studentsError } = await stQuery;

  if (studentsError) {
    return {
      students: [],
      error: studentsError.message,
    };
  }

  const kelasIds = [
    ...new Set(
      (students ?? [])
        .map((s) => s.kelas_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const kelasMap = new Map<string, string>();
  if (kelasIds.length > 0) {
    const { data: kelasRows, error: kelasError } = await supabase
      .from("kelas")
      .select("id, nama")
      .in("id", kelasIds);

    if (kelasError) {
      return { students: [], error: kelasError.message };
    }
    for (const k of kelasRows ?? []) {
      kelasMap.set(k.id as string, k.nama as string);
    }
  }

  if (!students?.length) {
    return { students: [], error: null };
  }

  const activeYearId = await resolveActiveAcademicYearId();

  const alpaByStudent = new Map<string, number>();
  const poinByStudent = new Map<string, number>();
  const acadRows: { student_id: unknown; nilai: unknown; subject_id: unknown }[] =
    [];

  if (loadAll) {
    let attQuery = supabase.from("attendance_records").select("student_id, alpa");
    if (activeYearId) attQuery = attQuery.eq("academic_year_id", activeYearId);
    const { data: attRows, error: attError } = await attQuery;

    if (attError) {
      return { students: [], error: attError.message };
    }

    for (const r of attRows ?? []) {
      const sid = r.student_id as string;
      const a = Number(r.alpa) || 0;
      alpaByStudent.set(sid, (alpaByStudent.get(sid) ?? 0) + a);
    }

    let violQuery = supabase.from("violation_records").select("student_id, poin");
    if (activeYearId) violQuery = violQuery.eq("academic_year_id", activeYearId);
    const { data: violRows, error: violError } = await violQuery;

    if (violError) {
      return { students: [], error: violError.message };
    }

    for (const r of violRows ?? []) {
      const sid = r.student_id as string;
      const p = Number(r.poin) || 0;
      poinByStudent.set(sid, (poinByStudent.get(sid) ?? 0) + p);
    }

    let acadQuery = supabase
      .from("academic_records")
      .select("student_id, nilai, subject_id");
    if (activeYearId) acadQuery = acadQuery.eq("academic_year_id", activeYearId);
    const { data: acadAll, error: acadError } = await acadQuery;

    if (acadError) {
      return { students: [], error: acadError.message };
    }
    acadRows.push(...(acadAll ?? []));
  } else {
    const studentIds = students.map((s) => String(s.id));

    for (let i = 0; i < studentIds.length; i += STUDENT_IN_CHUNK) {
      const chunk = studentIds.slice(i, i + STUDENT_IN_CHUNK);

      let attQ = supabase
        .from("attendance_records")
        .select("student_id, alpa")
        .in("student_id", chunk);
      if (activeYearId) attQ = attQ.eq("academic_year_id", activeYearId);
      const { data: attPart, error: attErr } = await attQ;
      if (attErr) return { students: [], error: attErr.message };
      for (const r of attPart ?? []) {
        const sid = r.student_id as string;
        const a = Number(r.alpa) || 0;
        alpaByStudent.set(sid, (alpaByStudent.get(sid) ?? 0) + a);
      }

      let violQ = supabase
        .from("violation_records")
        .select("student_id, poin")
        .in("student_id", chunk);
      if (activeYearId) violQ = violQ.eq("academic_year_id", activeYearId);
      const { data: violPart, error: violErr } = await violQ;
      if (violErr) return { students: [], error: violErr.message };
      for (const r of violPart ?? []) {
        const sid = r.student_id as string;
        const p = Number(r.poin) || 0;
        poinByStudent.set(sid, (poinByStudent.get(sid) ?? 0) + p);
      }

      let acadQ = supabase
        .from("academic_records")
        .select("student_id, nilai, subject_id")
        .in("student_id", chunk);
      if (activeYearId) acadQ = acadQ.eq("academic_year_id", activeYearId);
      const { data: acadPart, error: acadErr } = await acadQ;
      if (acadErr) return { students: [], error: acadErr.message };
      acadRows.push(...(acadPart ?? []));
    }
  }

  const subjectIds = [
    ...new Set(
      acadRows
        .map((r) => r.subject_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const kkmBySubject = new Map<string, number>();
  if (subjectIds.length > 0) {
    const { data: subs, error: subErr } = await supabase
      .from("subjects")
      .select("id, kkm")
      .in("id", subjectIds);
    if (subErr) {
      return { students: [], error: subErr.message };
    }
    for (const s of subs ?? []) {
      kkmBySubject.set(String(s.id), Number(s.kkm ?? 75));
    }
  }

  const redMapelByStudent = new Map<string, number>();
  for (const r of acadRows) {
    const sid = r.student_id as string;
    const n = Number(r.nilai);
    const subId = r.subject_id as string | null;
    const kkm = subId ? kkmBySubject.get(subId) ?? 75 : 75;
    if (!Number.isFinite(n) || n >= kkm) continue;
    redMapelByStudent.set(sid, (redMapelByStudent.get(sid) ?? 0) + 1);
  }

  const list: EwsStudentRow[] = (students ?? []).map((s) => {
    const id = s.id as string;
    const kelasId = s.kelas_id as string | null;
    return {
      id,
      nisn: String(s.nisn ?? ""),
      nama: String(s.nama ?? ""),
      kelas: kelasId ? kelasMap.get(kelasId) ?? null : null,
      totalAlpa: alpaByStudent.get(id) ?? 0,
      totalPoinPelanggaran: poinByStudent.get(id) ?? 0,
      jumlahMapelDiBawahKkm: redMapelByStudent.get(id) ?? 0,
    };
  });

  list.sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  return { students: list, error: null };
}

/** EWS untuk siswa yang sedang login (satu baris, agregasi milik sendiri). */
export async function getMyEwsData(): Promise<{
  row: EwsStudentRow | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { row: null, error: "Anda belum masuk." };
  }
  if (!isSiswaUser(user)) {
    return { row: null, error: "Hanya untuk akun siswa." };
  }

  const alumniDeny = await denyIfSiswaAlumni(supabase, user);
  if (alumniDeny) {
    return { row: null, error: alumniDeny };
  }

  const sid = String(user.user_metadata?.student_id ?? "").trim();
  let st = supabase
    .from("students")
    .select("id, nisn, nama, kelas_id")
    .limit(1);
  st = sid ? st.eq("id", sid) : st.eq("user_id", user.id);

  const { data: s, error: sErr } = await st.maybeSingle();
  if (sErr) {
    return { row: null, error: sErr.message };
  }
  if (!s) {
    return {
      row: null,
      error: "Data siswa tidak ditemukan. Hubungi admin.",
    };
  }

  const id = s.id as string;
  const kelasId = s.kelas_id as string | null;
  let kelasNama: string | null = null;
  if (kelasId) {
    const { data: k } = await supabase
      .from("kelas")
      .select("nama")
      .eq("id", kelasId)
      .maybeSingle();
    if (k?.nama != null) kelasNama = String(k.nama);
  }

  const activeYearId = await resolveActiveAcademicYearId();

  let attSelf = supabase.from("attendance_records").select("alpa").eq("student_id", id);
  if (activeYearId) attSelf = attSelf.eq("academic_year_id", activeYearId);

  let acadSelf = supabase
    .from("academic_records")
    .select("nilai, subject_id")
    .eq("student_id", id);
  if (activeYearId) acadSelf = acadSelf.eq("academic_year_id", activeYearId);

  let violSelf = supabase.from("violation_records").select("poin").eq("student_id", id);
  if (activeYearId) violSelf = violSelf.eq("academic_year_id", activeYearId);

  const [{ data: attRows, error: attError }, { data: violRows, error: violError }, { data: acadRows, error: acadError }] =
    await Promise.all([attSelf, violSelf, acadSelf]);

  if (attError) return { row: null, error: attError.message };
  if (violError) return { row: null, error: violError.message };
  if (acadError) return { row: null, error: acadError.message };

  let totalAlpa = 0;
  for (const r of attRows ?? []) {
    totalAlpa += Number(r.alpa) || 0;
  }

  let totalPoinPelanggaran = 0;
  for (const r of violRows ?? []) {
    totalPoinPelanggaran += Number(r.poin) || 0;
  }

  const subjectIds = [
    ...new Set(
      (acadRows ?? [])
        .map((r) => r.subject_id as string | null)
        .filter((x): x is string => Boolean(x))
    ),
  ];
  const kkmBySubject = new Map<string, number>();
  if (subjectIds.length > 0) {
    const { data: subs } = await supabase
      .from("subjects")
      .select("id, kkm")
      .in("id", subjectIds);
    for (const sub of subs ?? []) {
      kkmBySubject.set(String(sub.id), Number(sub.kkm ?? 75));
    }
  }

  let jumlahMapelDiBawahKkm = 0;
  for (const r of acadRows ?? []) {
    const n = Number(r.nilai);
    const subId = r.subject_id as string | null;
    const kkm = subId ? kkmBySubject.get(subId) ?? 75 : 75;
    if (Number.isFinite(n) && n < kkm) jumlahMapelDiBawahKkm += 1;
  }

  const row: EwsStudentRow = {
    id,
    nisn: String(s.nisn ?? ""),
    nama: String(s.nama ?? ""),
    kelas: kelasNama,
    totalAlpa,
    totalPoinPelanggaran,
    jumlahMapelDiBawahKkm,
  };

  return { row, error: null };
}

export type EwsSettingsPayload = {
  batas_alpa: number;
  batas_nilai_merah: number;
  batas_pelanggaran: number;
};

export async function getEwsSettings(): Promise<{
  settings: EwsSettingsPayload | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ews_settings")
    .select("batas_alpa, batas_nilai_merah, batas_pelanggaran")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("getEwsSettings error:", error);
    return { settings: null, error: "Gagal memuat pengaturan EWS dari database." };
  }

  return { settings: data as EwsSettingsPayload, error: null };
}

export async function updateEwsSettings(
  payload: EwsSettingsPayload
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    
    // Ensure the row exists or gets updated
    const { error } = await supabase
      .from("ews_settings")
      .upsert({
        id: 1,
        batas_alpa: payload.batas_alpa,
        batas_nilai_merah: payload.batas_nilai_merah,
        batas_pelanggaran: payload.batas_pelanggaran,
      });

    if (error) {
      console.error("updateEwsSettings error:", error);
      return { error: "Gagal menyimpan pengaturan EWS." };
    }

    return { error: null };
  } catch (err) {
    console.error(err);
    return { error: "Kesalahan internal." };
  }
}
