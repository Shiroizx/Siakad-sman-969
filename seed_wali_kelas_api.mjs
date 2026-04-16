import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env variables manually since dotenv might not be installed
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0 && !key.startsWith('#')) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log("Cleaning up previously generated wali kelas...");
  // Clear from kelas table
  const { error: clearKelasError } = await supabase
    .from('kelas')
    .update({ wali_kelas_user_id: null })
    .not('wali_kelas_user_id', 'is', null);
    
  if (clearKelasError) {
    console.error("Error clearing kelas:", clearKelasError);
  }

  // Fetch all auth users (since we know we have less than a few hundred)
  const { data: { users }, error: fetchUsersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (!fetchUsersError) {
      for (const u of users) {
          if (u.user_metadata?.role === 'wali_kelas' || u.email?.startsWith('walikelas.')) {
              console.log(`Deleting bad auth user: ${u.email}...`);
              await supabase.auth.admin.deleteUser(u.id);
          }
      }
  }

  console.log("Fetching classes without wali kelas...");
  const { data: classes, error: fetchError } = await supabase
    .from('kelas')
    .select('id, nama, tingkat, jurusan, rombel')
    .is('wali_kelas_user_id', null)
    .order('tingkat')
    .order('jurusan')
    .order('rombel');

  if (fetchError) {
    console.error("Error fetching classes:", fetchError);
    return;
  }

  const arrNames = [
    'Budi Santoso', 'Siti Aminah', 'Ahmad Fauzi', 'Ratna Sari', 
    'Andi Wijaya', 'Sri Mulyani', 'Hendrik Gunawan', 'Lina Herlina',
    'Bambang Susanto', 'Dewi Lestari', 'Joko Purwanto', 'Maya Indah',
    'Bahrudin Ali', 'Tri Rahayu', 'Eko Prasetyo', 'Dwi Hastuti',
    'Rahmat Hidayat', 'Nurul Huda', 'Arief Budiman', 'Rini Astuti',
    'Iwan Setiawan', 'Tuti Wulandari', 'Yusuf Pranata', 'Diana Fitri',
    'Lukman Hakim', 'Siska Anggraini', 'Ardiansyah Putra', 'Indah Permatasari',
    'Hasan Basri', 'Fatmawati', 'Agus Budiman', 'Dian Sastrowardoyo'
  ];

  const arrGelar = ['S.Pd.', 'S.Pd., M.Pd.', 'S.Pd., Gr.', 'S.Si., M.Pd.', 'S.Hum.', 'S.Pd.', 'S.Ag.'];

  let idx = 0;
  for (const c of classes) {
    const currentIndex = idx++;
    const vBase = arrNames[currentIndex % arrNames.length];
    const vName = `${vBase}, ${arrGelar[currentIndex % arrGelar.length]}`;
    let vEmail = `${vBase.toLowerCase().replace(/ /g, '.')}@sman969.sch.id`;

    // Attempt to create user
    console.log(`Creating user ${vEmail} for ${c.nama}...`);
    let { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: vEmail,
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        role: 'wali_kelas',
        full_name: vName
      }
    });

    if (authError) {
        if (authError.message.includes('already exists') || authError.message.includes('already registered')) {
            vEmail = `${vBase.toLowerCase().replace(/ /g, '.')}${idx + 1}@sman969.sch.id`;
            console.log(`Email exists, retrying with ${vEmail}...`);
            const retryCmd = await supabase.auth.admin.createUser({
                email: vEmail,
                password: 'password123',
                email_confirm: true,
                user_metadata: {
                    role: 'wali_kelas',
                    full_name: vName
                }
            });
            authData = retryCmd.data;
            authError = retryCmd.error;
        }
        if (authError) {
          console.error(`Failed to create ${vEmail}:`, authError);
          continue;
        }
    }

    if (authData.user) {
        const { error: updateError } = await supabase
            .from('kelas')
            .update({ wali_kelas_user_id: authData.user.id })
            .eq('id', c.id);

        if (updateError) {
            console.error(`Failed to assign user to class ${c.nama}:`, updateError);
        } else {
            console.log(`Successfully mapped ${vEmail} to ${c.nama}`);
        }
    }
  }
  console.log("Done seeding users!");
}

run();
