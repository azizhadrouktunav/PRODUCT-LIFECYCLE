import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

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

const sqlPath = path.join(root, 'supabase', 'migrations', '20260308170000_init_registry.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const password = process.env.SUPABASE_DB_PASSWORD || '';
const projectRef = 'pxlbuncwdswxisjnszas';

const candidates = [];
if (databaseUrl) candidates.push(databaseUrl);
if (password) {
  candidates.push(
    `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
  );
  candidates.push(
    `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
  );
  candidates.push(
    `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`
  );
}

if (candidates.length === 0) {
  console.error(`Missing database credentials.

Add one of these to .env then re-run: npm run db:migrate

  SUPABASE_DB_PASSWORD=your-database-password
  DATABASE_URL=postgresql://postgres.${projectRef}:PASSWORD@db.${projectRef}.supabase.co:5432/postgres

Or paste the SQL file into Supabase Dashboard → SQL Editor → Run:
  ${sqlPath}
`);
  process.exit(2);
}

let lastError = null;
for (const connectionString of candidates) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.query(sql);
    console.log('Migration applied successfully.');
    await client.end();
    process.exit(0);
  } catch (err) {
    lastError = err;
    const host = connectionString.includes('@') ? connectionString.split('@')[1] : '(custom url)';
    console.warn(`Connection failed for ${host}: ${err.message}`);
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

console.error('Could not apply migration.', lastError?.message ?? '');
process.exit(1);
