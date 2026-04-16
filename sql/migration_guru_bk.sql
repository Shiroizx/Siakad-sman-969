-- =============================================================================
-- Migration: Guru BK — Catatan Konseling
-- Tabel baru untuk menyimpan catatan hasil konseling oleh Guru BK.
-- Jalankan sekali di Supabase SQL Editor.
-- =============================================================================

begin;

-- --- 1) Tabel catatan_konseling -----------------------------------------------
create table if not exists public.catatan_konseling (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  guru_bk_id uuid references auth.users(id) on delete set null,
  kategori text not null check (kategori in ('akademik', 'perilaku', 'pribadi', 'sosial', 'karir')),
  catatan text not null,
  tanggal date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catatan_konseling_student_idx on public.catatan_konseling (student_id);
create index if not exists catatan_konseling_guru_bk_idx on public.catatan_konseling (guru_bk_id);

comment on table public.catatan_konseling
  is 'Catatan hasil konseling oleh Guru BK terhadap siswa.';

-- --- 2) RLS -------------------------------------------------------------------
alter table public.catatan_konseling enable row level security;

-- Guru BK & Admin: CRUD penuh (non-siswa)
drop policy if exists "catatan_konseling_staff_all" on public.catatan_konseling;
create policy "catatan_konseling_staff_all"
  on public.catatan_konseling
  for all
  to authenticated
  using (not public.jwt_is_siswa())
  with check (not public.jwt_is_siswa());

-- Siswa: tidak boleh akses catatan konseling
-- (tidak perlu policy tambahan karena default deny)

-- --- 3) Grants ----------------------------------------------------------------
grant select, insert, update, delete on public.catatan_konseling to authenticated;

commit;
