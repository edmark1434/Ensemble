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

// Suspended accounts may sign in and read. Every write is blocked until the
// allowed actions are chosen. Do not treat this as the final action list.
const SUSPENDED_ACTION_MESSAGE =
  'Your account is suspended. You can still sign in and look around, but you cannot perform actions right now.';

function blockMessage(normalized) {
  if (normalized === 'banned') {
    return 'This account is banned. You cannot sign in or use Ensemble.';
  }
  if (normalized === 'suspended') {
    return SUSPENDED_ACTION_MESSAGE;
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
      suspended: false,
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
      suspended: false,
      code: BLOCKING_CODES.deleted,
      message: blockMessage(normalized),
      violations,
    };
  }

  const normalized = normalizeAccountStatus(row.status);
  const suspended = normalized === 'suspended';
  const blocked = normalized === 'banned' || normalized === 'locked';
  return {
    status: displayStatus(normalized),
    blocked,
    suspended,
    code: blocked ? BLOCKING_CODES[normalized] : suspended ? BLOCKING_CODES.suspended : null,
    message: blocked || suspended ? blockMessage(normalized) : null,
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
 * Reject the request when the authenticated account is banned, locked, or deleted.
 * Suspended accounts stay signed in; the client shows a persistent notice instead.
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

const SUSPENDED_WRITE_ALLOWLIST = [
  /\/api\/users\/logout(?:\?|$)/,
  /\/api\/users\/refresh-token(?:\?|$)/,
];

function suspendedWriteAllowed(req) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  const url = String(req.originalUrl || req.url || '');
  return SUSPENDED_WRITE_ALLOWLIST.some((pattern) => pattern.test(url));
}

/**
 * Block creates, updates, and deletes for a suspended account.
 * Reads stay open. Logout and token refresh stay open so the session can continue.
 * Later, replace this blanket block with the specific actions a suspended account may perform.
 * Returns true when a response has already been sent.
 */
function rejectSuspendedWrite(req, res) {
  if (!req.accountAccess?.suspended) return false;
  if (suspendedWriteAllowed(req)) return false;
  res.status(403).json({
    success: false,
    code: 'ACCOUNT_SUSPENDED',
    message: SUSPENDED_ACTION_MESSAGE,
    restriction: req.accountAccess,
  });
  return true;
}

module.exports = {
  SUSPENDED_ACTION_MESSAGE,
  getAccountAccess,
  rejectRestrictedAccount,
  rejectSuspendedWrite,
  clearAuthSession,
};
