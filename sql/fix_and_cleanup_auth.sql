begin;

-- 1. Lepaskan wali kelas dari seluruh kelas
update public.kelas set wali_kelas_user_id = null;

-- 2. Hapus identity yang emailnya memiliki prefix walikelas atau rolenya wali_kelas
delete from auth.identities 
using auth.users 
where auth.identities.user_id = auth.users.id 
  and (auth.users.raw_user_meta_data->>'role' = 'wali_kelas' or auth.users.email like '%@sman969.sch.id');

-- 3. Hapus users-nya
delete from auth.users 
where raw_user_meta_data->>'role' = 'wali_kelas' 
   or email like 'walikelas.%@sman969.sch.id'
   or email like '%.%@sman969.sch.id'; -- (hapus juga nama realistis seperti budi.santoso)

commit;
