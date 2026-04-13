-- =============================================================================
-- Kohort BARU: siswa kelas 10 (akademik), punya peminatan, BELUM rombel
-- (kelas_id NULL). 10 siswa per jurusan: bahasa, mipa, ips (30 total).
--
-- NISN: 9010320001–9010320030 — beda dari kohort 901031 (yang sudah naik kelas).
-- Nama & tanggal lahir beda dari seed 901031.
--
-- Prasyarat:
--   migration_students_peminatan_tingkat.sql
--
-- Setelah ini:
--   sql/seed_dummy_siswa_901032_lengkap_profil_akademik_ews_kedisiplinan.sql
-- =============================================================================

begin;

delete from public.violation_records v
using public.students s
where v.student_id = s.id
  and s.nisn ~ '^901032[0-9]{4}$';

delete from public.attendance_records a
using public.students s
where a.student_id = s.id
  and s.nisn ~ '^901032[0-9]{4}$';

delete from public.academic_records ar
using public.students s
where ar.student_id = s.id
  and s.nisn ~ '^901032[0-9]{4}$';

delete from public.class_histories ch
using public.students s
where ch.student_id = s.id
  and s.nisn ~ '^901032[0-9]{4}$';

delete from public.students s
where s.nisn ~ '^901032[0-9]{4}$';

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
  ('9010320001', 'Fira Maharani Wulandari', 'P', null, '2009-01-08', 'bahasa', 10),
  ('9010320002', 'Galih Permana Putra', 'L', null, '2009-02-19', 'bahasa', 10),
  ('9010320003', 'Hanifa Nur Aini', 'P', null, '2009-03-02', 'bahasa', 10),
  ('9010320004', 'Irsyad Maulana Hakim', 'L', null, '2009-04-14', 'bahasa', 10),
  ('9010320005', 'Jessica Claudia Tan', 'P', null, '2009-05-26', 'bahasa', 10),
  ('9010320006', 'Kenzo Aditya Ramadhan', 'L', null, '2009-06-07', 'bahasa', 10),
  ('9010320007', 'Laras Ayu Sekarini', 'P', null, '2009-07-18', 'bahasa', 10),
  ('9010320008', 'Miko Ardiansyah', 'L', null, '2009-08-29', 'bahasa', 10),
  ('9010320009', 'Nadia Shalsabila', 'P', null, '2009-09-10', 'bahasa', 10),
  ('9010320010', 'Oscar Wijaya Kusuma', 'L', null, '2009-10-21', 'bahasa', 10),
  -- MIPA (10)
  ('9010320011', 'Putri Ananda Safitri', 'P', null, '2009-01-25', 'mipa', 10),
  ('9010320012', 'Revan Daffa Pratama', 'L', null, '2009-02-06', 'mipa', 10),
  ('9010320013', 'Shinta Maharani', 'P', null, '2009-03-17', 'mipa', 10),
  ('9010320014', 'Tegar Bhakti Nugroho', 'L', null, '2009-04-28', 'mipa', 10),
  ('9010320015', 'Utami Dewi Kartika', 'P', null, '2009-05-09', 'mipa', 10),
  ('9010320016', 'Varel Abimanyu', 'L', null, '2009-06-20', 'mipa', 10),
  ('9010320017', 'Wulan Dwi Anggraini', 'P', null, '2009-07-01', 'mipa', 10),
  ('9010320018', 'Yudha Prakoso Wibowo', 'L', null, '2009-08-12', 'mipa', 10),
  ('9010320019', 'Zahra Kamila Putri', 'P', null, '2009-09-23', 'mipa', 10),
  ('9010320020', 'Aditya Rayhan Mahendra', 'L', null, '2009-10-04', 'mipa', 10),
  -- IPS (10)
  ('9010320021', 'Bianca Mutiara Hapsari', 'P', null, '2009-01-16', 'ips', 10),
  ('9010320022', 'Christian Timothy Lie', 'L', null, '2009-02-27', 'ips', 10),
  ('9010320023', 'Devi Anggun Lestari', 'P', null, '2009-03-10', 'ips', 10),
  ('9010320024', 'Edwin Fernando Simanjuntak', 'L', null, '2009-04-21', 'ips', 10),
  ('9010320025', 'Febrianti Suci Rahayu', 'P', null, '2009-05-02', 'ips', 10),
  ('9010320026', 'Gama Firdaus Alam', 'L', null, '2009-06-13', 'ips', 10),
  ('9010320027', 'Helena Patricia Sitorus', 'P', null, '2009-07-24', 'ips', 10),
  ('9010320028', 'Ibrahim Yusuf Ramadhan', 'L', null, '2009-08-05', 'ips', 10),
  ('9010320029', 'Jeanice Angelina Manurung', 'P', null, '2009-09-16', 'ips', 10),
  ('9010320030', 'Kelvin Adrian Siregar', 'L', null, '2009-10-27', 'ips', 10);

commit;

-- Verifikasi:
--   select peminatan_jurusan, count(*) from public.students
--   where nisn ~ '^901032[0-9]{4}$' group by 1 order by 1;
