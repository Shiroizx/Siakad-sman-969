-- =============================================================================
-- Dummy Data Akademik, Absensi, Kedisiplinan (EWS) untuk Kelas 11
-- Target: Semua jurusan, HANYA kelas 11
-- =============================================================================

begin;

-- --- 1) Akademik (tahun aktif): mapel sesuai tingkat 11 (S1 & S2) -------------
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
    when (hashtext(s.id::text)::bigint + hashtext(sub.id::text)::bigint + v.sem * 13) % 17 = 0
      then 60::numeric
    when (hashtext(s.id::text)::bigint + v.sem * 5) % 19 = 0
      then 68::numeric
    else (75 + (abs(hashtext(s.id::text || sub.id::text || v.sem::text || 'k11')::bigint) % 24))::numeric
  end,
  (select ay_id from ay)
from public.students s
join public.kelas k on k.id = s.kelas_id
join public.subjects sub on sub.tingkat_kelas = k.tingkat
cross join (values (1), (2)) as v(sem)
where k.tingkat = 11
  and exists (select 1 from ay)
  and not exists (
    select 1
    from public.academic_records x
    where x.student_id = s.id
      and x.subject_id = sub.id
      and x.semester = v.sem
      and x.academic_year_id = (select ay_id from ay)
  );

-- --- 2) Absensi S1 & S2 (tahun aktif) --------------------------------------------
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
  105 + (abs(hashtext(s.id::text || v.sem::text || 'kelas11')::bigint) % 40),
  case
    when (abs(hashtext(s.id::text || v.sem::text || 'alpa')::bigint) % 13) = 0 then 15
    when (abs(hashtext(s.id::text || v.sem::text || 'alpa')::bigint) % 9) = 0 then 10
    else (abs(hashtext(s.id::text || v.sem::text || 'alpa')::bigint) % 6)
  end,
  (abs(hashtext(s.id::text || 'i' || v.sem::text || '11')::bigint) % 6),
  (abs(hashtext(s.id::text || 's' || v.sem::text || '11')::bigint) % 5)
from public.students s
join public.kelas k on k.id = s.kelas_id
cross join (values (1), (2)) as v(sem)
where k.tingkat = 11
  and exists (select 1 from ay)
  and not exists (
    select 1
    from public.attendance_records a
    where a.student_id = s.id
      and a.semester = v.sem
      and a.academic_year_id = (select ay_id from ay)
  );

-- --- 3) Pelanggaran: variasi agar EWS terlihat -------------------------------
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
  15,
  'Rambut panjang/tidak rapi'
from public.students s
join public.kelas k on k.id = s.kelas_id
where k.tingkat = 11
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'pd')::bigint) % 7) in (0, 2)
  and not exists (
    select 1
    from public.violation_records v
    where v.student_id = s.id
      and v.academic_year_id = (select ay_id from ay)
      and v.semester = 1
      and v.deskripsi = 'Rambut panjang/tidak rapi'
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
  10,
  'Membawa make up berlebihan'
from public.students s
join public.kelas k on k.id = s.kelas_id
where k.tingkat = 11
  and exists (select 1 from ay)
  and s.jenis_kelamin = 'P'
  and (abs(hashtext(s.id::text || 'mu')::bigint) % 5) = 1
  and not exists (
    select 1
    from public.violation_records v
    where v.student_id = s.id
      and v.academic_year_id = (select ay_id from ay)
      and v.semester = 2
      and v.deskripsi = 'Membawa make up berlebihan'
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
  'Bermain HP saat PBM'
from public.students s
join public.kelas k on k.id = s.kelas_id
where k.tingkat = 11
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'hp')::bigint) % 11) = 4
  and not exists (
    select 1
    from public.violation_records v
    where v.student_id = s.id
      and v.academic_year_id = (select ay_id from ay)
      and v.semester = 1
      and v.deskripsi = 'Bermain HP saat PBM'
  );

commit;
