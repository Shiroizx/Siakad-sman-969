-- =============================================================================
-- Dummy siswa kelas 10 (akademik): sudah punya jurusan peminatan, BELUM rombel
-- (kelas_id NULL). Minimal 10 siswa per jurusan: bahasa, mipa, ips (30 total).
--
-- NISN: 9010310001–9010310030 (blok khusus; aman diulang = hapus blok lalu isi).
--
-- Prasyarat:
--   migration_students_peminatan_tingkat.sql (kolom peminatan_jurusan, tingkat_akademik)
--
-- Jalankan di Supabase SQL Editor. Tidak menghapus siswa di luar rentang NISN ini.
--
-- Setelah ini, untuk profil + akademik + kedisiplinan + bahan EWS:
--   sql/seed_dummy_siswa_901031_lengkap_profil_akademik_ews_kedisiplinan.sql
--
-- Kohort siswa baru (NISN 901032, beda nama & data): lihat
--   sql/seed_dummy_siswa_kelas10_tanpa_rombel_kohort_baru_901032.sql
-- =============================================================================

begin;

delete from public.violation_records v
using public.students s
where v.student_id = s.id
  and s.nisn ~ '^901031[0-9]{4}$';

delete from public.attendance_records a
using public.students s
where a.student_id = s.id
  and s.nisn ~ '^901031[0-9]{4}$';

delete from public.academic_records ar
using public.students s
where ar.student_id = s.id
  and s.nisn ~ '^901031[0-9]{4}$';

delete from public.class_histories ch
using public.students s
where ch.student_id = s.id
  and s.nisn ~ '^901031[0-9]{4}$';

delete from public.students s
where s.nisn ~ '^901031[0-9]{4}$';

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
  -- Bahasa (10)
  ('9010310001', 'Amira Kusumaningtyas', 'P', null, '2008-02-10', 'bahasa', 10),
  ('9010310002', 'Bagas Mahendra Putra', 'L', null, '2008-03-21', 'bahasa', 10),
  ('9010310003', 'Cinta Lestari Ramadhani', 'P', null, '2008-04-05', 'bahasa', 10),
  ('9010310004', 'Doni Prasetya Wibowo', 'L', null, '2008-05-16', 'bahasa', 10),
  ('9010310005', 'Elisa Novitasari', 'P', null, '2008-06-27', 'bahasa', 10),
  ('9010310006', 'Fadlan Hakim Ramadhan', 'L', null, '2008-07-08', 'bahasa', 10),
  ('9010310007', 'Gita Permata Sari', 'P', null, '2008-08-19', 'bahasa', 10),
  ('9010310008', 'Hendra Nugraha', 'L', null, '2008-09-30', 'bahasa', 10),
  ('9010310009', 'Indah Puspita Maharani', 'P', null, '2008-10-11', 'bahasa', 10),
  ('9010310010', 'Joko Susilo Wijaya', 'L', null, '2008-11-22', 'bahasa', 10),
  -- MIPA (10)
  ('9010310011', 'Kirana Dewi Anggraini', 'P', null, '2008-01-13', 'mipa', 10),
  ('9010310012', 'Lukman Firmansyah', 'L', null, '2008-02-24', 'mipa', 10),
  ('9010310013', 'Melati Oktaviani', 'P', null, '2008-03-07', 'mipa', 10),
  ('9010310014', 'Nanda Rizki Pratama', 'L', null, '2008-04-18', 'mipa', 10),
  ('9010310015', 'Oktavia Salsabila', 'P', null, '2008-05-29', 'mipa', 10),
  ('9010310016', 'Panji Setiawan', 'L', null, '2008-06-09', 'mipa', 10),
  ('9010310017', 'Qonita Aulia Rahma', 'P', null, '2008-07-20', 'mipa', 10),
  ('9010310018', 'Raka Dwi Kusuma', 'L', null, '2008-08-01', 'mipa', 10),
  ('9010310019', 'Salsabila Utami Putri', 'P', null, '2008-09-12', 'mipa', 10),
  ('9010310020', 'Tomi Wijaya Kurniawan', 'L', null, '2008-10-23', 'mipa', 10),
  -- IPS (10)
  ('9010310021', 'Ulfa Hidayati', 'P', null, '2008-02-14', 'ips', 10),
  ('9010310022', 'Vino Aditya Nugroho', 'L', null, '2008-03-25', 'ips', 10),
  ('9010310023', 'Winda Citra Lestari', 'P', null, '2008-04-06', 'ips', 10),
  ('9010310024', 'Yoga Saputra Wibowo', 'L', null, '2008-05-17', 'ips', 10),
  ('9010310025', 'Zaskia Fitriani', 'P', null, '2008-06-28', 'ips', 10),
  ('9010310026', 'Arief Gunawan', 'L', null, '2008-07-09', 'ips', 10),
  ('9010310027', 'Bella Anggraeni', 'P', null, '2008-08-20', 'ips', 10),
  ('9010310028', 'Candra Kusuma Wardhana', 'L', null, '2008-09-01', 'ips', 10),
  ('9010310029', 'Dina Marlina Sari', 'P', null, '2008-10-12', 'ips', 10),
  ('9010310030', 'Eko Wahyu Prakoso', 'L', null, '2008-11-23', 'ips', 10);

commit;

-- Verifikasi:
--   select peminatan_jurusan, count(*) as jumlah
--   from public.students
--   where nisn ~ '^901031[0-9]{4}$'
--   group by peminatan_jurusan
--   order by peminatan_jurusan;
--   select count(*) filter (where kelas_id is null) as tanpa_rombel
--   from public.students
--   where nisn ~ '^901031[0-9]{4}$';
