-- =============================================================================
-- Dummy Data Lengkap (Data Pribadi, EWS, Akademik, Kedisiplinan) Kelas 10
-- Target: Semua siswa kelas 10 (baik yang sudah punya kelas maupun belum)
-- =============================================================================

begin;

-- --- 1) Profil Siswa (Data Pribadi) ------------------------------------------
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
      array['Jakarta', 'Bandung', 'Surabaya', 'Semarang', 'Yogyakarta', 'Medan', 'Makassar', 'Denpasar', 'Palembang', 'Malang']
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
    'Jl. Cendrawasih No. ' || (10 + (abs(hashtext(s.nisn || 'b')) % 180))::text
    || ', RT ' || (1 + (abs(hashtext(s.nisn || 'c')) % 5))::text
    || '/RW ' || (1 + (abs(hashtext(s.nisn || 'd')) % 8))::text
    || ', Jakarta'
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
    || right(regexp_replace(s.nisn, '\D', '', 'g'), 4)
    || '@siswa.sman969.sch.id'
  ),
  nama_ayah = coalesce(
    nullif(trim(s.nama_ayah), ''),
    (
      array['Hadi S', 'Budi S', 'Eko W', 'Gunawan', 'Joko S', 'Kurniawan', 'Pratama', 'Firman', 'Wahyu N', 'Yusuf M']
    )[1 + (abs(hashtext(s.nisn || 'p')) % 10)]
  ),
  pekerjaan_ayah = coalesce(
    nullif(trim(s.pekerjaan_ayah), ''),
    (
      array['PNS', 'Wiraswasta', 'Karyawan Swasta', 'Guru', 'Pedagang']
    )[1 + (abs(hashtext(s.nisn || 'q')) % 5)]
  ),
  nama_ibu = coalesce(
    nullif(trim(s.nama_ibu), ''),
    (
      array['Siti A', 'Dewi L', 'Rina W', 'Fitri H', 'Yuni K', 'Maya A', 'Nurhayati', 'Ratna S']
    )[1 + (abs(hashtext(s.nisn || 'r')) % 8)]
  ),
  pekerjaan_ibu = coalesce(
    nullif(trim(s.pekerjaan_ibu), ''),
    (
      array['Ibu Rumah Tangga', 'Guru', 'PNS', 'Karyawan Swasta', 'Pedagang']
    )[1 + (abs(hashtext(s.nisn || 's')) % 5)]
  ),
  no_hp_ortu = coalesce(
    nullif(trim(s.no_hp_ortu), ''),
    '08' || lpad((abs(hashtext(s.nisn || 'o')) % 1000000000)::text, 10, '0')
  )
where coalesce((select tingkat from public.kelas where id = s.kelas_id), s.tingkat_akademik) = 10;

-- --- 2) Akademik (tahun aktif): S1 & S2 --------------------------------------
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
    when (hashtext(s.id::text)::bigint + hashtext(sub.id::text)::bigint + v.sem * 7) % 21 = 0
      then 65::numeric
    when (hashtext(s.id::text)::bigint + v.sem * 5) % 15 = 0
      then 72::numeric
    else (76 + (abs(hashtext(s.id::text || sub.id::text || v.sem::text || 'k10')::bigint) % 22))::numeric
  end,
  (select ay_id from ay)
from public.students s
join public.subjects sub
  on sub.tingkat_kelas = 10
cross join (values (1), (2)) as v(sem)
where coalesce((select tingkat from public.kelas where id = s.kelas_id), s.tingkat_akademik) = 10
  and exists (select 1 from ay)
  and not exists (
    select 1
    from public.academic_records x
    where x.student_id = s.id
      and x.subject_id = sub.id
      and x.semester = v.sem
      and x.academic_year_id = (select ay_id from ay)
  );

-- --- 3) Absensi S1 & S2 (tahun aktif) ----------------------------------------
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
  100 + (abs(hashtext(s.id::text || v.sem::text || 'hadir10')::bigint) % 45),
  case
    when (abs(hashtext(s.id::text || v.sem::text || 'a10')::bigint) % 15) = 0 then 16
    when (abs(hashtext(s.id::text || v.sem::text || 'a10')::bigint) % 10) = 0 then 11
    else (abs(hashtext(s.id::text || v.sem::text || 'a10')::bigint) % 5)
  end,
  (abs(hashtext(s.id::text || 'i10' || v.sem::text)::bigint) % 5),
  (abs(hashtext(s.id::text || 's10' || v.sem::text)::bigint) % 3)
from public.students s
cross join (values (1), (2)) as v(sem)
where coalesce((select tingkat from public.kelas where id = s.kelas_id), s.tingkat_akademik) = 10
  and exists (select 1 from ay)
  and not exists (
    select 1
    from public.attendance_records a
    where a.student_id = s.id
      and a.semester = v.sem
      and a.academic_year_id = (select ay_id from ay)
  );

-- --- 4) Pelanggaran (EWS) ----------------------------------------------------
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
where coalesce((select tingkat from public.kelas where id = s.kelas_id), s.tingkat_akademik) = 10
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'v1')::bigint) % 9) = 1
  and not exists (
    select 1
    from public.violation_records v
    where v.student_id = s.id
      and v.academic_year_id = (select ay_id from ay)
      and v.semester = 1
      and v.deskripsi = 'Tidak memakai atribut lengkap'
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
  5,
  'Terlambat masuk sekolah'
from public.students s
where coalesce((select tingkat from public.kelas where id = s.kelas_id), s.tingkat_akademik) = 10
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'v2')::bigint) % 4) = 2
  and not exists (
    select 1
    from public.violation_records v
    where v.student_id = s.id
      and v.academic_year_id = (select ay_id from ay)
      and v.semester = 2
      and v.deskripsi = 'Terlambat masuk sekolah'
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
  25,
  'Membawa barang terlarang'
from public.students s
where coalesce((select tingkat from public.kelas where id = s.kelas_id), s.tingkat_akademik) = 10
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'v3')::bigint) % 15) = 7
  and not exists (
    select 1
    from public.violation_records v
    where v.student_id = s.id
      and v.academic_year_id = (select ay_id from ay)
      and v.semester = 1
      and v.deskripsi = 'Membawa barang terlarang'
  );

commit;
