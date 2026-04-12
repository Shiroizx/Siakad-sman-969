-- =============================================================================
-- Hapus data akademik & kedisiplinan untuk siswa yang saat ini di kelas
-- XI Bahasa 1 (nilai, absensi, pelanggaran).
--
-- Sesuaikan nama rombel di CTE `k` jika di database Anda penulisannya beda
-- (contoh: "XI  Bahasa 1" dengan spasi ganda → ubah filter).
--
-- Opsional: uncomment bagian class_histories jika ingin mereset riwayat naik.
-- =============================================================================

begin;

-- --- Pastikan target kelas (ubah nama jika perlu) -----------------------------
with k as (
  select id
  from public.kelas
  where trim(nama) = 'XI Bahasa 1'
  limit 1
),
siswa as (
  select s.id
  from public.students s
  inner join k on k.id = s.kelas_id
)
delete from public.violation_records v
using siswa
where v.student_id = siswa.id;

with k as (
  select id
  from public.kelas
  where trim(nama) = 'XI Bahasa 1'
  limit 1
),
siswa as (
  select s.id
  from public.students s
  inner join k on k.id = s.kelas_id
)
delete from public.attendance_records a
using siswa
where a.student_id = siswa.id;

with k as (
  select id
  from public.kelas
  where trim(nama) = 'XI Bahasa 1'
  limit 1
),
siswa as (
  select s.id
  from public.students s
  inner join k on k.id = s.kelas_id
)
delete from public.academic_records ar
using siswa
where ar.student_id = siswa.id;

/*
-- Riwayat penempatan / kenaikan yang menyangkut rombel ini (opsional):
with k as (
  select id from public.kelas where trim(nama) = 'XI Bahasa 1' limit 1
)
delete from public.class_histories ch
using k
where ch.kelas_id = k.id or ch.kelas_asal_id = k.id;
*/

commit;

-- Cek sebelum dijalankan (jalankan tanpa BEGIN/COMMIT sebagai SELECT saja):
-- select id, nama, tingkat from public.kelas where trim(nama) = 'XI Bahasa 1';
-- select count(*) from students s
--   join kelas k on k.id = s.kelas_id and trim(k.nama) = 'XI Bahasa 1';
