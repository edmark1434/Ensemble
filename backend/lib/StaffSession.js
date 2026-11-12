const { pool } = require('./Database');

/**
 * Resolves the staff row behind a session so a moderation action can name a
 * real actor in `account_activity`.
 *
 * Sessions carry a staff id on the admin console and only an account id on the
 * moderator desks, so both are tried. Returns null when the caller is not
 * staff; callers treat that as "no actor recorded" rather than an error.
 *
 * @param session {object} the Express session
 * @returns {Promise<{ staff_id: string, account_id: string, role: string } | null>}
 */
async function resolveStaffForSession(session) {
  if (!session) return null;

  const staffId = session.staffId || session.staff_id || null;
  if (staffId) {
    const byId = await pool.query(
      `SELECT staff_id, account_id, role FROM staff WHERE staff_id::text = $1 LIMIT 1`,
      [String(staffId)]
    );
    if (byId.rows.length) return byId.rows[0];
  }

  const accountId = session.account_id || session.accountId || null;
  if (!accountId) return null;
  const byAccount = await pool.query(
    `SELECT staff_id, account_id, role FROM staff WHERE account_id::text = $1 LIMIT 1`,
    [String(accountId)]
  );
  return byAccount.rows[0] || null;
}

module.exports = { resolveStaffForSession };
