-- =============================================================================
-- Jejak kelas asal saat kenaikan (supaya arsip bisa menampilkan "dari kelas apa").
-- Jalankan sekali di Supabase SQL Editor setelah migration_academic_years_archive.sql.
-- =============================================================================

alter table public.class_histories
  add column if not exists kelas_asal_id uuid references public.kelas (id) on delete set null;

comment on column public.class_histories.kelas_asal_id is
  'Kelas siswa sebelum pindah/naik/lulus (diisi dari admin kenaikan kelas).';
