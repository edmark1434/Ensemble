/**
 * Seed 20 freelancer users with video-editing skills (for the Discovery page).
 * Users are generated exactly like the regular users in lib/Seed.js:
 * faker names/handles, random 28-char firebase_user_uuid, short @mail.com email,
 * and bcrypt-hashed password "user123".
 *
 * Usage: node scripts/SeedDiscoveryFreelancers.js [count=20]
 */
require('dotenv').config();
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const { pool } = require('../lib/Database');

const cap = (v, max) => (v == null ? v : String(v).slice(0, max));
const buildShortEmail = (prefix) => {
  const p = cap(prefix.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(), 20) || 'user';
  return `${p}${faker.string.alphanumeric(6).toLowerCase()}@mail.com`;
};

// Skill profiles (tagline + skills) so match percentages vary on Discovery.
const PROFILES = [
  ['Short-form editor for creators & brands', ['Video Editing', 'Captioning', 'Dynamic Captions', 'Pacing & Timing', 'Color Grading']],
  ['Cinematic storyteller & colorist', ['Color Grading', 'Scene Assembly', 'Shot Selection', 'Continuity Editing', 'Video Editing']],
  ['Motion graphics & kinetic typography', ['Motion Graphics', '2D Animation', 'Dynamic Captions', 'Scene Transitions']],
  ['Podcast & multicam specialist', ['Multi-camera Scene Editing', 'Dialogue Editing', 'Audio Editing', 'Captioning']],
  ['Subtitles, captions & localization', ['Subtitling & Closed Captions', 'Captioning', 'Auto-captioning', 'Video Editing']],
  ['Ensemble & documentary editor', ['Ensemble Editing', 'Scene Selection', 'Dialogue Editing', 'Continuity Editing', 'Pacing & Timing']],
  ['Reels / TikTok growth editor', ['Video Editing', 'Dynamic Captions', 'Scene Transitions', 'Pacing & Timing']],
  ['VFX compositor & cleanup artist', ['Visual Effects (VFX)', 'Compositing', 'Scene Framing', 'Color Grading']],
  ['Color & finishing for ads', ['Color Grading', 'Color Correction', 'Scene Framing', 'Video Editing']],
  ['Wedding & event highlight films', ['Video Editing', 'Shot Selection', 'Scene Assembly', 'Audio Editing']],
  ['Anime-style AMVs and edits', ['2D Animation', 'Motion Graphics', 'Scene Transitions', 'Pacing & Timing']],
  ['Long-form YouTube editor', ['Video Editing', 'Captioning', 'Scene Selection', 'Audio Editing', 'Pacing & Timing']],
  ['Documentary & interview cuts', ['Dialogue Editing', 'Continuity Editing', 'Ensemble Editing', 'Shot Selection']],
  ['Thumbnails, layouts & titles', ['Motion Graphics', 'Scene Framing', 'Dynamic Captions']],
  ['Sound design & audio mix', ['Audio Editing', 'Sound Design', 'Dialogue Editing']],
  ['Product promos & explainers', ['Motion Graphics', 'Video Editing', 'Captioning', 'Scene Transitions']],
  ['Gaming montages & highlights', ['Video Editing', 'Scene Selection', 'Pacing & Timing', 'Visual Effects (VFX)']],
  ['Short film assembly & rough cuts', ['Scene Assembly', 'Shot Selection', 'Continuity Editing', 'Multi-camera Scene Editing']],
  ['Fast turnaround with auto-captions', ['Auto-captioning', 'Captioning', 'Video Editing']],
  ['All-round post-production', ['Video Editing', 'Color Grading', 'Audio Editing', 'Motion Graphics', 'Subtitling & Closed Captions', 'Ensemble Editing']],
];

/** Remove the earlier placeholder demo accounts (handles ending in "_ens"). */
async function purgeLegacyDemo(client) {
  const ids = (await client.query(
    `SELECT a.account_id, u.user_id FROM accounts a JOIN users u ON u.account_id = a.account_id
     WHERE a.handle LIKE '%\\_ens' AND u.email_address LIKE '%@demo.ensemble.local'`
  )).rows;
  if (!ids.length) return 0;
  const userIds = ids.map((r) => r.user_id);
  const accountIds = ids.map((r) => r.account_id);
  // Delete every row that references these users/accounts (subscriptions, wallets, tags, follows...)
  const refs = (await client.query(
    `SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
     JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name IN ('users', 'accounts')
       AND tc.table_name NOT IN ('users', 'accounts')`
  )).rows;
  for (const r of refs) {
    await client.query(
      `DELETE FROM "${r.table_name}" WHERE "${r.column_name}" = ANY($1)`,
      [r.ref_table === 'users' ? userIds : accountIds]
    );
  }
  await client.query('DELETE FROM users WHERE user_id = ANY($1)', [userIds]);
  await client.query('DELETE FROM accounts WHERE account_id = ANY($1)', [accountIds]);
  return ids.length;
}

async function main() {
  const count = Math.max(1, parseInt(process.argv[2], 10) || 20);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const purged = await purgeLegacyDemo(client);
    if (purged) console.log(`Removed ${purged} legacy placeholder demo accounts.`);

    const freelancerPurpose = (await client.query(
      `SELECT plpu_id FROM platform_purpose WHERE purpose_name = 'Freelancer'`
    )).rows[0]?.plpu_id;
    const tagByName = new Map(
      (await client.query('SELECT tag_id, name FROM tags WHERE deleted_at IS NULL')).rows
        .map((t) => [t.name.toLowerCase(), t.tag_id])
    );
    const profRows = (await client.query('SELECT DISTINCT proficiency FROM user_tags')).rows.map((r) => r.proficiency);
    const proficiencies = profRows.length ? profRows : ['Intermediate'];
    const passwordHash = await bcrypt.hash('user123', 10);
    const missing = new Set();

    for (let i = 0; i < count; i++) {
      const [tagline, skills] = PROFILES[i % PROFILES.length];
      const firstName = cap(faker.person.firstName(), 50);
      const lastName = cap(faker.person.lastName(), 50);
      let handle = cap(faker.internet.username({ firstName, lastName }).toLowerCase().replace(/[^a-z0-9_]/g, '_'), 50);
      while ((await client.query('SELECT 1 FROM accounts WHERE LOWER(handle) = $1', [handle])).rowCount) {
        handle = cap(`${handle}${faker.number.int({ min: 1, max: 99 })}`, 50);
      }

      const accountId = (await client.query(
        `INSERT INTO accounts (display_name, handle, type, tagline, description, merit_score, status, created_at)
         VALUES ($1, $2, 'User', $3, $4, 50, 'Active', NOW()) RETURNING account_id`,
        [cap(`${firstName} ${lastName}`, 50), handle, tagline,
          `Hi, I'm ${firstName}! ${tagline}. Open for freelance projects on Ensemble.`]
      )).rows[0].account_id;

      const userId = (await client.query(
        `INSERT INTO users (firebase_user_uuid, first_name, last_name, email_address, password_hash, account_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id`,
        [cap(faker.string.alphanumeric(28), 50), firstName, lastName,
          cap(buildShortEmail(`${firstName}${lastName}`), 50), passwordHash, accountId]
      )).rows[0].user_id;

      if (freelancerPurpose) {
        await client.query('INSERT INTO user_platform_purpose (plpu_id, user_id) VALUES ($1, $2)', [freelancerPurpose, userId]);
      }
      for (const [k, skill] of skills.entries()) {
        const tagId = tagByName.get(skill.toLowerCase());
        if (!tagId) { missing.add(skill); continue; }
        await client.query(
          `INSERT INTO user_tags (user_id, tag_id, proficiency, years) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [userId, tagId, proficiencies[(i + k) % proficiencies.length], 1 + ((i + k) % 6)]
        );
      }
      console.log(`+ ${firstName} ${lastName} (@${handle}) — ${skills.length} skills`);
    }

    await client.query('COMMIT');
    console.log(`\nCreated ${count} freelancers. Password for all: user123`);
    if (missing.size) console.log('Skills not found in tags table (skipped):', [...missing].join(', '));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
