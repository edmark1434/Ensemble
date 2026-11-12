const { pool } = require('./Database');
const { STAFF_ROLE, MODERATOR_ROLES } = require('./StaffEnums');

function forbid(message) {
  const error = new Error(message);
  error.statusCode = 403;
  error.status = 403;
  return error;
}

async function loadStaffById(staffId) {
  if (!staffId) return null;
  const result = await pool.query(
    `SELECT staff_id, account_id, role FROM staff WHERE staff_id::text = $1 LIMIT 1`,
    [String(staffId)]
  );
  return result.rows[0] || null;
}

async function loadStaffByAccount(accountId) {
  if (!accountId) return null;
  const result = await pool.query(
    `SELECT staff_id, account_id, role FROM staff WHERE account_id::text = $1 LIMIT 1`,
    [String(accountId)]
  );
  return result.rows[0] || null;
}

/**
 * An admin cannot suspend their own account.
 * A moderator cannot suspend another moderator or an admin. Only Admin can.
 */
async function assertCanSuspendTarget({
  actorStaffId = null,
  actorAccountId = null,
  targetAccountId = null,
  targetStaffId = null,
} = {}) {
  const actor = actorStaffId
    ? await loadStaffById(actorStaffId)
    : await loadStaffByAccount(actorAccountId);
  const target = targetAccountId
    ? await loadStaffByAccount(targetAccountId)
    : await loadStaffById(targetStaffId);

  const actorAccount = actor?.account_id || actorAccountId || null;
  const resolvedTargetAccount = target?.account_id || targetAccountId || null;
  const sameAccount =
    actorAccount &&
    resolvedTargetAccount &&
    String(actorAccount) === String(resolvedTargetAccount);
  const sameStaff =
    actor?.staff_id &&
    target?.staff_id &&
    String(actor.staff_id) === String(target.staff_id);

  if (sameAccount || sameStaff) {
    throw forbid('You cannot suspend your own account');
  }

  if (!target) return;

  if (String(actor?.role || '') === STAFF_ROLE.ADMIN) return;

  const targetRole = String(target.role || '');
  if (MODERATOR_ROLES.includes(targetRole)) {
    throw forbid('Only an admin can suspend a moderator');
  }
  throw forbid('Only an admin can suspend this staff account');
}

module.exports = { assertCanSuspendTarget };
