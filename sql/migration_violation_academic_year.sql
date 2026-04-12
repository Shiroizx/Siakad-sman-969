-- =============================================================================
-- Pelanggaran mengikuti tahun ajaran (selaras absensi & nilai)
-- Jalankan setelah migration_academic_years_archive.sql
-- =============================================================================

alter table public.violation_records
  add column if not exists academic_year_id uuid references public.academic_years (id) on delete restrict;

update public.violation_records v
set academic_year_id = y.id
from (
  select id from public.academic_years order by created_at asc limit 1
) y
where v.academic_year_id is null;

alter table public.violation_records
  alter column academic_year_id set not null;

comment on column public.violation_records.academic_year_id is 'Tahun ajaran saat pelanggaran dicatat (filter EWS / arsip).';

drop index if exists violation_records_student_semester_idx;
create index if not exists violation_records_student_year_semester_idx
  on public.violation_records (student_id, academic_year_id, semester);
