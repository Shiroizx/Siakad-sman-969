-- =============================================================================
-- Kohort BARU 901032: profil + akademik + kedisiplinan + bahan EWS
-- (NISN 9010320001–9010320030). Data rumus & teks pelanggaran dibedakan dari 901031.
--
-- Prasyarat:
--   sql/seed_dummy_siswa_kelas10_tanpa_rombel_kohort_baru_901032.sql
--   migration_academic_years_archive.sql, migration_subjects_akademik_kedisiplinan.sql
--   migration_violation_academic_year.sql, add_hadir_attendance.sql
--   Satu academic_years is_active = true
--
-- Idempoten: coalesce profil; NOT EXISTS untuk nilai/absensi/pelanggaran.
-- =============================================================================

begin;

update public.students s
set
  nik = coalesce(
    nullif(trim(s.nik), ''),
    '3176' || lpad(
      (abs(hashtext(coalesce(s.id::text, s.nisn) || '901032')) % 1000000000000)::text,
      12,
      '0'
    )
  ),
  tempat_lahir = coalesce(
    nullif(trim(s.tempat_lahir), ''),
    (
      array[
        'Bogor',
        'Depok',
        'Tangerang',
        'Bekasi',
        'Solo',
        'Malang',
        'Padang',
        'Pekanbaru',
        'Manado',
        'Balikpapan'
      ]
    )[1 + (abs(hashtext(s.nisn || 'tb32')) % 10)]
  ),
  agama = coalesce(
    nullif(trim(s.agama), ''),
    (
      array['Islam', 'Islam', 'Kristen', 'Katolik', 'Islam', 'Buddha', 'Hindu', 'Islam']
    )[1 + (abs(hashtext(s.nisn || 'ag32')) % 8)]
  ),
  alamat = coalesce(
    nullif(trim(s.alamat), ''),
    'Jl. Merdeka No. ' || (20 + (abs(hashtext(s.nisn || 'jl32')) % 190))::text
    || ', RT ' || (1 + (abs(hashtext(s.nisn || 'rt32')) % 7))::text
    || '/RW ' || (1 + (abs(hashtext(s.nisn || 'rw32')) % 9))::text
    || ', '
    || (
      array[
        'Bogor',
        'Depok',
        'Tangerang',
        'Bekasi',
        'Solo',
        'Malang',
        'Padang',
        'Pekanbaru',
        'Manado',
        'Balikpapan'
      ]
    )[1 + (abs(hashtext(s.nisn || 'kt32')) % 10)]
  ),
  no_hp = coalesce(
    nullif(trim(s.no_hp), ''),
    '08' || lpad((abs(hashtext(s.nisn || 'hp901032')) % 1000000000)::text, 10, '0')
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
        'Agus Priyanto',
        'Dedi Kurniawan',
        'Ferry Gunawan',
        'Hariyanto Wijaya',
        'Imam Buchori',
        'Lukman Hakim',
        'Nurhadi Santoso',
        'Pramono Adi',
        'Rudi Hartono',
        'Sutrisno Wibowo',
        'Taufik Hidayat',
        'Yanto Prasetyo'
      ]
    )[1 + (abs(hashtext(s.nisn || 'ay32')) % 12)]
  ),
  pekerjaan_ayah = coalesce(
    nullif(trim(s.pekerjaan_ayah), ''),
    (
      array[
        'Wiraswasta',
        'PNS',
        'Karyawan BUMN',
        'TNI',
        'Polisi',
        'Dokter',
        'Pengacara',
        'Arsitek',
        'Nelayan',
        'Buruh'
      ]
    )[1 + (abs(hashtext(s.nisn || 'pk32')) % 10)]
  ),
  nama_ibu = coalesce(
    nullif(trim(s.nama_ibu), ''),
    (
      array[
        'Ani Widiastuti',
        'Bunarti Handayani',
        'Cici Kartikasari',
        'Dian Purnamasari',
        'Erna Susilowati',
        'Fitriani Oktavia',
        'Gita Savitri',
        'Hesti Andriani',
        'Ika Permatasari',
        'Jihan Aulia',
        'Kartika Sari',
        'Lia Marlina'
      ]
    )[1 + (abs(hashtext(s.nisn || 'ib32')) % 12)]
  ),
  pekerjaan_ibu = coalesce(
    nullif(trim(s.pekerjaan_ibu), ''),
    (
      array[
        'Guru',
        'PNS',
        'Apoteker',
        'Perawat',
        'Dosen',
        'Karyawan Swasta',
        'Wiraswasta',
        'Pengusaha',
        'Notaris',
        'Psikolog'
      ]
    )[1 + (abs(hashtext(s.nisn || 'pb32')) % 10)]
  ),
  no_hp_ortu = coalesce(
    nullif(trim(s.no_hp_ortu), ''),
    '08' || lpad((abs(hashtext(s.nisn || 'ort901032')) % 1000000000)::text, 10, '0')
  )
where s.nisn ~ '^901032[0-9]{4}$';

-- --- Akademik: rumus nilai beda dari kohort 901031 ---------------------------
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
  v.sem,
  case
    when (hashtext(s.id::text || 'k32a')::bigint + hashtext(sub.id::text)::bigint + v.sem * 13) % 23 = 0
      then 58::numeric
    when (hashtext(s.id::text || 'k32b')::bigint + v.sem * 5) % 19 = 0
      then 69::numeric
    when (hashtext(s.id::text || 'k32c')::bigint + v.sem) % 11 = 0
      then 74::numeric
    else (68 + (abs(hashtext(s.id::text || sub.id::text || v.sem::text || 'coh32')::bigint) % 27))::numeric
  end,
  (select ay_id from ay)
from public.students s
left join public.kelas k on k.id = s.kelas_id
join public.subjects sub
  on sub.tingkat_kelas = coalesce(k.tingkat, s.tingkat_akademik, 10)
cross join (values (1), (2)) as v(sem)
where s.nisn ~ '^901032[0-9]{4}$'
  and exists (select 1 from ay)
  and not exists (
    select 1
    from public.academic_records x
    where x.student_id = s.id
      and x.subject_id = sub.id
      and x.semester = v.sem
      and x.academic_year_id = (select ay_id from ay)
  );

-- --- Absensi: salt & rentang beda dari 901031 --------------------------------
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
  98 + (abs(hashtext(s.id::text || v.sem::text || '901032coh')::bigint) % 52),
  case
    when (abs(hashtext(s.id::text || v.sem::text || 'ab32')::bigint) % 13) = 0 then 16
    when (abs(hashtext(s.id::text || v.sem::text || 'ab32')::bigint) % 9) = 0 then 10
    else 2 + (abs(hashtext(s.id::text || v.sem::text || 'ab32')::bigint) % 9)
  end,
  (abs(hashtext(s.id::text || 'iz32' || v.sem::text)::bigint) % 6),
  (abs(hashtext(s.id::text || 'sk32' || v.sem::text)::bigint) % 5)
from public.students s
cross join (values (1), (2)) as v(sem)
where s.nisn ~ '^901032[0-9]{4}$'
  and exists (select 1 from ay)
  and not exists (
    select 1
    from public.attendance_records a
    where a.student_id = s.id
      and a.semester = v.sem
      and a.academic_year_id = (select ay_id from ay)
  );

-- --- Pelanggaran: teks & seleksi beda dari 901031 ------------------------------
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
  12,
  'Atribut tidak lengkap saat upacara'
from public.students s
where s.nisn ~ '^901032[0-9]{4}$'
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'v32a')::bigint) % 5) in (2, 3)
  and not exists (
    select 1
    from public.violation_records v
    where v.student_id = s.id
      and v.academic_year_id = (select ay_id from ay)
      and v.semester = 1
      and v.deskripsi = 'Atribut tidak lengkap saat upacara'
  );

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
  8,
  'Terlambat masuk kelas'
from public.students s
where s.nisn ~ '^901032[0-9]{4}$'
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'v32b')::bigint) % 7) in (0, 1, 3)
  and not exists (
    select 1
    from public.violation_records v
    where v.student_id = s.id
      and v.academic_year_id = (select ay_id from ay)
      and v.semester = 2
      and v.deskripsi = 'Terlambat masuk kelas'
  );

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
  20,
  'Makan di ruang laboratorium'
from public.students s
where s.nisn ~ '^901032[0-9]{4}$'
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'v32c')::bigint) % 19) = 7
  and not exists (
    select 1
    from public.violation_records v
    where v.student_id = s.id
      and v.academic_year_id = (select ay_id from ay)
      and v.semester = 1
      and v.deskripsi = 'Makan di ruang laboratorium'
  );

commit;

-- Verifikasi:
--   select nisn, nama, tanggal_lahir from students where nisn ~ '^901032' order by nisn limit 5;
--   select count(*) from academic_records ar
--     join students s on s.id = ar.student_id where s.nisn ~ '^901032';
