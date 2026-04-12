-- =============================================================================
-- Master kelas: jurusan (Bahasa / MIPA / IPS), rombel, kapasitas maks 35 siswa
-- + seed minimal 5 rombel per tingkat (10–12) per jurusan (45 kelas baru)
-- + view ringkasan isi + trigger cegah melebihi kapasitas
-- Jalankan sekali di Supabase SQL Editor.
-- =============================================================================

-- --- 1) Kolom baru pada kelas -------------------------------------------------
alter table public.kelas
  add column if not exists jurusan text not null default 'lainnya'
    check (jurusan in ('lainnya', 'bahasa', 'mipa', 'ips'));

alter table public.kelas
  add column if not exists rombel smallint
    check (rombel is null or (rombel >= 1 and rombel <= 99));

alter table public.kelas
  add column if not exists kapasitas_max integer not null default 35
    check (kapasitas_max >= 1 and kapasitas_max <= 99);

comment on column public.kelas.jurusan is 'Peminatan / lintasan: bahasa | mipa | ips | lainnya (data lama).';
comment on column public.kelas.rombel is 'Nomor rombel dalam kombinasi tingkat+jurusan (1..n).';
comment on column public.kelas.kapasitas_max is 'Maksimal siswa per kelas (default 35).';

-- Unik per kombinasi tingkat + jurusan + rombel (rombel wajib untuk jurusan mapel)
drop index if exists kelas_tingkat_jurusan_rombel_uq;
create unique index kelas_tingkat_jurusan_rombel_uq
  on public.kelas (tingkat, jurusan, rombel)
  where jurusan in ('bahasa', 'mipa', 'ips') and rombel is not null;

-- --- 2) Seed 5 kelas × 3 jurusan × 3 tingkat (10, 11, 12) --------------------
-- Catatan: tabel kelas punya UNIQUE(nama). Baris lama bisa sudah punya nama
-- yang sama tetapi jurusan/rombel masih default — NOT EXISTS (tingkat,jurusan,
-- rombel) saja tidak cukup. Pakai ON CONFLICT (nama) untuk upsert aman.
insert into public.kelas (nama, tingkat, jurusan, rombel, kapasitas_max)
select
  case v.tingkat
    when 10 then 'X'
    when 11 then 'XI'
    else 'XII'
  end
  || ' '
  || case v.jurusan
    when 'bahasa' then 'Bahasa'
    when 'mipa' then 'MIPA'
    else 'IPS'
  end
  || ' '
  || v.rombel::text,
  v.tingkat,
  v.jurusan,
  v.rombel,
  35
from (
  select t.tingkat, j.jurusan, r.rombel
  from generate_series(10, 12) as t(tingkat)
  cross join (values ('bahasa'), ('mipa'), ('ips')) as j(jurusan)
  cross join generate_series(1, 5) as r(rombel)
) v
on conflict (nama) do update set
  tingkat = excluded.tingkat,
  jurusan = excluded.jurusan,
  rombel = excluded.rombel,
  kapasitas_max = excluded.kapasitas_max;

-- --- 3) View: jumlah siswa per kelas (untuk UI admin) ------------------------
create or replace view public.kelas_with_siswa_count as
select
  k.id,
  k.nama,
  k.tingkat,
  k.jurusan,
  k.rombel,
  k.kapasitas_max,
  (
    select count(*)::integer
    from public.students s
    where s.kelas_id = k.id
  ) as jumlah_siswa
from public.kelas k;

comment on view public.kelas_with_siswa_count is 'Ringkasan kapasitas kelas untuk dropdown admin.';

grant select on public.kelas_with_siswa_count to authenticated;

-- --- 4) Trigger: batasi isi kelas ke kapasitas_max -----------------------------
create or replace function public.enforce_kelas_kapasitas()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  cap integer;
  occ integer;
begin
  if new.kelas_id is null then
    return new;
  end if;

  select coalesce(k.kapasitas_max, 35) into cap
  from public.kelas k
  where k.id = new.kelas_id;

  if cap is null then
    cap := 35;
  end if;

  if tg_op = 'INSERT' then
    select count(*)::integer into occ
    from public.students s
    where s.kelas_id = new.kelas_id;
  else
    -- UPDATE: hitung siswa lain di kelas tujuan (tanpa baris ini)
    select count(*)::integer into occ
    from public.students s
    where s.kelas_id = new.kelas_id
      and s.id is distinct from new.id;
  end if;

  if occ >= cap then
    raise exception 'Kelas penuh (maksimum % siswa).', cap
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_students_kelas_kapasitas on public.students;
create trigger trg_students_kelas_kapasitas
  before insert or update of kelas_id on public.students
  for each row
  execute function public.enforce_kelas_kapasitas();

comment on function public.enforce_kelas_kapasitas() is 'Cegah penempatan siswa melebihi kelas.kapasitas_max.';
