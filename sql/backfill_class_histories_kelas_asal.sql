-- =============================================================================
-- Isi kelas_asal_id untuk baris class_histories yang masih null.
-- Asumsi: setiap baris berikutnya = kenaikan dari kelas pada baris sebelumnya
--         (kelas_id baris i-1 = kelas asal saat tercatat di baris i).
--
-- Prasyarat: sql/migration_class_histories_kelas_asal.sql sudah dijalankan.
-- Aman dijalankan ulang: hanya meng-update baris dengan kelas_asal_id is null.
-- =============================================================================

-- Pratinjau (opsional): hapus komentar baris select di bawah, jalankan saja itu.
/*
with ordered as (
  select
    ch.id,
    ch.student_id,
    ch.kelas_id,
    ch.kelas_asal_id,
    lag(ch.kelas_id) over (
      partition by ch.student_id
      order by ay.created_at asc, ch.created_at asc, ch.id asc
    ) as inferred_asal
  from public.class_histories ch
  join public.academic_years ay on ay.id = ch.academic_year_id
)
select id, student_id, kelas_asal_id, inferred_asal
from ordered
where kelas_asal_id is null
  and inferred_asal is not null;
*/

with ordered as (
  select
    ch.id,
    lag(ch.kelas_id) over (
      partition by ch.student_id
      order by ay.created_at asc, ch.created_at asc, ch.id asc
    ) as inferred_asal
  from public.class_histories ch
  join public.academic_years ay on ay.id = ch.academic_year_id
)
update public.class_histories ch
set kelas_asal_id = o.inferred_asal
from ordered o
where ch.id = o.id
  and ch.kelas_asal_id is null
  and o.inferred_asal is not null;
