import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env variables
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

const GURU_BK_ACCOUNTS = [
  {
    email: 'guru.bk1@sman969.sch.id',
    fullName: 'Dra. Siti Nurhaliza, S.Pd., M.Pd.',
    password: 'password123',
  },
  {
    email: 'guru.bk2@sman969.sch.id',
    fullName: 'Drs. Bambang Hermanto, S.Pd.',
    password: 'password123',
  },
];

async function run() {
  console.log("Cleaning up existing Guru BK accounts...");

  // Fetch all auth users and delete guru_bk ones
  const { data: { users }, error: fetchUsersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (!fetchUsersError) {
    for (const u of users) {
      if (u.user_metadata?.role === 'guru_bk') {
        console.log(`Deleting existing Guru BK: ${u.email}...`);
        await supabase.auth.admin.deleteUser(u.id);
      }
    }
  }

  console.log("Creating Guru BK accounts...");
  for (const account of GURU_BK_ACCOUNTS) {
    console.log(`Creating ${account.email}...`);
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        role: 'guru_bk',
        full_name: account.fullName,
      },
    });

    if (error) {
      console.error(`Failed to create ${account.email}:`, error.message);
    } else {
      console.log(`Successfully created ${account.email} (ID: ${data.user.id})`);
    }
  }

  console.log("Done seeding Guru BK accounts!");
}

run();
