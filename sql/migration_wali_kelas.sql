-- =============================================================================
-- Migration: Wali Kelas Role
-- Menambahkan kolom wali_kelas_user_id ke tabel kelas dan membuat view 
-- kelas_with_wali untuk tampilan admin.
-- Jalankan sekali di Supabase SQL Editor.
-- =============================================================================

begin;

-- --- 1) Kolom wali_kelas_user_id pada tabel kelas ---------------------------
alter table public.kelas
  add column if not exists wali_kelas_user_id uuid references auth.users(id) on delete set null;

comment on column public.kelas.wali_kelas_user_id
  is 'UUID akun Supabase Auth wali kelas yang bertanggung jawab atas kelas ini.';

-- --- 2) View kelas_with_wali_kelas untuk admin UI ---------------------------
-- Menampilkan kelas beserta nama email wali kelasnya (jika ada)
create or replace view public.kelas_with_wali_kelas as
select
  k.id,
  k.nama,
  k.tingkat,
  k.jurusan,
  k.rombel,
  k.kapasitas_max,
  k.wali_kelas_user_id,
  u.email as wali_kelas_email,
  u.raw_user_meta_data->>'full_name' as wali_kelas_nama,
  (
    select count(*)::integer
    from public.students s
    where s.kelas_id = k.id
  ) as jumlah_siswa
from public.kelas k
left join auth.users u on u.id = k.wali_kelas_user_id;

comment on view public.kelas_with_wali_kelas
  is 'Data kelas diperkaya dengan informasi wali kelas dan jumlah siswa.';

grant select on public.kelas_with_wali_kelas to authenticated;

-- --- 3) Update view kelas_with_siswa_count (tambah kolom wali_kelas) --------
drop view if exists public.kelas_with_siswa_count;
create or replace view public.kelas_with_siswa_count as
select
  k.id,
  k.nama,
  k.tingkat,
  k.jurusan,
  k.rombel,
  k.kapasitas_max,
  k.wali_kelas_user_id,
  (
    select count(*)::integer
    from public.students s
    where s.kelas_id = k.id
  ) as jumlah_siswa
from public.kelas k;

grant select on public.kelas_with_siswa_count to authenticated;

commit;
