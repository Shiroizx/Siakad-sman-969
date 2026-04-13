-- =============================================================================
-- Kohort BARU (901033): Siswa kelas 10 (akademik), punya peminatan, BELUM rombel
-- (kelas_id = NULL). 10 siswa per jurusan: bahasa, mipa, ips (30 total).
--
-- NISN: 9010330001–9010330030
-- =============================================================================

begin;

delete from public.violation_records v
using public.students s
where v.student_id = s.id
  and s.nisn ~ '^901033[0-9]{4}$';

delete from public.attendance_records a
using public.students s
where a.student_id = s.id
  and s.nisn ~ '^901033[0-9]{4}$';

delete from public.academic_records ar
using public.students s
where ar.student_id = s.id
  and s.nisn ~ '^901033[0-9]{4}$';

delete from public.class_histories ch
using public.students s
where ch.student_id = s.id
  and s.nisn ~ '^901033[0-9]{4}$';

delete from public.students s
where s.nisn ~ '^901033[0-9]{4}$';

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
  ('9010330001', 'Aisyah Putri Nurhaliza', 'P', null, '2009-01-12', 'bahasa', 10),
  ('9010330002', 'Beni Saputra', 'L', null, '2009-02-14', 'bahasa', 10),
  ('9010330003', 'Citra Kirana', 'P', null, '2009-03-22', 'bahasa', 10),
  ('9010330004', 'Deni Setiawan', 'L', null, '2009-04-18', 'bahasa', 10),
  ('9010330005', 'Eka Fitriani', 'P', null, '2009-05-30', 'bahasa', 10),
  ('9010330006', 'Fadlan Ramadhan', 'L', null, '2009-06-11', 'bahasa', 10),
  ('9010330007', 'Gita Gutawa', 'P', null, '2009-07-25', 'bahasa', 10),
  ('9010330008', 'Hadi Kusuma', 'L', null, '2009-08-05', 'bahasa', 10),
  ('9010330009', 'Indah Permatasari', 'P', null, '2009-09-17', 'bahasa', 10),
  ('9010330010', 'Joko Susanto', 'L', null, '2009-10-28', 'bahasa', 10),
  
  -- MIPA (10)
  ('9010330011', 'Lestari Wulandari', 'P', null, '2009-01-05', 'mipa', 10),
  ('9010330012', 'Miko Pratama', 'L', null, '2009-02-19', 'mipa', 10),
  ('9010330013', 'Nadia Salsabila', 'P', null, '2009-03-08', 'mipa', 10),
  ('9010330014', 'Oscar Wijaya', 'L', null, '2009-04-20', 'mipa', 10),
  ('9010330015', 'Putri Diana', 'P', null, '2009-05-15', 'mipa', 10),
  ('9010330016', 'Revan Aditya', 'L', null, '2009-06-27', 'mipa', 10),
  ('9010330017', 'Shinta Maharani', 'P', null, '2009-07-14', 'mipa', 10),
  ('9010330018', 'Tegar Nugroho', 'L', null, '2009-08-01', 'mipa', 10),
  ('9010330019', 'Utami Kartika', 'P', null, '2009-09-09', 'mipa', 10),
  ('9010330020', 'Varel Abimanyu', 'L', null, '2009-10-10', 'mipa', 10),

  -- IPS (10)
  ('9010330021', 'Windy Lestari', 'P', null, '2009-01-21', 'ips', 10),
  ('9010330022', 'Yoga Wibowo', 'L', null, '2009-02-03', 'ips', 10),
  ('9010330023', 'Zahra Kamila', 'P', null, '2009-03-12', 'ips', 10),
  ('9010330024', 'Aditya Rayhan', 'L', null, '2009-04-25', 'ips', 10),
  ('9010330025', 'Bianca Mutiara', 'P', null, '2009-05-08', 'ips', 10),
  ('9010330026', 'Christian Lie', 'L', null, '2009-06-19', 'ips', 10),
  ('9010330027', 'Devi Anggun', 'P', null, '2009-07-02', 'ips', 10),
  ('9010330028', 'Edwin Fernando', 'L', null, '2009-08-23', 'ips', 10),
  ('9010330029', 'Febrianti Suci', 'P', null, '2009-09-30', 'ips', 10),
  ('9010330030', 'Gama Firdaus', 'L', null, '2009-10-15', 'ips', 10);

commit;

-- Verifikasi:
--   select peminatan_jurusan, count(*) from public.students
--   where nisn ~ '^901033[0-9]{4}$' group by 1 order by 1;
