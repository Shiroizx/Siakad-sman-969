-- =============================================================================
-- Dummy akademik + kedisiplinan + bahan agregasi EWS untuk siswa KELAS 11 saja,
-- semua jurusan mapel (Bahasa, MIPA, IPS): semua rombel tingkat 11 yang
-- kelas.jurusan in ('bahasa','mipa','ips').
--
-- Menghapus dulu (tahun ajaran AKTIF saja) nilai, absensi, dan pelanggaran untuk
-- subset siswa tersebut, lalu mengisi ulang — agar skrip bisa dijalankan "lagi"
-- dengan angka & pola beda dari seed_kelas11_akademik_kedisiplinan_ews.sql.
--
-- Prasyarat:
--   migration_academic_years_archive.sql, migration_subjects_akademik_kedisiplinan.sql
--   migration_violation_academic_year.sql, add_hadir_attendance.sql
--   Satu baris academic_years is_active = true
--
-- Catatan: siswa harus sudah punya kelas_id ke rombel XI (Bahasa/MIPA/IPS).
-- =============================================================================

begin;

with ay as (
  select id as ay_id
  from public.academic_years
  where is_active = true
  order by created_at desc
  limit 1
),
s11_mapel as (
  select s.id
  from public.students s
  join public.kelas k on k.id = s.kelas_id
  where k.tingkat = 11
    and k.jurusan in ('bahasa', 'mipa', 'ips')
)
delete from public.academic_records ar
using ay, s11_mapel m
where ar.student_id = m.id
  and ar.academic_year_id = ay.ay_id;

with ay as (
  select id as ay_id
  from public.academic_years
  where is_active = true
  order by created_at desc
  limit 1
),
s11_mapel as (
  select s.id
  from public.students s
  join public.kelas k on k.id = s.kelas_id
  where k.tingkat = 11
    and k.jurusan in ('bahasa', 'mipa', 'ips')
)
delete from public.attendance_records a
using ay, s11_mapel m
where a.student_id = m.id
  and a.academic_year_id = ay.ay_id;

with ay as (
  select id as ay_id
  from public.academic_years
  where is_active = true
  order by created_at desc
  limit 1
),
s11_mapel as (
  select s.id
  from public.students s
  join public.kelas k on k.id = s.kelas_id
  where k.tingkat = 11
    and k.jurusan in ('bahasa', 'mipa', 'ips')
)
delete from public.violation_records v
using ay, s11_mapel m
where v.student_id = m.id
  and v.academic_year_id = ay.ay_id;

-- --- Akademik: mapel tingkat 11, S1 & S2 ---------------------------------------
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
    when (hashtext(s.id::text || 'xi11a')::bigint + hashtext(sub.id::text)::bigint + v.sem * 13) % 23 = 0
      then 59::numeric
    when (hashtext(s.id::text || 'xi11b')::bigint + hashtext(sub.id::text)::bigint + v.sem * 9) % 17 = 0
      then 67::numeric
    when (hashtext(s.id::text || 'xi11c')::bigint + v.sem * 4) % 19 = 0
      then 73::numeric
    else (71 + (abs(hashtext(s.id::text || sub.id::text || v.sem::text || 'kelas11')::bigint) % 25))::numeric
  end,
  (select ay_id from ay)
from public.students s
join public.kelas k on k.id = s.kelas_id
join public.subjects sub on sub.tingkat_kelas = k.tingkat
cross join (values (1), (2)) as v(sem)
where k.tingkat = 11
  and k.jurusan in ('bahasa', 'mipa', 'ips')
  and exists (select 1 from ay);

-- --- Absensi S1 & S2 ----------------------------------------------------------
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
  108 + (abs(hashtext(s.id::text || v.sem::text || 'xi11att')::bigint) % 46),
  case
    when (abs(hashtext(s.id::text || v.sem::text || 'xi11al')::bigint) % 13) = 0 then 19
    when (abs(hashtext(s.id::text || v.sem::text || 'xi11al')::bigint) % 8) = 0 then 11
    else 1 + (abs(hashtext(s.id::text || v.sem::text || 'xi11al')::bigint) % 10)
  end,
  (abs(hashtext(s.id::text || 'xiiz' || v.sem::text)::bigint) % 6),
  (abs(hashtext(s.id::text || 'xisk' || v.sem::text)::bigint) % 5)
from public.students s
join public.kelas k on k.id = s.kelas_id
cross join (values (1), (2)) as v(sem)
where k.tingkat = 11
  and k.jurusan in ('bahasa', 'mipa', 'ips')
  and exists (select 1 from ay);

-- --- Pelanggaran (subset, variasi EWS) ----------------------------------------
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
  14,
  'XI: Atribut tidak lengkap saat apel'
from public.students s
join public.kelas k on k.id = s.kelas_id
where k.tingkat = 11
  and k.jurusan in ('bahasa', 'mipa', 'ips')
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'xi_v1')::bigint) % 5) in (0, 2);

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
  9,
  'XI: Terlambat masuk pembelajaran'
from public.students s
join public.kelas k on k.id = s.kelas_id
where k.tingkat = 11
  and k.jurusan in ('bahasa', 'mipa', 'ips')
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'xi_v2')::bigint) % 7) in (0, 2, 5);

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
  22,
  'XI: Tidak mengikuti tugas kelompok'
from public.students s
join public.kelas k on k.id = s.kelas_id
where k.tingkat = 11
  and k.jurusan in ('bahasa', 'mipa', 'ips')
  and exists (select 1 from ay)
  and (abs(hashtext(s.id::text || 'xi_v3')::bigint) % 19) = 6;

commit;

-- Verifikasi:
--   select k.jurusan, k.nama, count(distinct s.id) as jumlah_siswa
--   from students s
--   join kelas k on k.id = s.kelas_id
--   where k.tingkat = 11 and k.jurusan in ('bahasa','mipa','ips')
--   group by k.jurusan, k.nama
--   order by k.jurusan, k.nama;
--   select count(*) from academic_records ar
--     join students s on s.id = ar.student_id
--     join kelas k on k.id = s.kelas_id
--     where k.tingkat = 11 and k.jurusan in ('bahasa','mipa','ips');
