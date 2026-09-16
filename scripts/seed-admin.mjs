import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

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

if (password.length < 10) {
  console.error('SEED_ADMIN_PASSWORD must be at least 10 characters.');
  process.exit(2);
}

// Must stay in sync with supabase/functions/_shared/password.ts
const ITERATIONS = 210_000;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

function hashPassword(plain) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = crypto.pbkdf2Sync(plain, salt, ITERATIONS, KEY_BYTES, 'sha256');
  return `pbkdf2$sha256$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

async function ensureAdminUser() {
  const passwordHash = hashPassword(password);

  const { data: existing, error: findError } = await admin
    .from('app_users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (findError) throw new Error(`Look up app_users: ${findError.message}`);

  if (existing?.id) {
    const { error } = await admin
      .from('app_users')
      .update({ password_hash: passwordHash, disabled: false })
      .eq('id', existing.id);
    if (error) throw new Error(`Update app_users: ${error.message}`);
    console.log(`Reset password for existing account ${email}`);
    return String(existing.id);
  }

  const { data: created, error } = await admin
    .from('app_users')
    .insert({ email, password_hash: passwordHash })
    .select('id')
    .single();
  if (error) throw new Error(`Create app_users: ${error.message}`);
  console.log(`Created account ${email}`);
  return String(created.id);
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
        `Ensure migrations 20260316100000_app_roles.sql and 20260318100000_custom_auth.sql are applied.`
    );
  }
}

async function revokeSessions(userId) {
  // Rotating the password invalidates anything issued before.
  const { error } = await admin.from('app_sessions').delete().eq('user_id', userId);
  if (error) throw new Error(`Clear sessions: ${error.message}`);
}

try {
  const userId = await ensureAdminUser();
  await ensureAdministratorProfile(userId);
  await revokeSessions(userId);
  console.log(`Administrator ready.`);
  console.log(`  email: ${email}`);
  console.log(`  user_id: ${userId}`);
  console.log(`Sign in, open Settings, then invite other users.`);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
