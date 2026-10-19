const { pool } = require('./Database');
const redisClient = require('./Redis');

const BLOCKING_CODES = {
  banned: 'ACCOUNT_BANNED',
  suspended: 'ACCOUNT_SUSPENDED',
  locked: 'ACCOUNT_LOCKED',
  deleted: 'ACCOUNT_DELETED',
  forumTimeout: 'FORUM_TIMEOUT',
};

const APPEAL_TICKET_TYPE = 'Appeal an account penalty';
const DEFAULT_SUSPENSION_DAYS = 7;

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

function formatWhen(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

const BANNED_ACTION_MESSAGE =
  'Your account is banned. You can sign in only to file an appeal and view your tickets and disputes.';

const LOCKED_MEMBER_MESSAGE =
  'Your account is locked. You can sign in only to file an appeal and view your tickets and disputes.';

const LOCKED_BLOCKED_MESSAGE =
  'This account is locked. You cannot sign in until an administrator unlocks it.';

const SUSPENDED_ACTION_MESSAGE =
  'Your account is suspended. You can look around Ensemble. Actions stay off until this ends.';

const FORUM_TIMEOUT_MESSAGE =
  'You are timed out from the forums. You can read them, and you cannot post, comment, react, or change them.';

function suspendedMessage(endsAt) {
  const when = formatWhen(endsAt);
  if (!when) return SUSPENDED_ACTION_MESSAGE;
  return `Your account is suspended until ${when}. You can look around Ensemble. Actions stay off until then.`;
}

function forumTimeoutMessage(endsAt) {
  const when = formatWhen(endsAt);
  if (!when) return FORUM_TIMEOUT_MESSAGE;
  return `You are timed out from the forums until ${when}. You can read them, and you cannot post, comment, react, or change them.`;
}

function blockMessage(normalized, extras = {}) {
  if (normalized === 'banned') return BANNED_ACTION_MESSAGE;
  if (normalized === 'suspended') return suspendedMessage(extras.suspensionEndsAt);
  if (normalized === 'locked') {
    return extras.member ? LOCKED_MEMBER_MESSAGE : LOCKED_BLOCKED_MESSAGE;
  }
  if (normalized === 'deleted') return 'This account is no longer available.';
  return 'This account cannot use Ensemble right now.';
}

function cookieClearOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  };
}

function suspensionEndFromDays(days) {
  const parsed = Number(days);
  const chosen = Number.isFinite(parsed) && parsed > 0
    ? Math.min(Math.floor(parsed), 365)
    : DEFAULT_SUSPENSION_DAYS;
  return new Date(Date.now() + chosen * 24 * 60 * 60 * 1000);
}

function timeoutEndFromDays(days) {
  if (days == null || days === '') return null;
  const parsed = Number(days);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const chosen = Math.min(Math.floor(parsed), 365);
  return new Date(Date.now() + chosen * 24 * 60 * 60 * 1000);
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

async function liftExpiredSuspension(accountId) {
  await pool.query(
    `
    UPDATE accounts
    SET status = 'Active', suspension_ends_at = NULL
    WHERE account_id = $1
      AND deleted_at IS NULL
      AND LOWER(status) = 'suspended'
      AND suspension_ends_at IS NOT NULL
      AND suspension_ends_at <= NOW()
    `,
    [accountId]
  );
}

async function activeForumTimeout(accountId) {
  const result = await pool.query(
    `
    SELECT ends_at
    FROM restrictions
    WHERE account_id = $1
      AND (
        LOWER(type) IN ('forum_timeout', 'timeout')
        OR (LOWER(COALESCE(module, '')) = 'forum' AND LOWER(type) LIKE '%timeout%')
      )
      AND starts_at <= NOW()
      AND (ends_at IS NULL OR ends_at > NOW())
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [accountId]
  );
  return result.rows[0]?.ends_at || (result.rows.length ? null : undefined);
}

function emptyAccess() {
  return {
    status: 'Active',
    blocked: false,
    banned: false,
    locked: false,
    suspended: false,
    forumTimeout: false,
    suspensionEndsAt: null,
    forumTimeoutEndsAt: null,
    code: null,
    message: null,
    violations: [],
  };
}

/**
 * Live standing for an account.
 * Deleted accounts cannot sign in.
 * Banned and locked member accounts can sign in for an appeal, tickets, and disputes.
 * Locked staff and team accounts cannot sign in.
 * Suspended accounts can read the platform until suspension_ends_at.
 */
async function getAccountAccess(accountId) {
  if (!accountId) return emptyAccess();

  try {
    await liftExpiredSuspension(accountId);
  } catch (err) {
    console.warn('Could not lift an expired suspension:', err.message);
  }

  const account = await pool.query(
    `SELECT status, type, deleted_at, suspension_ends_at FROM accounts WHERE account_id = $1`,
    [accountId]
  );
  const row = account.rows[0];
  const violations = row ? await listActiveViolations(accountId) : [];

  if (!row || row.deleted_at) {
    const normalized = 'deleted';
    return {
      ...emptyAccess(),
      status: displayStatus(normalized),
      blocked: true,
      code: BLOCKING_CODES.deleted,
      message: blockMessage(normalized),
      violations,
    };
  }

  let forumTimeout = false;
  let forumTimeoutEndsAt = null;
  try {
    const timeoutEnd = await activeForumTimeout(accountId);
    if (timeoutEnd !== undefined) {
      forumTimeout = true;
      forumTimeoutEndsAt = timeoutEnd;
    }
  } catch (err) {
    console.warn('Could not load forum timeout:', err.message);
  }

  const normalized = normalizeAccountStatus(row.status);
  const member = String(row.type || '').toLowerCase() === 'user';
  const suspended = normalized === 'suspended';
  const banned = normalized === 'banned' && member;
  const locked = normalized === 'locked' && member;
  const blocked = (normalized === 'locked' && !member) || (normalized === 'banned' && !member);
  const code = blocked
    ? BLOCKING_CODES[normalized] || BLOCKING_CODES.locked
    : locked
      ? BLOCKING_CODES.locked
      : banned
        ? BLOCKING_CODES.banned
        : suspended
          ? BLOCKING_CODES.suspended
          : forumTimeout
            ? BLOCKING_CODES.forumTimeout
            : null;

  return {
    status: displayStatus(normalized),
    blocked,
    banned,
    locked,
    suspended,
    forumTimeout,
    suspensionEndsAt: row.suspension_ends_at || null,
    forumTimeoutEndsAt,
    code,
    message: blocked || banned || locked || suspended
      ? blockMessage(normalized, { member, suspensionEndsAt: row.suspension_ends_at })
      : forumTimeout
        ? forumTimeoutMessage(forumTimeoutEndsAt)
        : null,
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

function requestPath(req) {
  return String(req.originalUrl || req.url || '').split('?')[0];
}

const BANNED_READ_ALLOWLIST = [
  /^\/api\/users\/me$/,
  /^\/api\/users\/session$/,
  /^\/api\/users\/check-user-role$/,
  /^\/api\/users\/ticket-catalog$/,
  /^\/api\/users\/ticket-context$/,
  /^\/api\/users\/tickets$/,
  /^\/api\/users\/tickets\/[^/]+$/,
  /^\/api\/users\/disputes$/,
  /^\/api\/users\/disputes\/[^/]+$/,
];

const BANNED_WRITE_ALLOWLIST = [
  /^\/api\/users\/logout$/,
  /^\/api\/users\/refresh-token$/,
  /^\/api\/users\/tickets$/,
  /^\/api\/users\/tickets\/[^/]+\/messages$/,
];

function appealRequestAllowed(req) {
  const method = String(req.method || 'GET').toUpperCase();
  const path = requestPath(req);
  if (method === 'HEAD' || method === 'OPTIONS') {
    return BANNED_READ_ALLOWLIST.some((pattern) => pattern.test(path));
  }
  if (method === 'GET') return BANNED_READ_ALLOWLIST.some((pattern) => pattern.test(path));
  if (method === 'POST') return BANNED_WRITE_ALLOWLIST.some((pattern) => pattern.test(path));
  return false;
}

function appealLimited(access) {
  return Boolean(access?.banned || access?.locked);
}

/**
 * Deleted accounts, and locked or banned staff and team accounts, lose the session.
 * Banned and locked members stay signed in and may only use the appeal allowlist.
 * Returns true when a response has already been sent.
 */
async function rejectRestrictedAccount(req, res) {
  if (req.accountAccessChecked) {
    if (appealLimited(req.accountAccess) && !appealRequestAllowed(req)) {
      res.status(403).json({
        success: false,
        code: req.accountAccess.code || BLOCKING_CODES.banned,
        message: req.accountAccess.message || BANNED_ACTION_MESSAGE,
        restriction: req.accountAccess,
      });
      return true;
    }
    return false;
  }

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

  if (access.blocked) {
    await clearAuthSession(req, res);
    res.status(403).json({
      success: false,
      code: access.code,
      message: access.message,
      restriction: access,
    });
    return true;
  }

  if (appealLimited(access) && !appealRequestAllowed(req)) {
    res.status(403).json({
      success: false,
      code: access.code,
      message: access.message,
      restriction: access,
    });
    return true;
  }

  return false;
}

const SUSPENDED_WRITE_ALLOWLIST = [
  /\/api\/users\/logout(?:\?|$)/,
  /\/api\/users\/refresh-token(?:\?|$)/,
  /\/api\/notifications\/read-all(?:\?|$)/,
  /\/api\/notifications\/[^/]+\/read(?:\?|$)/,
];

function suspendedWriteAllowed(req) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  const url = String(req.originalUrl || req.url || '');
  return SUSPENDED_WRITE_ALLOWLIST.some((pattern) => pattern.test(url));
}

/**
 * Suspended accounts can read the whole platform. Creates, updates, and deletes stay off.
 * Returns true when a response has already been sent.
 */
function rejectSuspendedWrite(req, res) {
  if (!req.accountAccess?.suspended) return false;
  if (suspendedWriteAllowed(req)) return false;
  res.status(403).json({
    success: false,
    code: BLOCKING_CODES.suspended,
    message: req.accountAccess.message || SUSPENDED_ACTION_MESSAGE,
    restriction: req.accountAccess,
  });
  return true;
}

/**
 * A forum timeout blocks every forum write: posts, comments, reactions, membership, and reports.
 * Reading the forums stays open.
 */
function rejectForumTimeout(req, res) {
  if (!req.accountAccess?.forumTimeout) return false;
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  if (!requestPath(req).startsWith('/api/forum')) return false;
  res.status(403).json({
    success: false,
    code: BLOCKING_CODES.forumTimeout,
    message: req.accountAccess.message || FORUM_TIMEOUT_MESSAGE,
    restriction: req.accountAccess,
  });
  return true;
}

module.exports = {
  APPEAL_TICKET_TYPE,
  BANNED_ACTION_MESSAGE,
  SUSPENDED_ACTION_MESSAGE,
  FORUM_TIMEOUT_MESSAGE,
  DEFAULT_SUSPENSION_DAYS,
  getAccountAccess,
  rejectRestrictedAccount,
  rejectSuspendedWrite,
  rejectForumTimeout,
  clearAuthSession,
  suspensionEndFromDays,
  timeoutEndFromDays,
};
