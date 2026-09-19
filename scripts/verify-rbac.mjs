// Proves the RLS policies from 20260319100000_rbac_rls.sql actually hold.
//
// Everything runs inside one transaction that always rolls back: the script
// creates a throwaway Technical Manager, two products, two capabilities and one
// equipment model, then re-runs every check as that user by setting the JWT
// claims PostgREST would set. Nothing survives the run.
//
//   npm run verify:rbac

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

const projectRef = 'pxlbuncwdswxisjnszas';
const password = process.env.SUPABASE_DB_PASSWORD || '';
const candidates = [];
if (process.env.DATABASE_URL) candidates.push(process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL) candidates.push(process.env.SUPABASE_DB_URL);
if (password) {
  candidates.push(
    `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
  );
  candidates.push(
    `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`
  );
}

if (candidates.length === 0) {
  console.error(
    'Missing database credentials. Add DATABASE_URL or SUPABASE_DB_PASSWORD to .env.'
  );
  process.exit(2);
}

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Run a statement as the test user and report whether RLS let it through. */
async function attempt(client, label, sql, params = []) {
  await client.query('savepoint probe');
  try {
    const res = await client.query(sql, params);
    await client.query('release savepoint probe');
    return { allowed: true, rowCount: res.rowCount, rows: res.rows };
  } catch (err) {
    await client.query('rollback to savepoint probe');
    return { allowed: false, error: err.message, label };
  }
}

async function run(client) {
  await client.query('begin');

  // ---- fixtures -----------------------------------------------------------
  await client.query(`
    insert into public.products (id, name, description) values
      ('RBACP-MINE', 'RBAC test product (assigned)', ''),
      ('RBACP-OTHER', 'RBAC test product (not assigned)', '')
  `);

  const { rows: lifecycleRows } = await client.query(
    `select id from public.lifecycles order by id limit 1`
  );
  if (lifecycleRows.length === 0) {
    throw new Error('No lifecycles in the database; run the earlier migrations first.');
  }
  const lifecycleId = lifecycleRows[0].id;

  await client.query(
    `insert into public.capability_groups (id, name, description, track, process, code, product_ids)
     values ('RBACG', 'RBAC test group', '', $1, '', 'RBAC', '{RBACP-MINE,RBACP-OTHER}')`,
    [lifecycleId]
  );

  await client.query(`
    insert into public.capabilities (id, name, description, group_id, product_ids, progress)
    values
      ('CAP-RBACMINE', 'Visible capability', '', 'RBACG', '{RBACP-MINE}', 'Identified'),
      ('CAP-RBACOTHER', 'Hidden capability', '', 'RBACG', '{RBACP-OTHER}', 'Identified')
  `);

  await client.query(`
    insert into public.epics (id, capability_id, key, name, description)
    values
      ('EPIC-RBACMINE', 'CAP-RBACMINE', '', 'Visible epic', ''),
      ('EPIC-RBACOTHER', 'CAP-RBACOTHER', '', 'Hidden epic', '')
  `);

  await client.query(`
    insert into public.equipment (id, name, vendor, model, type, product_ids)
    values
      ('EQ-RBACMINE', 'Visible device', '', '', '', '{RBACP-MINE}'),
      ('EQ-RBACOTHER', 'Hidden device', '', '', '', '{RBACP-OTHER}')
  `);

  await client.query(`
    insert into public.lifecycles (id, label, summary, decomposition, stages, story_stages, product_ids)
    values
      ('LC-RBACMINE', 'Mine LC', '', 'none', '[]'::jsonb, '[]'::jsonb, '{RBACP-MINE}'),
      ('LC-RBACOTHER', 'Other LC', '', 'none', '[]'::jsonb, '[]'::jsonb, '{RBACP-OTHER}')
  `);

  await client.query(`
    insert into public.waves (id, code, name, description, state, item_ids, product_ids)
    values
      ('WAVE-RBACMINE', 'W-91', 'Mine wave', '', 'Planned', '{}', '{RBACP-MINE}'),
      ('WAVE-RBACOTHER', 'W-92', 'Other wave', '', 'Planned', '{}', '{RBACP-OTHER}')
  `);

  await client.query(`
    insert into public.actors (id, name, description, product_ids)
    values
      ('ACT-RBACMINE', 'Visible actor', '', '{RBACP-MINE}'),
      ('ACT-RBACOTHER', 'Hidden actor', '', '{RBACP-OTHER}')
  `);

  const { rows: userRows } = await client.query(
    `insert into public.app_users (email) values ('rbac-probe@example.invalid') returning id`
  );
  const userId = userRows[0].id;

  await client.query(
    `insert into public.app_profiles (user_id, email, display_name, role, product_ids)
     values ($1, 'rbac-probe@example.invalid', 'RBAC probe', 'technical_manager', '{RBACP-MINE}')`,
    [userId]
  );

  const { rows: adminRows } = await client.query(
    `select user_id from public.app_profiles where role = 'administrator' limit 1`
  );

  // ---- become the Technical Manager ---------------------------------------
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: userId, role: 'authenticated', aud: 'authenticated' }),
  ]);
  await client.query('set local role authenticated');

  const uid = await client.query('select public.app_uid() as uid');
  record(
    'app_uid() resolves the caller from the JWT',
    uid.rows[0].uid === userId,
    `got ${uid.rows[0].uid}`
  );

  const perms = await client.query(
    `select public.app_has('manage_equipment') as equip,
            public.app_has('edit_capability') as cap,
            public.app_has('manage_users') as users,
            public.app_sees_all() as all_products,
            public.app_products() as products`
  );
  const p = perms.rows[0];
  record(
    'Permissions match the technical_manager role',
    p.equip === true && p.cap === false && p.users === false && p.all_products === false,
    `equipment=${p.equip} capability=${p.cap} users=${p.users} seesAll=${p.all_products}`
  );
  record(
    'Assigned products come back from app_products()',
    Array.isArray(p.products) && p.products.length === 1 && p.products[0] === 'RBACP-MINE',
    JSON.stringify(p.products)
  );

  // ---- reads --------------------------------------------------------------
  const caps = await client.query(
    `select id from public.capabilities where id in ('CAP-RBACMINE', 'CAP-RBACOTHER')`
  );
  record(
    'Only the assigned product\'s capability is readable',
    caps.rowCount === 1 && caps.rows[0].id === 'CAP-RBACMINE',
    caps.rows.map((r) => r.id).join(', ') || 'none'
  );

  const epics = await client.query(
    `select id from public.epics where id in ('EPIC-RBACMINE', 'EPIC-RBACOTHER')`
  );
  record(
    'Epics inherit the capability scope',
    epics.rowCount === 1 && epics.rows[0].id === 'EPIC-RBACMINE',
    epics.rows.map((r) => r.id).join(', ') || 'none'
  );

  const prods = await client.query(
    `select id from public.products where id in ('RBACP-MINE', 'RBACP-OTHER')`
  );
  record(
    'Only assigned products are readable',
    prods.rowCount === 1 && prods.rows[0].id === 'RBACP-MINE',
    prods.rows.map((r) => r.id).join(', ') || 'none'
  );

  const actors = await client.query(
    `select id from public.actors where id in ('ACT-RBACMINE', 'ACT-RBACOTHER')`
  );
  record(
    'Actors are product scoped',
    actors.rowCount === 1 && actors.rows[0].id === 'ACT-RBACMINE',
    actors.rows.map((r) => r.id).join(', ') || 'none'
  );

  const equip = await client.query(
    `select id from public.equipment where id in ('EQ-RBACMINE', 'EQ-RBACOTHER')`
  );
  record(
    'Equipment is product scoped',
    equip.rowCount === 1 && equip.rows[0].id === 'EQ-RBACMINE',
    equip.rows.map((r) => r.id).join(', ') || 'none'
  );

  const lcs = await client.query(
    `select id from public.lifecycles where id in ('LC-RBACMINE', 'LC-RBACOTHER')`
  );
  record(
    'Lifecycles are product scoped',
    lcs.rowCount === 1 && lcs.rows[0].id === 'LC-RBACMINE',
    lcs.rows.map((r) => r.id).join(', ') || 'none'
  );

  const waveRows = await client.query(
    `select id from public.waves where id in ('WAVE-RBACMINE', 'WAVE-RBACOTHER')`
  );
  record(
    'Waves are product scoped',
    waveRows.rowCount === 1 && waveRows.rows[0].id === 'WAVE-RBACMINE',
    waveRows.rows.map((r) => r.id).join(', ') || 'none'
  );

  const status = await client.query(`select user_id from public.app_user_status`);
  record(
    'app_user_status no longer enumerates accounts',
    status.rows.every((r) => r.user_id === userId),
    `${status.rowCount} row(s)`
  );

  const profiles = await client.query(`select user_id from public.app_profiles`);
  record(
    'Only the caller\'s own profile is readable',
    profiles.rowCount === 1 && profiles.rows[0].user_id === userId,
    `${profiles.rowCount} row(s)`
  );

  // ---- writes that must succeed ------------------------------------------
  const equipInsert = await attempt(
    client,
    'equipment insert',
    `insert into public.equipment (id, name, vendor, model, type, product_ids)
     values ('EQ-RBAC2', 'Added by the technical manager', '', '', '', '{RBACP-MINE}')`
  );
  record('Equipment insert is allowed', equipInsert.allowed, equipInsert.error);

  const equipUpdate = await attempt(
    client,
    'equipment update',
    `update public.equipment set name = 'Renamed' where id = 'EQ-RBACMINE'`
  );
  record(
    'Equipment update is allowed',
    equipUpdate.allowed && equipUpdate.rowCount === 1,
    equipUpdate.error ?? `${equipUpdate.rowCount} row(s)`
  );

  const equipOtherDenied = await attempt(
    client,
    'equipment other product',
    `update public.equipment set name = 'Nope' where id = 'EQ-RBACOTHER'`
  );
  record(
    'Equipment on another product is not writable',
    !equipOtherDenied.allowed || equipOtherDenied.rowCount === 0,
    equipOtherDenied.error ?? `${equipOtherDenied.rowCount} row(s)`
  );

  const assign = await attempt(
    client,
    'assign capabilities',
    `select public.app_set_equipment_capabilities('EQ-RBACMINE', '{CAP-RBACMINE}'::text[])`
  );
  record('Assigning capabilities to equipment is allowed', assign.allowed, assign.error);

  if (assign.allowed) {
    await client.query('reset role');
    const assigned = await client.query(
      `select id, equipment_ids from public.capabilities
       where id in ('CAP-RBACMINE', 'CAP-RBACOTHER')`
    );
    await client.query('set local role authenticated');
    const mine = assigned.rows.find((r) => r.id === 'CAP-RBACMINE');
    const other = assigned.rows.find((r) => r.id === 'CAP-RBACOTHER');
    record(
      'The assignment only touched the visible capability',
      mine.equipment_ids.includes('EQ-RBACMINE') && !other.equipment_ids.includes('EQ-RBACMINE')
    );
  }

  // ---- writes that must fail ---------------------------------------------
  const capUpdate = await attempt(
    client,
    'capability update',
    `update public.capabilities set name = 'Renamed' where id = 'CAP-RBACMINE'`
  );
  record(
    'Editing a capability is denied',
    !capUpdate.allowed || capUpdate.rowCount === 0,
    capUpdate.allowed ? `${capUpdate.rowCount} row(s) changed` : capUpdate.error
  );

  const capInsert = await attempt(
    client,
    'capability insert',
    `insert into public.capabilities (id, name, description, group_id, product_ids, progress)
     values ('CAP-RBACNEW', 'Should not exist', '', 'RBACG', '{RBACP-MINE}', 'Identified')`
  );
  record('Creating a capability is denied', !capInsert.allowed, capInsert.error);

  const selfPromote = await attempt(
    client,
    'self promotion',
    `update public.app_profiles set role = 'administrator' where user_id = $1`,
    [userId]
  );
  record(
    'Self-promotion to administrator is denied',
    !selfPromote.allowed || selfPromote.rowCount === 0,
    selfPromote.allowed ? `${selfPromote.rowCount} row(s) changed` : selfPromote.error
  );

  if (adminRows.length > 0) {
    const hijack = await attempt(
      client,
      'admin profile update',
      `update public.app_profiles set product_ids = '{RBACP-OTHER}' where user_id = $1`,
      [adminRows[0].user_id]
    );
    record(
      'Editing somebody else\'s profile is denied',
      !hijack.allowed || hijack.rowCount === 0,
      hijack.allowed ? `${hijack.rowCount} row(s) changed` : hijack.error
    );
  }

  const grantSelf = await attempt(
    client,
    'permission grant',
    `insert into public.app_role_permissions (role_slug, action)
     values ('technical_manager', 'edit_all')`
  );
  record('Granting itself a new permission is denied', !grantSelf.allowed, grantSelf.error);

  const readUsers = await attempt(client, 'app_users read', `select id from public.app_users`);
  record('Password hashes stay unreachable', !readUsers.allowed, readUsers.error);

  const waveWrite = await attempt(
    client,
    'wave insert',
    `insert into public.waves (id, code, name, description, state)
     values ('W-RBAC', 'W0', 'Should not exist', '', 'Planned')`
  );
  record('Defining a wave is denied', !waveWrite.allowed, waveWrite.error);

  const actorWrite = await attempt(
    client,
    'actor insert',
    `insert into public.actors (id, name, description, product_ids)
     values ('ACT-RBACNEW', 'Should not exist', '', '{RBACP-MINE}')`
  );
  record('Creating an actor is denied', !actorWrite.allowed, actorWrite.error);

  await client.query('reset role');
  await client.query('rollback');
}

let lastError = null;
for (const connectionString of candidates) {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
  } catch (err) {
    lastError = err;
    const host = connectionString.includes('@') ? connectionString.split('@')[1] : '(custom url)';
    console.warn(`Could not connect to ${host}: ${err.message}`);
    continue;
  }

  try {
    await run(client);
  } catch (err) {
    console.error(`\nVerification aborted: ${err.message}`);
    try {
      await client.query('rollback');
    } catch {
      /* already rolled back */
    }
    await client.end();
    process.exit(1);
  }

  await client.end();

  const failed = results.filter((r) => !r.passed);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed. Nothing was kept: the transaction rolled back.`
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

console.error('Could not connect to the database.', lastError?.message ?? '');
process.exit(2);
