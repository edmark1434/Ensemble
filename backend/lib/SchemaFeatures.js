const { pool } = require('./Database');

/**
 * Whether optional columns from a recent migration exist yet. Migrations run by hand
 * (`pnpm migrate`), so new code can be live before its columns are. Callers use this to skip
 * the new behaviour instead of failing the whole request.
 *
 * A "yes" is cached for the life of the process; a "no" is re-checked after a minute so the
 * feature turns on soon after the migration is applied, without a restart.
 */
const POSITIVE = new Map();
const NEGATIVE_UNTIL = new Map();
const NEGATIVE_TTL_MS = 60 * 1000;

async function hasColumn(table, column) {
  const key = `${table}.${column}`;
  if (POSITIVE.has(key)) return true;
  const retryAt = NEGATIVE_UNTIL.get(key);
  if (retryAt && Date.now() < retryAt) return false;
  try {
    const { rowCount } = await pool.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2
       LIMIT 1`,
      [table, column]
    );
    if (rowCount > 0) {
      POSITIVE.set(key, true);
      NEGATIVE_UNTIL.delete(key);
      return true;
    }
  } catch (err) {
    console.warn(`Schema check for ${key} failed:`, err.message);
  }
  NEGATIVE_UNTIL.set(key, Date.now() + NEGATIVE_TTL_MS);
  return false;
}

/** `accounts.suspension_source`: marks suspensions the merit engine applied. */
function autoSuspendColumnsReady() {
  return hasColumn('accounts', 'suspension_source');
}

/** `violations.points_original` (warning-lift migration). */
function warningLiftColumnsReady() {
  return hasColumn('violations', 'points_original');
}

/**
 * `merit_penalties` and `warning_thresholds.duration_days` (timed-merit-punishments migration).
 * Before it runs there is nowhere to keep a punishment's clock, so bands follow points live.
 */
function meritPenaltiesReady() {
  return hasColumn('merit_penalties', 'merit_penalty_id');
}

function thresholdDurationReady() {
  return hasColumn('warning_thresholds', 'duration_days');
}

/** `violations.team_account_id` (team-leader-warnings migration). */
function teamWarningColumnReady() {
  return hasColumn('violations', 'team_account_id');
}

/**
 * SET fragment that clears the automatic-suspension marker, or '' before the migration.
 * Prefixed with a comma so it can follow other assignments.
 */
async function clearAutoSuspendSql() {
  return (await autoSuspendColumnsReady()) ? ', suspension_source = NULL' : '';
}

module.exports = {
  hasColumn,
  autoSuspendColumnsReady,
  warningLiftColumnsReady,
  meritPenaltiesReady,
  thresholdDurationReady,
  teamWarningColumnReady,
  clearAutoSuspendSql,
};
