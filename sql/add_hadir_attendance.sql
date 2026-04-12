-- Tambah kolom kehadiran (jika migrasi utama sudah dijalankan tanpa kolom ini).
-- Jalankan sekali di Supabase SQL Editor.

alter table public.attendance_records
  add column if not exists hadir integer not null default 0 check (hadir >= 0);

comment on column public.attendance_records.hadir is 'Jumlah pertemuan hadir / kehadiran (kumulatif)';
