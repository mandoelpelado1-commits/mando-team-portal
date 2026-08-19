/**
 * Resets every team member to a fresh temporary password and forces a change
 * on their next login.
 *
 *   npm run reset-passwords            # everyone
 *   npm run reset-passwords -- chito   # just one user
 *
 * The generated passwords are printed ONCE. Send them to each person over a
 * private channel (DM/signal/phone) — never in the same message as the portal
 * link, and never in a group chat.
 */
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(process.cwd(), 'data', 'mando.db');
const db = new DatabaseSync(dbPath);

// Ambiguous characters removed so nobody mistypes O/0 or l/1/I over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generatePassword(length = 14) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  // Group for readability: xxxx-xxxx-xxxx
  return `${out.slice(0, 4)}-${out.slice(4, 9)}-${out.slice(9, 14)}`;
}

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));

const users = db
  .prepare(
    only.length
      ? `SELECT id, username, display_name, role FROM users WHERE username IN (${only.map(() => '?').join(',')}) ORDER BY id`
      : 'SELECT id, username, display_name, role FROM users ORDER BY id'
  )
  .all(...only);

if (users.length === 0) {
  console.error('\nNo matching users found.\n');
  process.exit(1);
}

const update = db.prepare(
  'UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?'
);

console.log('\n=========================================================');
console.log('  TEMPORARY PASSWORDS — shown once, distribute privately');
console.log('=========================================================\n');

for (const u of users) {
  const tempPassword = generatePassword();
  update.run(bcrypt.hashSync(tempPassword, 10), u.id);
  console.log(`  ${u.display_name} (${u.role})`);
  console.log(`     username: ${u.username}`);
  console.log(`     password: ${tempPassword}\n`);
}

console.log('---------------------------------------------------------');
console.log('  Everyone is forced to set a new password at first login.');
console.log('  These temps stop working the moment they do.');
console.log('---------------------------------------------------------\n');
