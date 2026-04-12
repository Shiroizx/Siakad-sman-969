-- =============================================================================
-- Ekspansi tabel students + Row Level Security (RLS)
-- Jalankan sekali di Supabase SQL Editor (atau pecah per blok jika error).
-- =============================================================================

-- --- Kolom baru (nullable agar data lama aman) --------------------------------
alter table public.students
  add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table public.students
  add column if not exists nik text,
  add column if not exists tempat_lahir text,
  add column if not exists agama text,
  add column if not exists alamat text,
  add column if not exists no_hp text,
  add column if not exists email text,
  add column if not exists nama_ayah text,
  add column if not exists pekerjaan_ayah text,
  add column if not exists nama_ibu text,
  add column if not exists pekerjaan_ibu text,
  add column if not exists no_hp_ortu text;

-- tanggal_lahir mungkin sudah ada dari migrasi login siswa
alter table public.students
  add column if not exists tanggal_lahir date;

comment on column public.students.user_id is 'Relasi ke auth.users — dipakai RLS portal siswa';

-- Satu akun auth paling banyak satu baris siswa (opsional, aman untuk RLS)
create unique index if not exists students_user_id_unique
  on public.students (user_id)
  where user_id is not null;

-- --- Fungsi bantu: deteksi JWT portal siswa (selaras lib/auth/siswa.ts) -----
create or replace function public.jwt_is_siswa()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce((auth.jwt()->'user_metadata'->>'role'), '') = 'siswa'
    or coalesce((auth.jwt()->>'email'), '') ilike '%@siswa.sman969.sch.id';
$$;

-- --- RLS ---------------------------------------------------------------------
alter table public.students enable row level security;

-- Hapus kebijakan lama bila skrip diulang
drop policy if exists "students_admin_all" on public.students;
drop policy if exists "students_siswa_select_own" on public.students;
drop policy if exists "students_siswa_update_own" on public.students;

-- Admin / staf (bukan portal siswa): CRUD penuh
create policy "students_admin_all"
  on public.students
  for all
  to authenticated
  using (not public.jwt_is_siswa())
  with check (not public.jwt_is_siswa());

-- Siswa: baca baris sendiri (user_id = uid ATAU id dari metadata saat user_id belum disinkron)
create policy "students_siswa_select_own"
  on public.students
  for select
  to authenticated
  using (
    public.jwt_is_siswa()
    and (
      user_id = auth.uid()
      or id::text = coalesce(auth.jwt()->'user_metadata'->>'student_id', '')
    )
  );

-- Siswa: update baris sendiri saja
create policy "students_siswa_update_own"
  on public.students
  for update
  to authenticated
  using (
    public.jwt_is_siswa()
    and (
      user_id = auth.uid()
      or id::text = coalesce(auth.jwt()->'user_metadata'->>'student_id', '')
    )
  )
  with check (
    public.jwt_is_siswa()
    and (
      user_id = auth.uid()
      or (
        user_id is null
        and id::text = coalesce(auth.jwt()->'user_metadata'->>'student_id', '')
      )
    )
  );

-- Catatan: pastikan peran `authenticated` memiliki GRANT SELECT/INSERT/UPDATE/DELETE
-- pada `public.students` (default proyek Supabase biasanya sudah).
