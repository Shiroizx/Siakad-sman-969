-- =============================================================================
-- RESET DATA SISWA + seed "sekolah baru": hanya siswa kelas 10 (akademik),
-- punya peminatan (bahasa/mipa/ips), belum punya rombel (kelas_id NULL).
-- Kelas XI/XII tetap ada di master tapi tanpa siswa.
--
-- Urutan:
--   1) migration_students_peminatan_tingkat.sql (sekali)
--   2) skrip ini
--
-- NISN seed: 9009720001–9009720036 (36 siswa: 12 per jurusan).
-- Nama: contoh wajar untuk data dummy (bukan nama tokoh publik).
-- Setelah distribusi kelas, jalankan sql/seed_lengkap_profil_siswa_900972.sql
-- untuk profil, nilai, absensi, pelanggaran (EWS memakai agregasi dari situ).
-- =============================================================================

begin;

delete from public.violation_records;
delete from public.attendance_records;
delete from public.academic_records;
delete from public.class_histories;
delete from public.students;

insert into public.students (
  nisn,
  nama,
  jenis_kelamin,
  kelas_id,
  tanggal_lahir,
  peminatan_jurusan,
  tingkat_akademik
)
values
  -- Peminatan Bahasa (12)
  ('9009720001', 'Andini Putri Maharani', 'P', null, '2008-03-14', 'bahasa', 10),
  ('9009720002', 'Budi Santoso', 'L', null, '2008-07-22', 'bahasa', 10),
  ('9009720003', 'Citra Dewi Lestari', 'P', null, '2008-01-09', 'bahasa', 10),
  ('9009720004', 'Dwi Anggraini', 'P', null, '2008-11-03', 'bahasa', 10),
  ('9009720005', 'Eka Pratiwi', 'P', null, '2008-05-18', 'bahasa', 10),
  ('9009720006', 'Fajar Ramadhan', 'L', null, '2008-09-30', 'bahasa', 10),
  ('9009720007', 'Gilang Wicaksono', 'L', null, '2008-02-25', 'bahasa', 10),
  ('9009720008', 'Hana Safitri', 'P', null, '2008-08-12', 'bahasa', 10),
  ('9009720009', 'Indra Lesmana', 'L', null, '2008-04-07', 'bahasa', 10),
  ('9009720010', 'Juwita Sari', 'P', null, '2008-10-21', 'bahasa', 10),
  ('9009720011', 'Kevin Aditya Nugraha', 'L', null, '2008-06-16', 'bahasa', 10),
  ('9009720012', 'Lestari Wulandari', 'P', null, '2008-12-01', 'bahasa', 10),
  -- Peminatan MIPA (12)
  ('9009720013', 'Muhammad Rizki Pratama', 'L', null, '2008-03-03', 'mipa', 10),
  ('9009720014', 'Nadia Fitriani', 'P', null, '2008-07-19', 'mipa', 10),
  ('9009720015', 'Oktavianus Tie', 'L', null, '2008-01-28', 'mipa', 10),
  ('9009720016', 'Putri Ayu Lestari', 'P', null, '2008-11-14', 'mipa', 10),
  ('9009720017', 'Qori Sandria Utami', 'P', null, '2008-05-05', 'mipa', 10),
  ('9009720018', 'Rendy Kusuma Wardana', 'L', null, '2008-09-08', 'mipa', 10),
  ('9009720019', 'Siti Aisyah Rahmawati', 'P', null, '2008-02-11', 'mipa', 10),
  ('9009720020', 'Teguh Firmansyah', 'L', null, '2008-08-27', 'mipa', 10),
  ('9009720021', 'Umi Kalsum', 'P', null, '2008-04-22', 'mipa', 10),
  ('9009720022', 'Valentino Simanjuntak', 'L', null, '2008-10-05', 'mipa', 10),
  ('9009720023', 'Widiastuti Putri', 'P', null, '2008-06-09', 'mipa', 10),
  ('9009720024', 'Yoga Prasetyo', 'L', null, '2008-12-18', 'mipa', 10),
  -- Peminatan IPS (12)
  ('9009720025', 'Adi Nugroho', 'L', null, '2008-03-27', 'ips', 10),
  ('9009720026', 'Bayu Setiawan', 'L', null, '2008-07-06', 'ips', 10),
  ('9009720027', 'Dewi Anggraeni', 'P', null, '2008-01-15', 'ips', 10),
  ('9009720028', 'Eko Wahyudi', 'L', null, '2008-11-29', 'ips', 10),
  ('9009720029', 'Fitri Hidayati', 'P', null, '2008-05-24', 'ips', 10),
  ('9009720030', 'Guntur Prakasa', 'L', null, '2008-09-02', 'ips', 10),
  ('9009720031', 'Hesti Purwanti', 'P', null, '2008-02-19', 'ips', 10),
  ('9009720032', 'Iwan Setiadi', 'L', null, '2008-08-31', 'ips', 10),
  ('9009720033', 'Jihan Aulia', 'P', null, '2008-04-13', 'ips', 10),
  ('9009720034', 'Kurniawan Hakim', 'L', null, '2008-10-26', 'ips', 10),
  ('9009720035', 'Lina Marlina', 'P', null, '2008-06-04', 'ips', 10),
  ('9009720036', 'Maulana Yusuf', 'L', null, '2008-12-11', 'ips', 10);

commit;

-- Verifikasi cepat:
--   select peminatan_jurusan, count(*) from students group by 1;
--   select count(*) from students where kelas_id is not null;  -- harus 0
