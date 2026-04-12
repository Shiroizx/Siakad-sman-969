-- =============================================================================
-- Tahun ajaran, riwayat kelas (arsip), FK academic_year pada nilai & absensi
-- Jalankan sekali di Supabase SQL Editor setelah migrasi subjects/akademik.
-- =============================================================================

-- --- 1) academic_years -------------------------------------------------------
create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists academic_years_active_idx
  on public.academic_years (is_active)
  where is_active;

comment on table public.academic_years is 'Master tahun ajaran (contoh: 2025/2026 Ganjil).';

insert into public.academic_years (nama, is_active)
select 'Arsip / Migrasi (default)', true
where not exists (select 1 from public.academic_years limit 1);

-- --- 2) class_histories (riwayat penempatan / kenaikan) ----------------------
create table if not exists public.class_histories (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  kelas_id uuid not null references public.kelas (id) on delete restrict,
  academic_year_id uuid not null references public.academic_years (id) on delete restrict,
  status text not null
    check (status in ('naik_kelas', 'tinggal_kelas', 'lulus')),
  created_at timestamptz not null default now()
);

create index if not exists class_histories_student_idx
  on public.class_histories (student_id);

create index if not exists class_histories_year_idx
  on public.class_histories (academic_year_id);

comment on table public.class_histories is 'Jejak penempatan kelas per tahun ajaran.';
comment on column public.class_histories.status is 'naik_kelas | tinggal_kelas | lulus';

-- --- 3) academic_records.academic_year_id -----------------------------------
alter table public.academic_records
  add column if not exists academic_year_id uuid references public.academic_years (id) on delete restrict;

update public.academic_records ar
set academic_year_id = y.id
from (
  select id from public.academic_years order by created_at asc limit 1
) y
where ar.academic_year_id is null;

delete from public.academic_records a
using public.academic_records b
where a.student_id = b.student_id
  and a.subject_id is not distinct from b.subject_id
  and a.semester = b.semester
  and a.academic_year_id = b.academic_year_id
  and a.ctid < b.ctid
  and a.subject_id is not null;

drop index if exists academic_records_student_subject_semester_uq;

create unique index if not exists academic_records_student_subject_semester_year_uq
  on public.academic_records (student_id, subject_id, semester, academic_year_id)
  where subject_id is not null;

alter table public.academic_records
  alter column academic_year_id set not null;

-- --- 4) attendance_records.academic_year_id ---------------------------------
alter table public.attendance_records
  add column if not exists academic_year_id uuid references public.academic_years (id) on delete restrict;

update public.attendance_records ar
set academic_year_id = y.id
from (
  select id from public.academic_years order by created_at asc limit 1
) y
where ar.academic_year_id is null;

delete from public.attendance_records a
using public.attendance_records b
where a.student_id = b.student_id
  and a.semester = b.semester
  and a.academic_year_id = b.academic_year_id
  and a.ctid < b.ctid;

drop index if exists attendance_records_student_semester_uq;

create unique index if not exists attendance_records_student_semester_year_uq
  on public.attendance_records (student_id, semester, academic_year_id);

alter table public.attendance_records
  alter column academic_year_id set not null;

comment on column public.attendance_records.academic_year_id is 'Tahun ajaran berlaku untuk rekap absensi per semester.';

-- --- 5) RLS academic_years & class_histories ---------------------------------
alter table public.academic_years enable row level security;

drop policy if exists "academic_years_select_auth" on public.academic_years;
create policy "academic_years_select_auth"
  on public.academic_years for select to authenticated
  using (true);

drop policy if exists "academic_years_admin_all" on public.academic_years;
create policy "academic_years_admin_all"
  on public.academic_years for all to authenticated
  using (not public.jwt_is_siswa())
  with check (not public.jwt_is_siswa());

alter table public.class_histories enable row level security;

drop policy if exists "class_histories_admin_all" on public.class_histories;
create policy "class_histories_admin_all"
  on public.class_histories for all to authenticated
  using (not public.jwt_is_siswa())
  with check (not public.jwt_is_siswa());

drop policy if exists "class_histories_siswa_select_own" on public.class_histories;
create policy "class_histories_siswa_select_own"
  on public.class_histories for select to authenticated
  using (
    public.jwt_is_siswa()
    and student_id in (
      select s.id from public.students s
      where s.user_id = auth.uid()
         or s.id::text = coalesce(auth.jwt()->'user_metadata'->>'student_id', '')
    )
  );
