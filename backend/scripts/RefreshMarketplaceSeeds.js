/**
 * Refreshes marketplace job deadlines so seeded/demo jobs stay Open (default: +14 days)
 * without wiping existing proposals, contracts, or gig orders.
 *
 * Options:
 *   --days=14   Number of days from NOW() to set application_deadline (default: 14)
 *   --append    Add any missing seeded Jobs & Gigs without deleting existing ones
 *   --reseed    Run SeedJobsDataset.js and SeedGigsDataset.js for a full clean dataset reset
 *
 * Usage:
 *   node backend/scripts/RefreshMarketplaceSeeds.js
 *   node backend/scripts/RefreshMarketplaceSeeds.js --append
 *   node backend/scripts/RefreshMarketplaceSeeds.js --reseed
 */
require('dotenv').config({ quiet: true, path: require('path').resolve(__dirname, '../.env') });
const { execFileSync } = require('child_process');
const path = require('path');
const { pool } = require('../lib/Database');

function parseDaysArg() {
  const arg = process.argv.find((a) => a.startsWith('--days='));
  const parsed = parseInt(arg ? arg.split('=')[1] : process.env.SEED_DEADLINE_DAYS || '14', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 14;
}

async function run() {
  const shouldReseed = process.argv.includes('--reseed');
  const shouldAppend = process.argv.includes('--append');
  const days = parseDaysArg();

  if (shouldReseed || shouldAppend) {
    const modeFlag = shouldReseed ? '--reseed' : '--append';
    console.log(
      `${shouldReseed ? 'Reseeding' : 'Appending missing'} Jobs & Gigs datasets (${modeFlag}, application_deadline = +${days} days)...`
    );
    const scriptsDir = __dirname;
    const jobArgs = [path.join(scriptsDir, 'SeedJobsDataset.js'), `--days=${days}`];
    const gigArgs = [path.join(scriptsDir, 'SeedGigsDataset.js')];
    if (shouldAppend) {
      jobArgs.push('--append');
      gigArgs.push('--append');
    }
    execFileSync(process.execPath, jobArgs, { stdio: 'inherit' });
    execFileSync(process.execPath, gigArgs, { stdio: 'inherit' });
    if (shouldReseed) return;
  }

  const res = await pool.query(
    `UPDATE jobs j
        SET status = 'Open',
            application_deadline = NOW() + ($1 || ' days')::interval,
            updated_at = NOW()
      WHERE j.deleted_at IS NULL
        AND LOWER(COALESCE(j.status, '')) IN ('open', 'expired', 'closed')
        AND NOT EXISTS (
          SELECT 1
            FROM proposals p
           WHERE p.job_id = j.job_id
             AND p.status = 'Hired'
             AND p.deleted_at IS NULL
        )
      RETURNING j.job_id`,
    [String(days)]
  );

  console.log(
    `Refreshed ${res.rowCount} non-hired job post(s) to Open with application_deadline = NOW() + ${days} days.`
  );
  await pool.end();
}

run().catch((err) => {
  console.error('Failed to refresh marketplace seeds:', err);
  process.exit(1);
});
