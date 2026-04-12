-- =============================================================================
-- Peminatan / tingkat akademik untuk siswa belum punya rombel (kelas_id null)
-- Dipakai alur: penerimaan baru → distribusi ke X Bahasa/MIPA/IPS; pooling
-- clustering memakai kolom ini bila kelas_id kosong.
-- Jalankan sekali di Supabase SQL Editor.
-- =============================================================================

alter table public.students
  add column if not exists peminatan_jurusan text
    check (
      peminatan_jurusan is null
      or peminatan_jurusan in ('bahasa', 'mipa', 'ips')
    );

alter table public.students
  add column if not exists tingkat_akademik smallint not null default 10
    check (tingkat_akademik between 10 and 12);

comment on column public.students.peminatan_jurusan is
  'Jalur peminatan yang dipilih saat daftar (bahasa/mipa/ips); dipakai saat kelas_id masih null.';
comment on column public.students.tingkat_akademik is
  'Tingkat siswa secara akademik; dipakai bila kelas_id null. Setelah penempatan rombel, diselaraskan dengan kelas.';

create index if not exists students_peminatan_tingkat_idx
  on public.students (tingkat_akademik, peminatan_jurusan)
  where kelas_id is null;

-- Selaraskan baris yang sudah punya rombel (data lama sebelum kolom ini ada)
update public.students s
set tingkat_akademik = k.tingkat::smallint
from public.kelas k
where s.kelas_id = k.id
  and k.tingkat is not null;

update public.students s
set peminatan_jurusan = k.jurusan
from public.kelas k
where s.kelas_id = k.id
  and k.jurusan in ('bahasa', 'mipa', 'ips')
  and s.peminatan_jurusan is null;
