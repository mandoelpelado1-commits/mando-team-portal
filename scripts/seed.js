/**
 * Creates the three team accounts with temporary passwords.
 * Safe to re-run: existing usernames are skipped, never overwritten.
 *
 *   npm run seed
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { neon } = require('@neondatabase/serverless');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
const sql = neon(connectionString);

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
function generatePassword(length = 14) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4, 9)}-${out.slice(9, 14)}`;
}

// Team roster is kept OUT of version control: this repo is public, and
// committing usernames would publish valid logins for the portal.
// Source order: TEAM_SEED env var (JSON) -> scripts/team.json (gitignored).
function loadTeam() {
  if (process.env.TEAM_SEED) {
    try {
      return JSON.parse(process.env.TEAM_SEED);
    } catch {
      console.error('TEAM_SEED is set but is not valid JSON.');
      process.exit(1);
    }
  }

  const localPath = path.join(process.cwd(), 'scripts', 'team.json');
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, 'utf8'));
  }

  console.error(
    [
      '',
      'No team roster found.',
      '',
      'Create scripts/team.json (it is gitignored) using scripts/team.example.json',
      'as a template, or set the TEAM_SEED environment variable to the same JSON.',
      '',
      'Each entry needs: username, display_name, role (admin|manager|artist), location',
      '',
    ].join('\n')
  );
  process.exit(1);
}

const SEED_USERS = loadTeam();

const VALID_ROLES = new Set(['admin', 'manager', 'artist']);
for (const u of SEED_USERS) {
  if (!u.username || !u.display_name || !u.location || !VALID_ROLES.has(u.role)) {
    console.error(`Invalid team entry: ${JSON.stringify(u)}`);
    console.error('Each entry needs username, display_name, location and a role of admin|manager|artist.');
    process.exit(1);
  }
}

(async () => {
  console.log('\n=========================================================');
  console.log('  TEMPORARY PASSWORDS — shown once, distribute privately');
  console.log('=========================================================\n');

  let created = 0;
  for (const u of SEED_USERS) {
    const existing = await sql.query('SELECT id FROM users WHERE username = $1', [u.username]);
    if (existing.length > 0) {
      console.log(`  ${u.username} already exists — skipped (use reset-passwords to rotate).\n`);
      continue;
    }
    const tempPassword = generatePassword();
    await sql.query(
      `INSERT INTO users (username, password_hash, display_name, role, location, must_change_password)
       VALUES ($1,$2,$3,$4,$5,1)`,
      [u.username, bcrypt.hashSync(tempPassword, 10), u.display_name, u.role, u.location]
    );
    created++;
    console.log(`  ${u.display_name} (${u.role})`);
    console.log(`     username: ${u.username}`);
    console.log(`     password: ${tempPassword}\n`);
  }

  console.log('---------------------------------------------------------');
  console.log(`  ${created} account(s) created.`);
  console.log('  Everyone must set a new password at first login.');
  console.log('---------------------------------------------------------\n');
})().catch((e) => {
  console.error('\nSeed failed:', e.message);
  process.exit(1);
});
