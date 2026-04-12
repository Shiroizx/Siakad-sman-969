-- =============================================================================
-- Absensi & pelanggaran per semester (1 / 2)
-- Jalankan sekali di Supabase SQL Editor setelah migrasi sebelumnya.
-- =============================================================================

-- --- attendance_records: semester + unik (student_id, semester) ------------
alter table public.attendance_records
  add column if not exists semester integer not null default 1 check (semester in (1, 2));

drop index if exists attendance_records_student_id_uq;

delete from public.attendance_records a
using public.attendance_records b
where a.student_id = b.student_id
  and a.semester = b.semester
  and a.ctid < b.ctid;

create unique index if not exists attendance_records_student_semester_uq
  on public.attendance_records (student_id, semester);

comment on column public.attendance_records.semester is 'Semester akademik: 1 atau 2';

-- --- violation_records: semester -------------------------------------------
alter table public.violation_records
  add column if not exists semester integer not null default 1 check (semester in (1, 2));

comment on column public.violation_records.semester is 'Semester akademik saat pelanggaran dicatat';

create index if not exists violation_records_student_semester_idx
  on public.violation_records (student_id, semester);
