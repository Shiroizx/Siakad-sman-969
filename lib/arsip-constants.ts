/** Tahun ajaran sintetis untuk nilai/absensi yang dipindah dari tahun aktif saat naik kelas. */
export const ARSIP_OTOMAT_NAMA = "Arsip otomatis (setelah kenaikan kelas)";

/** Awalan `academic_years.nama` untuk arsip kelulusan (hanya tampil di admin Arsip alumni). */
export const ALUMNI_ARSIP_PREFIX = "Alumni · Angkatan";

export function isAlumniArchiveYearNama(raw: string): boolean {
  return raw.trim().startsWith(ALUMNI_ARSIP_PREFIX);
}
