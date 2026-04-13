-- =============================================================================
-- Dummy Data Akademik, Absensi, Kedisiplinan (EWS) untuk Kelas 12
-- Target: Semua jurusan, HANYA kelas 12
-- =============================================================================

begin;

-- --- 1) Akademik (tahun aktif): mapel sesuai tingkat 12 (S1 & S2) -------------
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
    when (hashtext(s.id::text)::bigint + hashtext(sub.id::text)::bigint + v.sem * 11) % 19 = 0
      then 62::numeric
    when (hashtext(s.id::text)::bigint + v.sem * 3) % 17 = 0
      then 71::numeric
    else (73 + (abs(hashtext(s.id::text || sub.id::text || v.sem::text)::bigint) % 26))::numeric
  end,
  (select ay_id from ay)
from public.students s
join public.kelas k on k.id = s.kelas_id
join public.subjects sub on sub.tingkat_kelas = k.tingkat
cross join (values (1), (2)) as v(sem)
where k.tingkat = 12
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
  105 + (abs(hashtext(s.id::text || v.sem::text || 'kelas12')::bigint) % 48),
  case
    when (abs(hashtext(s.id::text || v.sem::text)::bigint) % 11) = 0 then 18
    when (abs(hashtext(s.id::text || v.sem::text)::bigint) % 7) = 0 then 12
    else 1 + (abs(hashtext(s.id::text || v.sem::text)::bigint) % 8)
  end,
  (abs(hashtext(s.id::text || 'i' || v.sem::text)::bigint) % 5),
  (abs(hashtext(s.id::text || 's' || v.sem::text)::bigint) % 4)
from public.students s
join public.kelas k on k.id = s.kelas_id
cross join (values (1), (2)) as v(sem)
where k.tingkat = 12
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
  'Tidak memakai atribut lengkap'
from public.students s
join public.kelas k on k.id = s.kelas_id
where k.tingkat = 12
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text)::bigint) % 5) in (0, 1)
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
  10,
  'Terlambat masuk sekolah'
from public.students s
join public.kelas k on k.id = s.kelas_id
where k.tingkat = 12
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'b')::bigint) % 6) in (0, 2, 4)
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
  'Membawa barang terlarang ke kelas'
from public.students s
join public.kelas k on k.id = s.kelas_id
where k.tingkat = 12
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'z')::bigint) % 17) = 3
  and not exists (
    select 1
    from public.violation_records v
    where v.student_id = s.id
      and v.academic_year_id = (select ay_id from ay)
      and v.semester = 1
      and v.deskripsi = 'Membawa barang terlarang ke kelas'
  );

commit;
