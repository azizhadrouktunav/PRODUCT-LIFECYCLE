import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(root, '.env'));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.SEED_ADMIN_EMAIL || 'admin@tunav.com').trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || '';
const displayName = (process.env.SEED_ADMIN_NAME || 'Administrator').trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.error(`Missing Supabase credentials.

Add to .env:
  VITE_SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  SEED_ADMIN_PASSWORD=a-strong-password
`);
  process.exit(2);
}

if (!password) {
  console.error(`SEED_ADMIN_PASSWORD is required (do not commit real passwords).

Add to .env:
  SEED_ADMIN_EMAIL=${email}
  SEED_ADMIN_PASSWORD=a-strong-password
  SEED_ADMIN_NAME=${displayName}
`);
  process.exit(2);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserIdByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`List users: ${error.message}`);
    const users = data?.users ?? [];
    const match = users.find((u) => (u.email || '').toLowerCase() === targetEmail);
    if (match) return match.id;
    if (users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAuthUser() {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (!error && data?.user?.id) {
    console.log(`Created Auth user ${email}`);
    return data.user.id;
  }

  const message = error?.message || '';
  const alreadyExists =
    /already\s*(been\s*)?registered|already exists|duplicate|User already/i.test(message);

  if (!alreadyExists) {
    throw new Error(`Create user failed: ${message || 'unknown error'}`);
  }

  const existingId = await findUserIdByEmail(email);
  if (!existingId) {
    throw new Error(
      `Auth user for ${email} appears to exist but could not be found via listUsers`
    );
  }
  console.log(`Auth user already exists for ${email}; reusing id`);
  return existingId;
}

async function ensureAdministratorProfile(userId) {
  const { error } = await admin.from('app_profiles').upsert({
    user_id: userId,
    email,
    display_name: displayName,
    role: 'administrator',
    product_ids: [],
  });
  if (error) {
    throw new Error(
      `Upsert app_profiles failed: ${error.message}\n` +
        `Ensure migration 20260316100000_app_roles.sql is applied (administrator role must exist).`
    );
  }
}

try {
  const userId = await ensureAuthUser();
  await ensureAdministratorProfile(userId);
  console.log(`Administrator ready.`);
  console.log(`  email: ${email}`);
  console.log(`  user_id: ${userId}`);
  console.log(`Sign in, open Settings, then invite other users.`);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
