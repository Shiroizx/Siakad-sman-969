-- =============================================================================
-- Lengkapi data siswa NISN 9009720001–9009720036 (setelah distribusi / penerimaan):
--   • Profil (NIK, alamat, kontak, orang tua) — hanya kolom yang masih kosong
--   • Akademik: nilai semua mapel sesuai tingkat (S1 + S2), tahun ajaran aktif
--   • Kedisiplinan: absensi per semester + pelanggaran (subset siswa)
--   • EWS admin: dihitung dari nilai (< KKM), alpa, dan poin pelanggaran di atas
--
-- Prasyarat: academic_years (satu baris is_active = true), subjects, migrasi
--   migration_academic_years_archive.sql, migration_violation_academic_year.sql,
--   add_hadir_attendance.sql
--
-- Idempoten: profil pakai coalesce; nilai/absensi/pelanggaran pakai NOT EXISTS.
-- =============================================================================

begin;

update public.students s
set
  nik = coalesce(
    nullif(trim(s.nik), ''),
    '3175' || lpad(
      (abs(hashtext(coalesce(s.id::text, s.nisn))) % 1000000000000)::text,
      12,
      '0'
    )
  ),
  tempat_lahir = coalesce(
    nullif(trim(s.tempat_lahir), ''),
    (
      array[
        'Jakarta',
        'Bandung',
        'Surabaya',
        'Semarang',
        'Yogyakarta',
        'Medan',
        'Makassar',
        'Denpasar',
        'Palembang',
        'Malang'
      ]
    )[1 + (abs(hashtext(s.nisn)) % 10)]
  ),
  agama = coalesce(
    nullif(trim(s.agama), ''),
    (
      array['Islam', 'Islam', 'Islam', 'Islam', 'Kristen', 'Katolik', 'Buddha', 'Hindu']
    )[1 + (abs(hashtext(s.nisn || 'a')) % 8)]
  ),
  alamat = coalesce(
    nullif(trim(s.alamat), ''),
    'Jl. Pendidikan No. ' || (10 + (abs(hashtext(s.nisn || 'b')) % 180))::text
    || ', RT ' || (1 + (abs(hashtext(s.nisn || 'c')) % 5))::text
    || '/RW ' || (1 + (abs(hashtext(s.nisn || 'd')) % 8))::text
    || ', '
    || (
      array[
        'Jakarta',
        'Bandung',
        'Surabaya',
        'Semarang',
        'Yogyakarta',
        'Medan',
        'Makassar',
        'Denpasar',
        'Palembang',
        'Malang'
      ]
    )[1 + (abs(hashtext(s.nisn)) % 10)]
  ),
  no_hp = coalesce(
    nullif(trim(s.no_hp), ''),
    '08' || lpad((abs(hashtext(s.nisn || 'h')) % 1000000000)::text, 10, '0')
  ),
  email = coalesce(
    nullif(trim(lower(s.email)), ''),
    lower(
      regexp_replace(
        regexp_replace(trim(split_part(s.nama, ' ', 1)), '\s+', '', 'g'),
        '[^a-zA-Z0-9]',
        '',
        'g'
      )
    )
    || '.'
    || regexp_replace(s.nisn, '\D', '', 'g')
    || '@siswa.sman969.sch.id'
  ),
  nama_ayah = coalesce(
    nullif(trim(s.nama_ayah), ''),
    (
      array[
        'Ahmad Hidayat',
        'Budi Santoso',
        'Eko Wijaya',
        'Hendra Gunawan',
        'Joko Susilo',
        'Kurniawan',
        'Mulyadi Pratama',
        'Rizki Firmansyah',
        'Slamet Riyadi',
        'Wahyu Nugroho',
        'Yusuf Maulana',
        'Zainal Abidin'
      ]
    )[1 + (abs(hashtext(s.nisn || 'p')) % 12)]
  ),
  pekerjaan_ayah = coalesce(
    nullif(trim(s.pekerjaan_ayah), ''),
    (
      array[
        'PNS',
        'Wiraswasta',
        'Karyawan Swasta',
        'Guru',
        'Polisi',
        'TNI',
        'Pedagang',
        'Sopir',
        'Montir',
        'Petani'
      ]
    )[1 + (abs(hashtext(s.nisn || 'q')) % 10)]
  ),
  nama_ibu = coalesce(
    nullif(trim(s.nama_ibu), ''),
    (
      array[
        'Siti Aminah',
        'Dewi Lestari',
        'Rina Wulandari',
        'Fitri Handayani',
        'Yuni Kartika',
        'Maya Anggraini',
        'Linda Permata',
        'Nurhayati',
        'Indah Permatasari',
        'Ratna Sari',
        'Widya Astuti',
        'Yulia Putri'
      ]
    )[1 + (abs(hashtext(s.nisn || 'r')) % 12)]
  ),
  pekerjaan_ibu = coalesce(
    nullif(trim(s.pekerjaan_ibu), ''),
    (
      array[
        'Ibu Rumah Tangga',
        'Guru',
        'PNS',
        'Bidan',
        'Perawat',
        'Karyawan Swasta',
        'Pedagang',
        'Penjahit',
        'Akuntan',
        'Dosen'
      ]
    )[1 + (abs(hashtext(s.nisn || 's')) % 10)]
  ),
  no_hp_ortu = coalesce(
    nullif(trim(s.no_hp_ortu), ''),
    '08' || lpad((abs(hashtext(s.nisn || 'o')) % 1000000000)::text, 10, '0')
  )
where s.nisn ~ '^900972[0-9]{4}$';

-- --- Akademik (tahun ajaran aktif): mapel sesuai tingkat siswa / kelas ----------
with ay as (
  select id as ay_id
  from public.academic_years
  where is_active = true
  order by created_at desc
  limit 1
)
insert into public.academic_records (
  student_id,
  subject_id,
  semester,
  nilai,
  academic_year_id
)
select
  s.id,
  sub.id,
  sem,
  case
    when (hashtext(s.id::text)::bigint + hashtext(sub.id::text)::bigint + sem * 11) % 19 = 0
      then 62::numeric
    when (hashtext(s.id::text)::bigint + sem * 3) % 17 = 0
      then 71::numeric
    else (73 + (abs(hashtext(s.id::text || sub.id::text || sem::text)::bigint) % 26))::numeric
  end,
  (select ay_id from ay)
from public.students s
left join public.kelas k on k.id = s.kelas_id
join public.subjects sub
  on sub.tingkat_kelas = coalesce(k.tingkat, s.tingkat_akademik, 10)
cross join (values (1), (2)) as v(sem)
where s.nisn ~ '^900972[0-9]{4}$'
  and exists (select 1 from ay)
  and not exists (
    select 1
    from public.academic_records x
    where x.student_id = s.id
      and x.subject_id = sub.id
      and x.semester = v.sem
      and x.academic_year_id = (select ay_id from ay)
  );

-- --- Absensi (S1 & S2, tahun aktif) --------------------------------------------
with ay as (
  select id as ay_id
  from public.academic_years
  where is_active = true
  order by created_at desc
  limit 1
)
insert into public.attendance_records (
  student_id,
  semester,
  academic_year_id,
  hadir,
  alpa,
  izin,
  sakit
)
select
  s.id,
  v.sem,
  (select ay_id from ay),
  100 + (abs(hashtext(s.id::text)::bigint) % 50),
  case
    when (abs(hashtext(s.id::text)::bigint) % 23) = 0 then 18
    else (abs(hashtext(s.id::text)::bigint) % 8)
  end,
  (abs(hashtext(s.id::text || 'i')::bigint) % 4),
  (abs(hashtext(s.id::text || 's')::bigint) % 3)
from public.students s
cross join (values (1), (2)) as v(sem)
where s.nisn ~ '^900972[0-9]{4}$'
  and exists (select 1 from ay)
  and not exists (
    select 1
    from public.attendance_records a
    where a.student_id = s.id
      and a.semester = v.sem
      and a.academic_year_id = (select ay_id from ay)
  );

-- --- Pelanggaran (subset, tahun aktif) ----------------------------------------
with ay as (
  select id as ay_id
  from public.academic_years
  where is_active = true
  order by created_at desc
  limit 1
)
insert into public.violation_records (
  student_id,
  semester,
  academic_year_id,
  poin,
  deskripsi
)
select
  s.id,
  1,
  (select ay_id from ay),
  10,
  'Tidak memakai atribut lengkap'
from public.students s
where s.nisn ~ '^900972[0-9]{4}$'
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text)::bigint) % 4) = 0;

with ay as (
  select id as ay_id
  from public.academic_years
  where is_active = true
  order by created_at desc
  limit 1
)
insert into public.violation_records (
  student_id,
  semester,
  academic_year_id,
  poin,
  deskripsi
)
select
  s.id,
  2,
  (select ay_id from ay),
  5,
  'Terlambat masuk sekolah'
from public.students s
where s.nisn ~ '^900972[0-9]{4}$'
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text)::bigint) % 5) in (1, 2);

commit;

-- Cek cepat:
--   select nisn, nama, nik, email from students where nisn ~ '^900972' limit 3;
--   select count(*) from academic_records ar
--     join students s on s.id = ar.student_id where s.nisn ~ '^900972';
--   select count(*) from attendance_records a
--     join students s on s.id = a.student_id where s.nisn ~ '^900972';
--   select count(*) from violation_records v
--     join students s on s.id = v.student_id where s.nisn ~ '^900972';
