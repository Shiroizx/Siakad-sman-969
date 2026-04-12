-- =============================================================================
-- Status alumni + angkatan kelulusan (untuk arsip alumni admin & kelulusan massal).
-- Jalankan sekali di Supabase SQL Editor.
-- =============================================================================

alter table public.students
  add column if not exists is_alumni boolean not null default false;

alter table public.students
  add column if not exists angkatan_lulus integer;

alter table public.students
  drop constraint if exists students_angkatan_lulus_range;

alter table public.students
  add constraint students_angkatan_lulus_range
  check (angkatan_lulus is null or (angkatan_lulus >= 1990 and angkatan_lulus <= 2100));

comment on column public.students.is_alumni is
  'True bila siswa sudah diluluskan (kelas_id dikosongkan; arsip kelulusan di tahun ajaran berprefiks Alumni).';

comment on column public.students.angkatan_lulus is
  'Tahun angkatan kelulusan (mis. 2026); dipakai filter Arsip alumni.';

create index if not exists students_alumni_angkatan_idx
  on public.students (angkatan_lulus)
  where is_alumni = true;
