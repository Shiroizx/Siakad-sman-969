-- =============================================================================
-- Data contoh untuk melengkapi kolom profil siswa (pribadi, kontak, ortu).
-- Jalankan di Supabase SQL Editor setelah kolom dari expand_students_and_rls.sql ada.
-- Sesuaikan NISN / nama dengan data sekolah Anda bila perlu.
-- =============================================================================

-- --- Lengkapi siswa seed (NISN yang dipakai di add_tanggal_lahir_students.sql) --
update public.students
set
  nik = coalesce(nik, '317501150507' || right(nisn, 4)),
  tempat_lahir = coalesce(nullif(trim(tempat_lahir), ''), 'Jakarta'),
  agama = coalesce(nullif(trim(agama), ''), 'Islam'),
  alamat = coalesce(
    nullif(trim(alamat), ''),
    'Jl. Pendidikan No. 969, RT 01/RW 02, Jakarta'
  ),
  no_hp = coalesce(nullif(trim(no_hp), ''), '0812' || right(nisn, 8)),
  email = coalesce(
    nullif(trim(lower(email)), ''),
    'siswa.' || nisn || '@siswa.sman969.sch.id'
  ),
  nama_ayah = coalesce(nullif(trim(nama_ayah), ''), 'Budi Wijaya'),
  pekerjaan_ayah = coalesce(nullif(trim(pekerjaan_ayah), ''), 'PNS'),
  nama_ibu = coalesce(nullif(trim(nama_ibu), ''), 'Siti Aminah'),
  pekerjaan_ibu = coalesce(nullif(trim(pekerjaan_ibu), ''), 'Guru'),
  no_hp_ortu = coalesce(nullif(trim(no_hp_ortu), ''), '0813' || right(nisn, 8))
where nisn = '0012345678';

update public.students
set
  nik = coalesce(nik, '317502250308' || right(nisn, 4)),
  tempat_lahir = coalesce(nullif(trim(tempat_lahir), ''), 'Bandung'),
  agama = coalesce(nullif(trim(agama), ''), 'Islam'),
  alamat = coalesce(
    nullif(trim(alamat), ''),
    'Jl. Merdeka No. 12, Bandung'
  ),
  no_hp = coalesce(nullif(trim(no_hp), ''), '0821' || right(nisn, 8)),
  email = coalesce(
    nullif(trim(lower(email)), ''),
    'siswa.' || nisn || '@siswa.sman969.sch.id'
  ),
  nama_ayah = coalesce(nullif(trim(nama_ayah), ''), 'Ahmad Hidayat'),
  pekerjaan_ayah = coalesce(nullif(trim(pekerjaan_ayah), ''), 'Wiraswasta'),
  nama_ibu = coalesce(nullif(trim(nama_ibu), ''), 'Rina Marlina'),
  pekerjaan_ibu = coalesce(nullif(trim(pekerjaan_ibu), ''), 'Dokter'),
  no_hp_ortu = coalesce(nullif(trim(no_hp_ortu), ''), '0822' || right(nisn, 8))
where nisn = '0012345679';

update public.students
set
  nik = coalesce(nik, '317503350409' || right(nisn, 4)),
  tempat_lahir = coalesce(nullif(trim(tempat_lahir), ''), 'Surabaya'),
  agama = coalesce(nullif(trim(agama), ''), 'Kristen'),
  alamat = coalesce(
    nullif(trim(alamat), ''),
    'Perumahan Pelajar Blok C No. 5, Surabaya'
  ),
  no_hp = coalesce(nullif(trim(no_hp), ''), '0856' || right(nisn, 8)),
  email = coalesce(
    nullif(trim(lower(email)), ''),
    'siswa.' || nisn || '@siswa.sman969.sch.id'
  ),
  nama_ayah = coalesce(nullif(trim(nama_ayah), ''), 'Eko Prasetyo'),
  pekerjaan_ayah = coalesce(nullif(trim(pekerjaan_ayah), ''), 'Teknisi'),
  nama_ibu = coalesce(nullif(trim(nama_ibu), ''), 'Maria Ulfa'),
  pekerjaan_ibu = coalesce(nullif(trim(pekerjaan_ibu), ''), 'Akuntan'),
  no_hp_ortu = coalesce(nullif(trim(no_hp_ortu), ''), '0857' || right(nisn, 8))
where nisn = '0012345680';

update public.students
set
  nik = coalesce(nik, '317504450510' || right(nisn, 4)),
  tempat_lahir = coalesce(nullif(trim(tempat_lahir), ''), 'Yogyakarta'),
  agama = coalesce(nullif(trim(agama), ''), 'Islam'),
  alamat = coalesce(
    nullif(trim(alamat), ''),
    'Jl. Kaliurang Km 8, Sleman'
  ),
  no_hp = coalesce(nullif(trim(no_hp), ''), '0878' || right(nisn, 8)),
  email = coalesce(
    nullif(trim(lower(email)), ''),
    'siswa.' || nisn || '@siswa.sman969.sch.id'
  ),
  nama_ayah = coalesce(nullif(trim(nama_ayah), ''), 'Hendra Gunawan'),
  pekerjaan_ayah = coalesce(nullif(trim(pekerjaan_ayah), ''), 'Polisi'),
  nama_ibu = coalesce(nullif(trim(nama_ibu), ''), 'Dewi Lestari'),
  pekerjaan_ibu = coalesce(nullif(trim(pekerjaan_ibu), ''), 'Pengacara'),
  no_hp_ortu = coalesce(nullif(trim(no_hp_ortu), ''), '0879' || right(nisn, 8))
where nisn = '0012345681';

update public.students
set
  nik = coalesce(nik, '317505550611' || right(nisn, 4)),
  tempat_lahir = coalesce(nullif(trim(tempat_lahir), ''), 'Medan'),
  agama = coalesce(nullif(trim(agama), ''), 'Islam'),
  alamat = coalesce(
    nullif(trim(alamat), ''),
    'Jl. Sudirman No. 88, Medan'
  ),
  no_hp = coalesce(nullif(trim(no_hp), ''), '0811' || right(nisn, 8)),
  email = coalesce(
    nullif(trim(lower(email)), ''),
    'siswa.' || nisn || '@siswa.sman969.sch.id'
  ),
  nama_ayah = coalesce(nullif(trim(nama_ayah), ''), 'Faisal Rahman'),
  pekerjaan_ayah = coalesce(nullif(trim(pekerjaan_ayah), ''), 'Pilot'),
  nama_ibu = coalesce(nullif(trim(nama_ibu), ''), 'Nurhaliza Putri'),
  pekerjaan_ibu = coalesce(nullif(trim(pekerjaan_ibu), ''), 'Apoteker'),
  no_hp_ortu = coalesce(nullif(trim(no_hp_ortu), ''), '0810' || right(nisn, 8))
where nisn = '0012345682';

-- --- Isi otomatis untuk siswa lain yang kolomnya masih kosong (generik) -------
update public.students
set
  nik = coalesce(nullif(trim(nik), ''), lpad(regexp_replace(nisn, '\D', '', 'g'), 16, '0')),
  tempat_lahir = coalesce(nullif(trim(tempat_lahir), ''), 'Jakarta'),
  agama = coalesce(nullif(trim(agama), ''), 'Islam'),
  alamat = coalesce(
    nullif(trim(alamat), ''),
    'Jl. Pendidikan No. ' || right(regexp_replace(nisn, '\D', '', 'g'), 4) || ', Jakarta'
  ),
  no_hp = coalesce(nullif(trim(no_hp), ''), '08' || right(lpad(regexp_replace(nisn, '\D', '', 'g'), 10, '0'), 10)),
  email = coalesce(
    nullif(trim(lower(email)), ''),
    'siswa.' || regexp_replace(nisn, '\D', '', 'g') || '@siswa.sman969.sch.id'
  ),
  nama_ayah = coalesce(nullif(trim(nama_ayah), ''), 'Ayah ' || left(coalesce(nama, 'Siswa'), 40)),
  pekerjaan_ayah = coalesce(nullif(trim(pekerjaan_ayah), ''), 'Karyawan Swasta'),
  nama_ibu = coalesce(nullif(trim(nama_ibu), ''), 'Ibu ' || left(coalesce(nama, 'Siswa'), 40)),
  pekerjaan_ibu = coalesce(nullif(trim(pekerjaan_ibu), ''), 'Ibu Rumah Tangga'),
  no_hp_ortu = coalesce(
    nullif(trim(no_hp_ortu), ''),
    '0813' || right(lpad(regexp_replace(nisn, '\D', '', 'g'), 8, '0'), 8)
  )
where
  coalesce(nullif(trim(no_hp), ''), '') = ''
  or coalesce(nullif(trim(alamat), ''), '') = '';

-- --- Siswa contoh BARU (hanya jika NISN belum ada; kelas = satu baris pertama) --
insert into public.students (
  nisn,
  nama,
  jenis_kelamin,
  kelas_id,
  tanggal_lahir,
  nik,
  tempat_lahir,
  agama,
  alamat,
  no_hp,
  email,
  nama_ayah,
  pekerjaan_ayah,
  nama_ibu,
  pekerjaan_ibu,
  no_hp_ortu
)
select
  '0099887766',
  'Satria Wibowo',
  'L',
  (select id from public.kelas order by nama nulls last limit 1),
  date '2007-01-15',
  '3175090101010099',
  'Depok',
  'Islam',
  'Jl. Margonda Raya No. 100, Depok',
  '089912345678',
  'satria.wibowo@siswa.sman969.sch.id',
  'Wibowo Santoso',
  'Arsitek',
  'Larasati Dewi',
  'Dosen',
  '089812345678'
where not exists (select 1 from public.students s where s.nisn = '0099887766');

insert into public.students (
  nisn,
  nama,
  jenis_kelamin,
  kelas_id,
  tanggal_lahir,
  nik,
  tempat_lahir,
  agama,
  alamat,
  no_hp,
  email,
  nama_ayah,
  pekerjaan_ayah,
  nama_ibu,
  pekerjaan_ibu,
  no_hp_ortu
)
select
  '0099887767',
  'Citra Lestari',
  'P',
  (select id from public.kelas order by nama desc nulls last limit 1),
  date '2007-08-22',
  '3175090202020088',
  'Tangerang',
  'Islam',
  'Perumahan Citra Garden Blok A/7, Tangerang',
  '089923456789',
  'citra.lestari@siswa.sman969.sch.id',
  'Lestari Hidayat',
  'Karyawan BUMN',
  'Citra Anggraini',
  'Perawat',
  '089823456789'
where not exists (select 1 from public.students s where s.nisn = '0099887767');
