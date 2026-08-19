/**
 * Creates the Postgres schema and seeds the career-milestone reference rows.
 * Safe to re-run: every statement is idempotent.
 *
 *   npm run migrate
 */
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// Load .env.local without adding a dependency.
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Run `vercel env pull .env.local` first.');
  process.exit(1);
}

const sql = neon(connectionString);

// Milestone seed lives in TypeScript; mirror it here as plain data.
const MILESTONE_SEED = require('./milestone-seed.json');

(async () => {
  console.log('\nApplying schema...');
  const schema = fs.readFileSync(path.join(process.cwd(), 'lib', 'schema.sql'), 'utf8');
  // neon()'s tagged template is single-statement; split on statement boundaries.
  const statements = schema
    .split(/;\s*[\r\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  console.log(`  ${statements.length} statements applied.`);

  console.log('\nSeeding career milestones...');
  for (let i = 0; i < MILESTONE_SEED.length; i++) {
    const m = MILESTONE_SEED[i];
    await sql.query(
      `INSERT INTO milestones
         (slug, category, title_en, title_es, description_en, description_es, priority, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (slug) DO UPDATE SET
         category = EXCLUDED.category,
         title_en = EXCLUDED.title_en,
         title_es = EXCLUDED.title_es,
         description_en = EXCLUDED.description_en,
         description_es = EXCLUDED.description_es,
         priority = EXCLUDED.priority,
         sort_order = EXCLUDED.sort_order`,
      [m.slug, m.category, m.title_en, m.title_es, m.description_en, m.description_es, m.priority, i]
    );
  }
  console.log(`  ${MILESTONE_SEED.length} milestones seeded.`);

  console.log('\nSeeding digital platforms...');
  const DSP_SEED = require('./dsp-seed.json');
  for (let i = 0; i < DSP_SEED.length; i++) {
    const d = DSP_SEED[i];
    await sql.query(
      `INSERT INTO dsp_profiles (slug, name, category, manage_url, note_en, note_es, auto_metrics, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         manage_url = EXCLUDED.manage_url,
         note_en = EXCLUDED.note_en,
         note_es = EXCLUDED.note_es,
         auto_metrics = EXCLUDED.auto_metrics,
         sort_order = EXCLUDED.sort_order`,
      [d.slug, d.name, d.category, d.manageUrl, d.note_en, d.note_es, Boolean(d.autoMetrics), i]
    );
  }
  console.log(`  ${DSP_SEED.length} platforms seeded.`);

  const [{ count }] = await sql.query('SELECT COUNT(*)::int AS count FROM users');
  console.log(`\nUsers currently in database: ${count}`);
  console.log('Done.\n');
})().catch((e) => {
  console.error('\nMigration failed:', e.message);
  process.exit(1);
});
