-- =============================================================================
-- Seed Dummy Wali Kelas
-- Membuat akun Wali Kelas untuk seluruh kelas di tabel `kelas` 
-- dan meng-assign user_id-nya ke `wali_kelas_user_id`.
-- =============================================================================

begin;

-- Pastikan ekstensi pgcrypto aktif untuk encrypt password
create extension if not exists pgcrypto;

-- =============================================================================
-- === RESET DATA LAMA: Hapus semua wali kelas yang ada sebelumnya
-- =============================================================================
update public.kelas set wali_kelas_user_id = null;

delete from auth.identities 
using auth.users 
where auth.identities.user_id = auth.users.id 
  and (auth.users.raw_user_meta_data->>'role' = 'wali_kelas' or auth.users.email like 'walikelas.%@sman969.sch.id');

delete from auth.users 
where raw_user_meta_data->>'role' = 'wali_kelas' 
   or email like 'walikelas.%@sman969.sch.id';

do $$
declare
  r record;
  v_uid uuid;
  v_email text;
  v_name text; 
  v_base text;
  idx integer := 1;
  arr_names text[] := ARRAY[
    'Budi Santoso', 'Siti Aminah', 'Ahmad Fauzi', 'Ratna Sari', 
    'Andi Wijaya', 'Sri Mulyani', 'Hendrik Gunawan', 'Lina Herlina',
    'Bambang Susanto', 'Dewi Lestari', 'Joko Purwanto', 'Maya Indah',
    'Bahrudin Ali', 'Tri Rahayu', 'Eko Prasetyo', 'Dwi Hastuti',
    'Rahmat Hidayat', 'Nurul Huda', 'Arief Budiman', 'Rini Astuti',
    'Iwan Setiawan', 'Tuti Wulandari', 'Yusuf Pranata', 'Diana Fitri',
    'Lukman Hakim', 'Siska Anggraini', 'Ardiansyah Putra', 'Indah Permatasari',
    'Hasan Basri', 'Fatmawati', 'Agus Budiman', 'Dian Sastrowardoyo'
  ];
  arr_gelar text[] := ARRAY[
    'S.Pd.', 'S.Pd., M.Pd.', 'S.Pd., Gr.', 'S.Si., M.Pd.', 'S.Hum.', 'S.Pd.', 'S.Ag.'
  ];
begin
  for r in select * from public.kelas where wali_kelas_user_id is null order by tingkat, jurusan, rombel loop
    
    v_uid := gen_random_uuid();
    
    -- Pilih nama tanpa gelar
    v_base := arr_names[1 + (idx % array_length(arr_names, 1))];
    
    -- Buat nama dengan gelar
    v_name := v_base || ', ' || arr_gelar[1 + (idx % array_length(arr_gelar, 1))];
    
    -- Buat email dengan memisahkan spasi dan menggantinya dengan titik
    v_email := lower(replace(v_base, ' ', '.')) || '@sman969.sch.id';
    
    -- Cek jika email sudah terdaftar (kalau misalnya ada error rerun/konflik)
    if exists (select 1 from auth.users where email = v_email) then
      -- Tambahkan angka di belakang email agar tidak bentrok
      v_email := lower(replace(v_base, ' ', '.')) || (idx)::text || '@sman969.sch.id';
    end if;

    if exists (select 1 from auth.users where email = v_email) then
      select id into v_uid from auth.users where email = v_email limit 1;
    else
      -- 1. Insert ke auth.users
      -- Password standar: password123
      insert into auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        raw_app_meta_data,
        created_at,
        updated_at,
        last_sign_in_at
      )
      values (
        v_uid,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_email,
        crypt('password123', gen_salt('bf')),
        now(),
        jsonb_build_object('full_name', v_name, 'role', 'wali_kelas'),
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        now(),
        now(),
        now()
      );

      -- 2. Insert ke auth.identities
      insert into auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        created_at,
        updated_at,
        last_sign_in_at
      )
      values (
        gen_random_uuid(),
        v_uid,
        v_uid::text,
        jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
        'email',
        now(),
        now(),
        now()
      );
    end if;

    -- 3. Update tabel kelas
    update public.kelas
    set wali_kelas_user_id = v_uid
    where id = r.id;
    
    idx := idx + 1;
  end loop;
end $$;

commit;
