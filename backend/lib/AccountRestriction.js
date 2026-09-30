const { pool } = require('./Database');
const redisClient = require('./Redis');

const BLOCKING_CODES = {
  banned: 'ACCOUNT_BANNED',
  suspended: 'ACCOUNT_SUSPENDED',
  locked: 'ACCOUNT_LOCKED',
  deleted: 'ACCOUNT_DELETED',
};

function normalizeAccountStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (!value || value === 'active') return 'active';
  if (value.includes('ban')) return 'banned';
  if (value.includes('suspend')) return 'suspended';
  if (value.includes('lock')) return 'locked';
  return value;
}

function displayStatus(normalized) {
  if (normalized === 'banned') return 'Banned';
  if (normalized === 'suspended') return 'Suspended';
  if (normalized === 'locked') return 'Locked';
  if (normalized === 'deleted') return 'Deleted';
  if (normalized === 'active') return 'Active';
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Active';
}

function blockMessage(normalized) {
  if (normalized === 'banned') {
    return 'This account is banned. You cannot sign in or use Ensemble.';
  }
  if (normalized === 'suspended') {
    return 'This account is suspended. You cannot sign in or use Ensemble until it is unsuspended.';
  }
  if (normalized === 'locked') {
    return 'This account is locked. You cannot sign in until an administrator unlocks it.';
  }
  if (normalized === 'deleted') {
    return 'This account is no longer available.';
  }
  return 'This account cannot use Ensemble right now.';
}

function cookieClearOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  };
}

async function listActiveViolations(accountId) {
  const result = await pool.query(
    `
    SELECT type, reason, points, created_at
    FROM violations
    WHERE account_id = $1
      AND deleted_at IS NULL
      AND LOWER(COALESCE(status, 'active')) IN ('active', 'open', 'pending')
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
    LIMIT 8
    `,
    [accountId]
  );
  return result.rows.map((row) => ({
    type: row.type,
    reason: row.reason || null,
    points: Number(row.points || 0),
    createdAt: row.created_at,
  }));
}

/**
 * Live standing for an account. Blocked accounts cannot sign in or keep a session.
 */
async function getAccountAccess(accountId) {
  if (!accountId) {
    return {
      status: 'Active',
      blocked: false,
      code: null,
      message: null,
      violations: [],
    };
  }

  const account = await pool.query(
    `SELECT status, deleted_at FROM accounts WHERE account_id = $1`,
    [accountId]
  );
  const row = account.rows[0];
  const violations = row ? await listActiveViolations(accountId) : [];

  if (!row || row.deleted_at) {
    const normalized = 'deleted';
    return {
      status: displayStatus(normalized),
      blocked: true,
      code: BLOCKING_CODES.deleted,
      message: blockMessage(normalized),
      violations,
    };
  }

  const normalized = normalizeAccountStatus(row.status);
  const blocked = normalized === 'banned' || normalized === 'suspended' || normalized === 'locked';
  return {
    status: displayStatus(normalized),
    blocked,
    code: blocked ? BLOCKING_CODES[normalized] : null,
    message: blocked ? blockMessage(normalized) : null,
    violations,
  };
}

async function clearAuthSession(req, res) {
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    await redisClient.del(`session:${sessionId}`).catch(() => {});
  }
  const options = cookieClearOptions();
  res.clearCookie('sessionId', options);
  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);
}

/**
 * Reject the request when the authenticated account is banned, suspended, locked, or deleted.
 * Returns true when a response has already been sent.
 */
async function rejectRestrictedAccount(req, res) {
  if (req.accountAccessChecked) return false;
  const accountId =
    req.session?.account_id ||
    req.session?.accountId ||
    req.user?.account_id ||
    req.user?.accountId ||
    null;
  if (!accountId) {
    req.accountAccessChecked = true;
    return false;
  }

  const access = await getAccountAccess(accountId);
  req.accountAccess = access;
  req.accountAccessChecked = true;
  if (!access.blocked) return false;

  await clearAuthSession(req, res);
  res.status(403).json({
    success: false,
    code: access.code,
    message: access.message,
    restriction: access,
  });
  return true;
}

module.exports = {
  getAccountAccess,
  rejectRestrictedAccount,
  clearAuthSession,
};
