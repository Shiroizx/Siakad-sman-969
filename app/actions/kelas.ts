"use server";

import { createClient } from "@/utils/supabase/server";

export type AdminKelasRecord = {
  id: string;
  nama: string;
  tingkat: number;
  jurusan: string;
  rombel: number | null;
  kapasitas_max: number;
  jumlah_siswa: number;
};

export type AdminKelasPayload = {
  id?: string;
  tingkat: number;
  jurusan: "bahasa" | "mipa" | "ips" | "lainnya";
  rombel: number;
  kapasitas_max: number;
};

export async function getAdminKelas(): Promise<{
  rows: AdminKelasRecord[];
  error: string | null;
}> {
  const supabase = await createClient();

  // Memanfaatkan view: kelas_with_siswa_count (seperti pada migration_kelas_jurusan_rombel.sql)
  const { data, error } = await supabase
    .from("kelas_with_siswa_count")
    .select("*")
    .order("tingkat", { ascending: true })
    .order("jurusan", { ascending: true })
    .order("rombel", { ascending: true });

  if (error) {
    console.error("getAdminKelas error:", error);
    return { rows: [], error: "Gagal memuat daftar kelas." };
  }

  return { rows: data as AdminKelasRecord[], error: null };
}

export async function adminUpsertKelas(
  payload: AdminKelasPayload,
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();

    // 1. Cek validitas data
    if (payload.kapasitas_max < 1) {
      return { error: "Kapasitas minimal adalah 1." };
    }
    if (payload.rombel < 1) {
      return { error: "Nomor rombel minimal 1." };
    }

    // 2. Generate nama otomatis (contoh: X MIPA 1)
    let namaPrefix = "";
    if (payload.tingkat === 10) namaPrefix = "X";
    else if (payload.tingkat === 11) namaPrefix = "XI";
    else if (payload.tingkat === 12) namaPrefix = "XII";
    else namaPrefix = String(payload.tingkat);

    let namaJurusan = "";
    if (payload.jurusan === "bahasa") namaJurusan = "Bahasa";
    else if (payload.jurusan === "mipa") namaJurusan = "MIPA";
    else if (payload.jurusan === "ips") namaJurusan = "IPS";
    else namaJurusan = payload.jurusan; // format lainnya

    const autoNama = `${namaPrefix} ${namaJurusan} ${payload.rombel}`;

    // 3. Jika UPDATE, cek kapasitas tidak boleh lebih kecil dari jumlah_siswa saat ini
    if (payload.id) {
      const { data: viewData, error: viewErr } = await supabase
        .from("kelas_with_siswa_count")
        .select("jumlah_siswa")
        .eq("id", payload.id)
        .single();
      
      if (viewErr) {
        console.error(viewErr);
        return { error: "Gagal memverifikasi kapasitas kelas." };
      }
      
      if (payload.kapasitas_max < viewData.jumlah_siswa) {
        return { error: `Tidak bisa mengurangi kapasitas ke ${payload.kapasitas_max}. Saat ini sudah ada ${viewData.jumlah_siswa} siswa di kelas ini.` };
      }
    }

    // 4. Lakukan Upsert
    const upsertData: Record<string, any> = {
      nama: autoNama,
      tingkat: payload.tingkat,
      jurusan: payload.jurusan,
      rombel: payload.rombel,
      kapasitas_max: payload.kapasitas_max,
    };

    if (payload.id) {
      upsertData.id = payload.id;
      const { error: upsertErr } = await supabase
        .from("kelas")
        .update(upsertData)
        .eq("id", payload.id);

      if (upsertErr) {
        console.error("Update kelas error:", upsertErr);
        // Error kode unik (kombinasi rombel & tingkat / nama) biasanya 23505
        if (upsertErr.code === "23505") return { error: "Kelas dengan tingkat, jurusan, dan rombel ini sudah ada." };
        return { error: "Gagal memperbarui kelas." };
      }
    } else {
      const { error: upsertErr } = await supabase
        .from("kelas")
        .insert(upsertData);

      if (upsertErr) {
        console.error("Insert kelas error:", upsertErr);
        if (upsertErr.code === "23505") return { error: "Kelas dengan tingkat, jurusan, dan rombel ini sudah ada." };
        return { error: "Gagal menambahkan kelas." };
      }
    }

    return { error: null };
  } catch (err: any) {
    console.error("adminUpsertKelas exception:", err);
    return { error: "Terjadi kesalahan internal server." };
  }
}

export async function adminDeleteKelas(
  id: string,
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();

    // 1. Cek apakah masih ada siswa
    const { data: viewData, error: viewErr } = await supabase
      .from("kelas_with_siswa_count")
      .select("jumlah_siswa")
      .eq("id", id)
      .single();

    if (viewErr) {
      console.error(viewErr);
      return { error: "Gagal memeriksa status kelas." };
    }

    if (viewData && viewData.jumlah_siswa > 0) {
      return { error: `Ditolak: Kelas ini masih menampung ${viewData.jumlah_siswa} siswa. Harap migrasikan/hapus status siswa dari kelas ini terlebih dahulu.` };
    }

    // 2. Jika kosong, lakukan penghapusan
    const { error: delErr } = await supabase
      .from("kelas")
      .delete()
      .eq("id", id);

    if (delErr) {
      console.error("Delete kelas error:", delErr);
      return { error: "Gagal menghapus kelas. Mungkin masih ada data terkait." };
    }

    return { error: null };
  } catch (err: any) {
    console.error("adminDeleteKelas exception:", err);
    return { error: "Terjadi kesalahan internal server." };
  }
}
