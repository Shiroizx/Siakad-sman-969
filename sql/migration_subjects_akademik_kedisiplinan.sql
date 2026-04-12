-- =============================================================================
-- TAHAP 10: subjects, migrasi academic_records, absensi/pelanggaran, RLS
-- Jalankan di Supabase SQL Editor (satu kali, atau sesuaikan jika sebagian sudah dijalankan).
-- Prasyarat: public.jwt_is_siswa() — dari expand_students_and_rls.sql
--
-- Catatan: portal siswa membaca tabel public.kelas (tingkat). Jika kelas punya
-- RLS yang memblokir SELECT untuk siswa, tambahkan kebijakan baca sesuai kebutuhan.
-- =============================================================================

-- --- 1) Tabel subjects -------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  nama_mapel text not null,
  tingkat_kelas integer not null check (tingkat_kelas in (10, 11, 12)),
  kkm numeric(5,2) not null default 75,
  unique (nama_mapel, tingkat_kelas)
);

create index if not exists subjects_tingkat_idx on public.subjects (tingkat_kelas);

-- --- 2) Seed mapel (idempoten) ----------------------------------------------
insert into public.subjects (nama_mapel, tingkat_kelas, kkm) values
  ('Pendidikan Agama dan Budi Pekerti', 10, 75),
  ('PPKn', 10, 75),
  ('Bahasa Indonesia', 10, 75),
  ('Matematika', 10, 75),
  ('Sejarah', 10, 75),
  ('Bahasa Inggris', 10, 75),
  ('Seni Budaya', 10, 75),
  ('Pendidikan Jasmani Olahraga dan Kesehatan', 10, 75),
  ('Prakarya', 10, 75),
  ('Fisika', 10, 75),
  ('Kimia', 10, 75),
  ('Biologi', 10, 75),
  ('Ekonomi', 10, 75),
  ('Sosiologi', 10, 75),
  ('Geografi', 10, 75)
on conflict (nama_mapel, tingkat_kelas) do update set kkm = excluded.kkm;

insert into public.subjects (nama_mapel, tingkat_kelas, kkm) values
  ('Pendidikan Agama dan Budi Pekerti', 11, 75),
  ('PPKn', 11, 75),
  ('Bahasa Indonesia', 11, 75),
  ('Matematika', 11, 75),
  ('Bahasa Inggris', 11, 75),
  ('Sejarah', 11, 75),
  ('Fisika', 11, 75),
  ('Kimia', 11, 75),
  ('Biologi', 11, 75),
  ('Matematika Peminatan', 11, 78),
  ('Ekonomi', 11, 75),
  ('Sosiologi', 11, 75),
  ('Geografi', 11, 75)
on conflict (nama_mapel, tingkat_kelas) do update set kkm = excluded.kkm;

insert into public.subjects (nama_mapel, tingkat_kelas, kkm) values
  ('Pendidikan Agama dan Budi Pekerti', 12, 75),
  ('PPKn', 12, 75),
  ('Bahasa Indonesia', 12, 75),
  ('Matematika', 12, 75),
  ('Bahasa Inggris', 12, 75),
  ('Sejarah Indonesia', 12, 75),
  ('Ekonomi', 12, 75),
  ('Sosiologi', 12, 75),
  ('Geografi', 12, 75),
  ('Antropologi', 12, 75),
  ('Akuntansi Dasar', 12, 75),
  ('Kewirausahaan', 12, 75),
  ('Bahasa Jawa', 12, 75)
on conflict (nama_mapel, tingkat_kelas) do update set kkm = excluded.kkm;

-- --- 3) Tingkat kelas --------------------------------------------------------
alter table public.kelas
  add column if not exists tingkat integer check (tingkat is null or tingkat between 10 and 12);

update public.kelas k
set tingkat = case
  when upper(coalesce(k.nama, '')) like '%XII%' then 12
  when upper(coalesce(k.nama, '')) like '%XI%' and upper(k.nama) not like '%XII%' then 11
  when upper(coalesce(k.nama, '')) like '%X %' or upper(k.nama) ~ '[^I]X$' then 10
  else coalesce(k.tingkat, 10)
end
where k.tingkat is null;

update public.kelas set tingkat = 10 where tingkat is null;

-- --- 4) academic_records -----------------------------------------------------
alter table public.academic_records
  add column if not exists subject_id uuid references public.subjects (id) on delete restrict;

alter table public.academic_records
  add column if not exists semester integer not null default 1 check (semester in (1, 2));

-- Backfill dari kolom mapel (jika masih ada)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'academic_records' and column_name = 'mapel'
  ) then
    -- Di PostgreSQL, alias baris yang di-UPDATE (ar) tidak boleh dipakai di ON JOIN
    -- dalam FROM; hubungkan lewat WHERE.
    update public.academic_records ar
    set subject_id = sub.id
    from public.subjects sub,
         public.students st,
         public.kelas kl
    where ar.student_id = st.id
      and st.kelas_id = kl.id
      and ar.subject_id is null
      and ar.mapel is not null
      and trim(ar.mapel) <> ''
      and lower(regexp_replace(trim(sub.nama_mapel), '\s+', ' ', 'g'))
          = lower(regexp_replace(trim(ar.mapel), '\s+', ' ', 'g'))
      and sub.tingkat_kelas = kl.tingkat;
  end if;
end $$;

-- Hapus duplikat (student_id, subject_id, semester)
delete from public.academic_records a
using public.academic_records b
where a.student_id = b.student_id
  and a.subject_id is not distinct from b.subject_id
  and a.semester = b.semester
  and a.ctid < b.ctid
  and a.subject_id is not null;

create unique index if not exists academic_records_student_subject_semester_uq
  on public.academic_records (student_id, subject_id, semester)
  where subject_id is not null;

alter table public.academic_records drop column if exists mapel;

-- --- 5) attendance_records ---------------------------------------------------
alter table public.attendance_records
  add column if not exists izin integer not null default 0 check (izin >= 0);

alter table public.attendance_records
  add column if not exists sakit integer not null default 0 check (sakit >= 0);

alter table public.attendance_records
  add column if not exists hadir integer not null default 0 check (hadir >= 0);

comment on column public.attendance_records.hadir is 'Jumlah pertemuan hadir / kehadiran (kumulatif)';

alter table public.attendance_records
  add column if not exists semester integer not null default 1 check (semester in (1, 2));

delete from public.attendance_records a
using public.attendance_records b
where a.student_id = b.student_id
  and a.semester = b.semester
  and a.ctid < b.ctid;

drop index if exists attendance_records_student_id_uq;

create unique index if not exists attendance_records_student_semester_uq
  on public.attendance_records (student_id, semester);

comment on column public.attendance_records.semester is 'Semester akademik: 1 atau 2';

-- --- 6) violation_records ----------------------------------------------------
alter table public.violation_records
  add column if not exists deskripsi text not null default '';

alter table public.violation_records
  add column if not exists created_at timestamptz not null default now();

alter table public.violation_records
  add column if not exists semester integer not null default 1 check (semester in (1, 2));

comment on column public.violation_records.semester is 'Semester akademik saat pelanggaran dicatat';

create index if not exists violation_records_student_semester_idx
  on public.violation_records (student_id, semester);

-- --- 7) RLS (butuh jwt_is_siswa) ---------------------------------------------
alter table public.subjects enable row level security;

drop policy if exists "subjects_admin_all" on public.subjects;
create policy "subjects_admin_all"
  on public.subjects for all to authenticated
  using (not public.jwt_is_siswa())
  with check (not public.jwt_is_siswa());

drop policy if exists "subjects_siswa_select" on public.subjects;
create policy "subjects_siswa_select"
  on public.subjects for select to authenticated
  using (public.jwt_is_siswa());

alter table public.academic_records enable row level security;

drop policy if exists "academic_admin_all" on public.academic_records;
create policy "academic_admin_all"
  on public.academic_records for all to authenticated
  using (not public.jwt_is_siswa())
  with check (not public.jwt_is_siswa());

drop policy if exists "academic_siswa_select_own" on public.academic_records;
create policy "academic_siswa_select_own"
  on public.academic_records for select to authenticated
  using (
    public.jwt_is_siswa()
    and student_id in (
      select s.id from public.students s
      where s.user_id = auth.uid()
         or s.id::text = coalesce(auth.jwt()->'user_metadata'->>'student_id', '')
    )
  );

alter table public.attendance_records enable row level security;

drop policy if exists "attendance_admin_all" on public.attendance_records;
create policy "attendance_admin_all"
  on public.attendance_records for all to authenticated
  using (not public.jwt_is_siswa())
  with check (not public.jwt_is_siswa());

drop policy if exists "attendance_siswa_select_own" on public.attendance_records;
create policy "attendance_siswa_select_own"
  on public.attendance_records for select to authenticated
  using (
    public.jwt_is_siswa()
    and student_id in (
      select s.id from public.students s
      where s.user_id = auth.uid()
         or s.id::text = coalesce(auth.jwt()->'user_metadata'->>'student_id', '')
    )
  );

alter table public.violation_records enable row level security;

drop policy if exists "violation_admin_all" on public.violation_records;
create policy "violation_admin_all"
  on public.violation_records for all to authenticated
  using (not public.jwt_is_siswa())
  with check (not public.jwt_is_siswa());

drop policy if exists "violation_siswa_select_own" on public.violation_records;
create policy "violation_siswa_select_own"
  on public.violation_records for select to authenticated
  using (
    public.jwt_is_siswa()
    and student_id in (
      select s.id from public.students s
      where s.user_id = auth.uid()
         or s.id::text = coalesce(auth.jwt()->'user_metadata'->>'student_id', '')
    )
  );
