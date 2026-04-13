-- =============================================================================
-- Tabel Konfigurasi EWS
-- Tabel ini digunakan untuk menyimpan pengaturan batas alpa, nilai merah, dan 
-- pelanggaran secara global sehingga pengaturan tidak hilang saat sesi browser
-- berakhir. Tabel ini dibatasi maksimal 1 baris.
-- =============================================================================

begin;

create table if not exists public.ews_settings (
  id integer primary key default 1 check (id = 1),
  batas_alpa integer not null default 5,
  batas_nilai_merah integer not null default 2,
  batas_pelanggaran integer not null default 50,
  updated_at timestamp with time zone default now()
);

-- Inisialisasi baris pertama (jika belum ada)
insert into public.ews_settings (id, batas_alpa, batas_nilai_merah, batas_pelanggaran)
values (1, 5, 2, 50)
on conflict (id) do nothing;

-- Fungsi trigger auto update updated_at mirip dengan yang lain
create or replace function public.trg_ews_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_ews_settings_updated_at on public.ews_settings;
create trigger set_ews_settings_updated_at
  before update on public.ews_settings
  for each row
  execute function public.trg_ews_settings_updated_at();

-- Berikan akses baca bagi admin (semua authenticated user di sistem backend, 
-- perlindungan akses EWS ditangani via middleware / supabase auth action)
grant select, update on public.ews_settings to authenticated;

commit;
