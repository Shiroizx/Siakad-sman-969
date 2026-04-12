-- =============================================================================
-- Dummy data menyeluruh (dev / demo): siswa, nilai, absensi, pelanggaran,
-- riwayat kelas, tahun ajaran kedua untuk arsip — mendukung fitur:
--   akademik, kedisiplinan, EWS, arsip, clustering, peminatan, kenaikan kelas
--
-- Prasyarat (urut umum proyek):
--   expand_students_and_rls.sql, migration_subjects_akademik_kedisiplinan.sql,
--   migration_academic_years_archive.sql, migration_kelas_jurusan_rombel.sql,
--   semester_absensi_pelanggaran.sql, migration_violation_academic_year.sql,
--   add_hadir_attendance.sql, add_tanggal_lahir_students.sql
--
-- Catatan: skrip ini memperbaiki unik absensi lama (hanya student_id) agar
-- mendukung satu baris per semester per tahun ajaran — sama seperti migrasi resmi.
--
-- Siswa dummy memakai NISN 9009690000–9009699999 (10 digit). Skrip ini
-- MENGHAPUS bundel tersebut lalu mengisi ulang (idempoten aman untuk rentang ini).
--
-- Target: minimal 15 siswa per kelas (X/XI/XII × Bahasa/MIPA/IPS × rombel 1–5),
-- tanpa melampaui kelas.kapasitas_max (trigger kapasitas).
-- =============================================================================

begin;

-- --- 0a) Pastikan ada tahun ajaran aktif (satu) -------------------------------
update public.academic_years y
set is_active = true
where y.id = (
    select id from public.academic_years order by created_at desc limit 1
  )
  and not exists (select 1 from public.academic_years y2 where y2.is_active = true);

do $$
declare
  n_active int;
  keep_id uuid;
begin
  select count(*)::int into n_active from public.academic_years where is_active;
  if n_active > 1 then
    select id into keep_id
    from public.academic_years
    where is_active
    order by created_at desc
    limit 1;
    if keep_id is not null then
      update public.academic_years
      set is_active = false
      where is_active and id <> keep_id;
    end if;
  end if;
end $$;

-- --- 0b) Tahun ajaran arsip demo (non-aktif) ----------------------------------
insert into public.academic_years (nama, is_active)
select '2023/2024 (dummy arsip)', false
where not exists (
  select 1 from public.academic_years y where y.nama = '2023/2024 (dummy arsip)'
);

insert into public.academic_years (nama, is_active)
select 'Arsip / Migrasi (default)', true
where not exists (select 1 from public.academic_years where is_active = true);

-- --- 1) Hapus bundel dummy lama (NISN 900969xxxx) -----------------------------
delete from public.violation_records v
using public.students s
where v.student_id = s.id
  and s.nisn ~ '^900969[0-9]{4}$';

delete from public.attendance_records a
using public.students s
where a.student_id = s.id
  and s.nisn ~ '^900969[0-9]{4}$';

delete from public.academic_records ar
using public.students s
where ar.student_id = s.id
  and s.nisn ~ '^900969[0-9]{4}$';

delete from public.class_histories ch
using public.students s
where ch.student_id = s.id
  and s.nisn ~ '^900969[0-9]{4}$';

delete from public.students s
where s.nisn ~ '^900969[0-9]{4}$';

-- --- 2) Siswa: isi per kelas hingga min(15, sisa slot kapasitas) -------------
with active_year as (
  select id as ay_id
  from public.academic_years
  where is_active = true
  order by created_at desc
  limit 1
),
kelas_need as (
  select
    k.id as kelas_id,
    k.tingkat,
    k.nama as kelas_nama,
    (
      select count(*)::int
      from public.students s2
      where s2.kelas_id = k.id
    ) as cnt,
    k.kapasitas_max as cap
  from public.kelas k
  where k.jurusan in ('bahasa', 'mipa', 'ips')
    and k.rombel is not null
),
kelas_slots as (
  select
    kn.kelas_id,
    kn.tingkat,
    kn.kelas_nama,
    least(
      greatest(0, 15 - kn.cnt),
      greatest(0, kn.cap - kn.cnt)
    ) as need
  from kelas_need kn
),
expanded as (
  select ks.kelas_id, ks.tingkat, g.n as slot
  from kelas_slots ks
  cross join lateral generate_series(1, ks.need) as g(n)
  where ks.need > 0
),
numbered as (
  select
    e.kelas_id,
    e.tingkat,
    e.slot,
    row_number() over (order by e.kelas_id, e.slot) as rn
  from expanded e
)
insert into public.students (
  nisn,
  nama,
  jenis_kelamin,
  kelas_id,
  tanggal_lahir
)
select
  lpad((9009690000 + n.rn)::bigint::text, 10, '0'),
  'Dummy ' || left(k.nama, 18) || ' #' || n.slot::text,
  case
    when n.rn % 2 = 0 then 'P'::public.jenis_kelamin
    else 'L'::public.jenis_kelamin
  end,
  n.kelas_id,
  (date '2006-06-01' + ((n.rn % 600)::integer))::date
from numbered n
join public.kelas k on k.id = n.kelas_id;

-- --- 3) Nilai (tahun aktif): semua mapel sesuai tingkat, S1 + S2 -------------
with ay as (
  select id from public.academic_years where is_active = true order by created_at desc limit 1
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
  (select id from ay)
from public.students s
join public.kelas k on k.id = s.kelas_id
join public.subjects sub on sub.tingkat_kelas = k.tingkat
cross join (values (1), (2)) as v(sem)
where s.nisn ~ '^900969[0-9]{4}$'
  and not exists (
    select 1
    from public.academic_records x
    where x.student_id = s.id
      and x.subject_id = sub.id
      and x.semester = v.sem
      and x.academic_year_id = (select id from ay)
  );

-- --- 4) Nilai ringan di tahun arsip demo (agar halaman arsip multi-tahun) -----
with old_y as (
  select id as oy_id
  from public.academic_years
  where nama = '2023/2024 (dummy arsip)'
  limit 1
),
first_sub as (
  select distinct on (tingkat_kelas) id as sid, tingkat_kelas
  from public.subjects
  order by tingkat_kelas, nama_mapel
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
  fs.sid,
  1,
  (68 + (abs(hashtext(s.id::text)::bigint) % 25))::numeric,
  (select oy_id from old_y)
from public.students s
join public.kelas k on k.id = s.kelas_id
join first_sub fs on fs.tingkat_kelas = k.tingkat
where s.nisn ~ '^900969[0-9]{4}$'
  and not exists (
    select 1
    from public.academic_records x
    where x.student_id = s.id
      and x.subject_id = fs.sid
      and x.semester = 1
      and x.academic_year_id = (select oy_id from old_y)
  );

-- --- 4b) Unik absensi: dari skema lama (satu baris / siswa) ke (siswa, sem, tahun) --
-- Error 23505 pada attendance_records_student_id_key = constraint lama.
alter table public.attendance_records
  drop constraint if exists attendance_records_student_id_key;

drop index if exists attendance_records_student_id_key;
drop index if exists attendance_records_student_id_uq;

create unique index if not exists attendance_records_student_semester_year_uq
  on public.attendance_records (student_id, semester, academic_year_id);

-- --- 5) Absensi tahun aktif (S1 & S2) -----------------------------------------
with ay as (
  select id from public.academic_years where is_active = true order by created_at desc limit 1
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
  (select id from ay),
  100 + (abs(hashtext(s.id::text)::bigint) % 50),
  case
    when (abs(hashtext(s.id::text)::bigint) % 23) = 0 then 18
    else (abs(hashtext(s.id::text)::bigint) % 8)
  end,
  (abs(hashtext(s.id::text || 'i')::bigint) % 4),
  (abs(hashtext(s.id::text || 's')::bigint) % 3)
from public.students s
cross join (values (1), (2)) as v(sem)
where s.nisn ~ '^900969[0-9]{4}$'
  and not exists (
    select 1
    from public.attendance_records a
    where a.student_id = s.id
      and a.semester = v.sem
      and a.academic_year_id = (select id from ay)
  );

-- --- 6) Pelanggaran (subset, tahun aktif) -------------------------------------
with ay as (
  select id from public.academic_years where is_active = true order by created_at desc limit 1
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
  (select id from ay),
  10,
  'Tidak memakai atribut lengkap (dummy seed)'
from public.students s
where s.nisn ~ '^900969[0-9]{4}$'
  and (abs(hashtext(s.id::text)::bigint) % 4) = 0;

with ay as (
  select id from public.academic_years where is_active = true order by created_at desc limit 1
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
  (select id from ay),
  5,
  'Terlambat masuk sekolah (dummy seed)'
from public.students s
where s.nisn ~ '^900969[0-9]{4}$'
  and (abs(hashtext(s.id::text)::bigint) % 5) in (1, 2);

-- --- 7) Riwayat kelas tahun aktif + tahun arsip demo --------------------------
with ay as (
  select id from public.academic_years where is_active = true order by created_at desc limit 1
)
insert into public.class_histories (
  student_id,
  kelas_id,
  academic_year_id,
  status
)
select s.id, s.kelas_id, (select id from ay), 'naik_kelas'
from public.students s
where s.nisn ~ '^900969[0-9]{4}$'
  and not exists (
    select 1
    from public.class_histories ch
    where ch.student_id = s.id
      and ch.academic_year_id = (select id from ay)
  );

with old_y as (
  select id from public.academic_years where nama = '2023/2024 (dummy arsip)' limit 1
)
insert into public.class_histories (
  student_id,
  kelas_id,
  academic_year_id,
  status
)
select s.id, s.kelas_id, (select id from old_y), 'tinggal_kelas'
from public.students s
where s.nisn ~ '^900969[0-9]{4}$'
  and not exists (
    select 1
    from public.class_histories ch
    where ch.student_id = s.id
      and ch.academic_year_id = (select id from old_y)
  );

-- --- 8) Profil siswa (kolom opsional portal) ----------------------------------
-- hashtext → int4: abs(hashtext(x)) bisa error jika x = -2147483648 (overflow).
-- Pakai abs(hashtext(x)::bigint) di seluruh skrip.
-- nik / no_hp / no_hp_ortu: angka sintetis < 2^31 agar aman jika kolom bertipe integer
update public.students s
set
  nik = coalesce(
    nullif(trim(s.nik), ''),
    lpad(
      (1000000000 + (abs(hashtext(coalesce(s.id::text, ''))::bigint) % 1147483647))::text,
      16,
      '0'
    )
  ),
  tempat_lahir = coalesce(nullif(trim(s.tempat_lahir), ''), 'Jakarta'),
  agama = coalesce(nullif(trim(s.agama), ''), 'Islam'),
  alamat = coalesce(
    nullif(trim(s.alamat), ''),
    'Alamat dummy seed NISN ' || s.nisn
  ),
  no_hp = coalesce(
    nullif(trim(s.no_hp), ''),
    '08' || lpad((abs(hashtext(s.id::text || 'h')::bigint) % 100000000)::text, 8, '0')
  ),
  email = coalesce(
    nullif(trim(lower(s.email)), ''),
    'dummy.' || regexp_replace(s.nisn, '\D', '', 'g') || '@seed.sman969.test'
  ),
  nama_ayah = coalesce(nullif(trim(s.nama_ayah), ''), 'Ayah ' || left(s.nama, 30)),
  pekerjaan_ayah = coalesce(nullif(trim(s.pekerjaan_ayah), ''), 'Karyawan'),
  nama_ibu = coalesce(nullif(trim(s.nama_ibu), ''), 'Ibu ' || left(s.nama, 30)),
  pekerjaan_ibu = coalesce(nullif(trim(s.pekerjaan_ibu), ''), 'Ibu Rumah Tangga'),
  no_hp_ortu = coalesce(
    nullif(trim(s.no_hp_ortu), ''),
    '08' || lpad((abs(hashtext(s.id::text || 'o')::bigint) % 100000000)::text, 8, '0')
  )
where s.nisn ~ '^900969[0-9]{4}$';

commit;

-- =============================================================================
-- Setelah commit: cek ringkas
--   select k.nama, count(*) from students s join kelas k on k.id = s.kelas_id
--   where k.jurusan in ('bahasa','mipa','ips') and k.rombel is not null
--   group by k.nama order by k.nama;
--
-- Login siswa: buat user Supabase Auth terpisah; NISN di atas hanya data tabel.
-- =============================================================================
