-- =============================================================================
-- Dummy akademik, absensi/pelanggaran (kedisiplinan), dan bahan agregasi EWS
-- untuk semua siswa di rombel X Bahasa 1 (tingkat 10, bahasa, rombel 1).
--
-- EWS di aplikasi dihitung dari tabel ini (nilai vs KKM, alpa, poin).
--
-- Prasyarat:
--   • migration_academic_years_archive.sql, migration_subjects_akademik_kedisiplinan.sql
--   • migration_violation_academic_year.sql, add_hadir_attendance.sql
--   • Satu baris academic_years dengan is_active = true
--
-- Idempoten: INSERT hanya jika kombinasi unik belum ada.
-- Sesuaikan trim(k.nama) bila nama rombel di DB Anda beda (mis. spasi ekstra).
-- =============================================================================

begin;

-- --- (Opsional) Hapus data tahun AKTIF untuk siswa X Bahasa 1, lalu isi ulang --
/*
with ay as (
  select id as ay_id
  from public.academic_years
  where is_active = true
  order by created_at desc
  limit 1
),
sx as (
  select s.id
  from public.students s
  join public.kelas k on k.id = s.kelas_id
  where k.tingkat = 10
    and trim(k.nama) = 'X Bahasa 1'
)
delete from public.academic_records ar
using ay, sx
where ar.student_id = sx.id
  and ar.academic_year_id = ay.ay_id;

with ay as (
  select id as ay_id
  from public.academic_years
  where is_active = true
  order by created_at desc
  limit 1
),
sx as (
  select s.id
  from public.students s
  join public.kelas k on k.id = s.kelas_id
  where k.tingkat = 10
    and trim(k.nama) = 'X Bahasa 1'
)
delete from public.attendance_records a
using ay, sx
where a.student_id = sx.id
  and a.academic_year_id = ay.ay_id;

with ay as (
  select id as ay_id
  from public.academic_years
  where is_active = true
  order by created_at desc
  limit 1
),
sx as (
  select s.id
  from public.students s
  join public.kelas k on k.id = s.kelas_id
  where k.tingkat = 10
    and trim(k.nama) = 'X Bahasa 1'
)
delete from public.violation_records v
using ay, sx
where v.student_id = sx.id
  and v.academic_year_id = ay.ay_id;
*/

-- --- Akademik: mapel tingkat 10, S1 & S2, tahun ajaran aktif -------------------
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
    when (hashtext(s.id::text)::bigint + hashtext(sub.id::text)::bigint + v.sem * 10) % 17 = 0
      then 60::numeric
    when (hashtext(s.id::text)::bigint + hashtext(sub.id::text)::bigint + v.sem * 5) % 13 = 0
      then 68::numeric
    when (hashtext(s.id::text)::bigint + v.sem * 3) % 19 = 0
      then 72::numeric
    else (74 + (abs(hashtext(s.id::text || sub.id::text || v.sem::text)::bigint) % 24))::numeric
  end,
  (select ay_id from ay)
from public.students s
join public.kelas k on k.id = s.kelas_id
join public.subjects sub on sub.tingkat_kelas = k.tingkat
cross join (values (1), (2)) as v(sem)
where k.tingkat = 10
  and trim(k.nama) = 'X Bahasa 1'
  and exists (select 1 from ay)
  and not exists (
    select 1
    from public.academic_records x
    where x.student_id = s.id
      and x.subject_id = sub.id
      and x.semester = v.sem
      and x.academic_year_id = (select ay_id from ay)
  );

-- --- Absensi: S1 & S2 ----------------------------------------------------------
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
  105 + (abs(hashtext(s.id::text || v.sem::text || 'x10')::bigint) % 48),
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
where k.tingkat = 10
  and trim(k.nama) = 'X Bahasa 1'
  and exists (select 1 from ay)
  and not exists (
    select 1
    from public.attendance_records a
    where a.student_id = s.id
      and a.semester = v.sem
      and a.academic_year_id = (select ay_id from ay)
  );

-- --- Pelanggaran (subset, idempoten) --------------------------------------------
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
where k.tingkat = 10
  and trim(k.nama) = 'X Bahasa 1'
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
where k.tingkat = 10
  and trim(k.nama) = 'X Bahasa 1'
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
where k.tingkat = 10
  and trim(k.nama) = 'X Bahasa 1'
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

-- Cek:
--   select k.nama, count(*) from students s
--   join kelas k on k.id = s.kelas_id
--   where k.tingkat = 10 and trim(k.nama) = 'X Bahasa 1'
--   group by k.nama;
