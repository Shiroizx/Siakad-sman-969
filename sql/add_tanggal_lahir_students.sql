-- Jalankan di Supabase SQL Editor (sekali).
-- Kolom tanggal_lahir dipakai untuk login siswa (password = YYYY-MM-DD).

alter table public.students
  add column if not exists tanggal_lahir date;

-- Contoh: sesuaikan tanggal dengan data riil / rapor
update public.students set tanggal_lahir = '2007-06-12' where nisn = '0012345678';
update public.students set tanggal_lahir = '2007-03-22' where nisn = '0012345679';
update public.students set tanggal_lahir = '2006-11-05' where nisn = '0012345680';
update public.students set tanggal_lahir = '2006-08-30' where nisn = '0012345681';
update public.students set tanggal_lahir = '2005-02-18' where nisn = '0012345682';
