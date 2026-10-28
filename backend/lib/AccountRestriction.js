const { pool } = require('./Database');
const redisClient = require('./Redis');

const { bandFor, clampMerit, BASE_MERIT, ACTION_MESSAGES } = require('./Merit');

const BLOCKING_CODES = {
  banned: 'ACCOUNT_BANNED',
  suspended: 'ACCOUNT_SUSPENDED',
  locked: 'ACCOUNT_LOCKED',
  deleted: 'ACCOUNT_DELETED',
  forumTimeout: 'FORUM_TIMEOUT',
  meritFrozen: 'MERIT_FROZEN',
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

function sanctionEndsAt(options = {}, defaultMode = 'permanent') {
  const duration = String(options.duration || defaultMode).toLowerCase();
  if (duration !== 'temporary') return null;
  if (options.endsAt) {
    const date = new Date(options.endsAt);
    if (Number.isNaN(date.getTime())) {
      const error = new Error('Choose a valid end time');
      error.statusCode = 400;
      throw error;
    }
    if (date.getTime() <= Date.now()) {
      const error = new Error('The end time has to be in the future');
      error.statusCode = 400;
      throw error;
    }
    return date;
  }
  if (options.days != null && options.days !== '') return suspensionEndFromDays(options.days);
  const error = new Error('Choose how long this lasts');
  error.statusCode = 400;
  throw error;
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
  const { rowCount } = await pool.query(
    `
    UPDATE accounts
    SET status = 'Active',
        suspension_ends_at = NULL,
        ban_ends_at = NULL,
        lock_ends_at = NULL
    WHERE account_id = $1
      AND deleted_at IS NULL
      AND (
        (LOWER(status) = 'suspended' AND suspension_ends_at IS NOT NULL AND suspension_ends_at <= NOW())
        OR (LOWER(status) = 'banned' AND ban_ends_at IS NOT NULL AND ban_ends_at <= NOW())
        OR (LOWER(status) = 'locked' AND lock_ends_at IS NOT NULL AND lock_ends_at <= NOW())
      )
    `,
    [accountId]
  );
  return rowCount > 0;
}

function warningExpiry({ duration, days, expiresAt, endsAt, points } = {}) {
  const mode = String(duration || 'temporary').toLowerCase();
  if (mode === 'permanent') return null;
  return sanctionEndsAt(
    { duration: 'temporary', endsAt: endsAt || expiresAt, days: days ?? (Math.max(1, Number(points) || 1) * 30) },
    'temporary'
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
    deactivated: false,
    deactivatedAt: null,
    reactivationAvailableAt: null,
    reactivationReady: true,
    forumTimeout: false,
    meritFrozen: false,
    meritScore: BASE_MERIT,
    meritBand: 'established',
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
    const lifted = await liftExpiredSuspension(accountId);
    if (lifted) {
      const { scheduleMeritRecompute } = require('../services/MeritServices');
      scheduleMeritRecompute(accountId);
    }
  } catch (err) {
    console.warn('Could not lift an expired suspension:', err.message);
  }

  const account = await pool.query(
    `SELECT status, type, merit_score, deleted_at, suspension_ends_at, ban_ends_at, lock_ends_at, deactivated_at, reactivation_available_at FROM accounts WHERE account_id = $1`,
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
    console.warn('Could not load timeout:', err.message);
  }

  const normalized = normalizeAccountStatus(row.status);
  const member = String(row.type || '').toLowerCase() === 'user';
  const meritScore = member ? clampMerit(row.merit_score) : BASE_MERIT;
  const meritBand = bandFor(meritScore);
  const meritFrozen = member && meritBand.id === 'frozen' && normalized === 'active';
  const deactivated = normalized === 'deactivated' && member;
  const reactivationAvailableAt = row.reactivation_available_at || null;
  const reactivationReady = !deactivated
    || !reactivationAvailableAt
    || new Date(reactivationAvailableAt).getTime() <= Date.now();
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
            : meritFrozen
              ? BLOCKING_CODES.meritFrozen
              : null;

  return {
    status: displayStatus(normalized),
    blocked,
    banned,
    locked,
    suspended,
    deactivated,
    deactivatedAt: deactivated ? row.deactivated_at || null : null,
    reactivationAvailableAt: deactivated ? reactivationAvailableAt : null,
    reactivationReady,
    forumTimeout,
    meritFrozen,
    meritScore,
    meritBand: meritBand.id,
    suspensionEndsAt: row.suspension_ends_at || null,
    forumTimeoutEndsAt,
    code,
    message: blocked || banned || locked || suspended
      ? blockMessage(normalized, { member, suspensionEndsAt: row.suspension_ends_at })
      : forumTimeout
        ? forumTimeoutMessage(forumTimeoutEndsAt)
        : meritFrozen
          ? ACTION_MESSAGES.forum_write
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

const FORUM_TIMEOUT_MATCH = `
  (
    LOWER(r.type) IN ('forum_timeout', 'timeout')
    OR (LOWER(COALESCE(r.module, '')) = 'forum' AND LOWER(r.type) LIKE '%timeout%')
  )
  AND r.starts_at <= NOW()
  AND (r.ends_at IS NULL OR r.ends_at > NOW())
`;

function publicStandingFromRow(row, banNotice = null) {
  if (!row) return null;
  const status = row.status || 'Active';
  const normalized = normalizeAccountStatus(status);
  const endsAt = normalized === 'banned'
    ? row.ban_ends_at
    : normalized === 'suspended'
      ? row.suspension_ends_at
      : normalized === 'locked'
        ? row.lock_ends_at
        : null;
  const notice = normalized === 'banned' ? banNotice : null;
  return {
    status,
    endsAt: endsAt || null,
    forumTimeout: Boolean(row.forum_timeout),
    forumTimeoutEndsAt: row.timeout_ends_at || null,
    banReason: notice?.banReason || null,
    banDispute: notice?.banDispute || null,
    underDispute: Boolean(row.under_dispute),
    underDisputeId: row.open_dispute_id || null,
    underDisputeNumber: row.open_dispute_number || null,
  };
}

async function loadBanNotice(accountId) {
  const result = await pool.query(
    `
    SELECT metadata
    FROM account_activity
    WHERE account_id = $1
      AND event_code = 'ACCOUNT_STATUS_CHANGED'
      AND (
        LOWER(COALESCE(metadata->>'status', '')) = 'banned'
        OR LOWER(COALESCE(metadata->>'action', '')) = 'ban'
      )
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [accountId]
  );
  const metadata = result.rows[0]?.metadata || null;
  if (!metadata || typeof metadata !== 'object') {
    return { banReason: null, banDispute: null };
  }
  const disputeId = metadata.disputeId ? String(metadata.disputeId) : '';
  return {
    banReason: metadata.reason ? String(metadata.reason) : null,
    banDispute: disputeId
      ? { id: disputeId, number: metadata.disputeNumber ? String(metadata.disputeNumber) : null }
      : null,
  };
}

async function getPublicAccountStanding(accountId) {
  const result = await pool.query(
    `
    SELECT
      a.status,
      a.suspension_ends_at,
      a.ban_ends_at,
      a.lock_ends_at,
      EXISTS (
        SELECT 1 FROM restrictions r
        WHERE r.account_id = a.account_id AND ${FORUM_TIMEOUT_MATCH}
      ) AS forum_timeout,
      (
        SELECT r.ends_at
        FROM restrictions r
        WHERE r.account_id = a.account_id AND ${FORUM_TIMEOUT_MATCH}
        ORDER BY r.created_at DESC
        LIMIT 1
      ) AS timeout_ends_at,
      open_dispute.dispute_id AS open_dispute_id,
      open_dispute.dispute_number AS open_dispute_number,
      (open_dispute.dispute_id IS NOT NULL) AS under_dispute
    FROM accounts a
    LEFT JOIN LATERAL (
      SELECT d.dispute_id, d.dispute_number
      FROM disputes d
      WHERE d.for_account_id = a.account_id
        AND d.deleted_at IS NULL
        AND d.visibility IS TRUE
        AND lower(COALESCE(d.status, '')) <> 'closed'
      ORDER BY d.opened_at DESC NULLS LAST, d.created_at DESC
      LIMIT 1
    ) open_dispute ON true
    WHERE a.account_id = $1
    `,
    [accountId]
  );
  const row = result.rows[0];
  if (!row) return null;
  const banned = normalizeAccountStatus(row.status) === 'banned';
  const banNotice = banned ? await loadBanNotice(accountId) : null;
  return publicStandingFromRow(row, banNotice);
}

async function getOwnAccountRecord(accountId) {
  const standing = await getPublicAccountStanding(accountId);
  const [warnings, restrictions, activity] = await Promise.all([
    pool.query(
      `
      SELECT violation_id, violation_number, type, reason, points, status, created_at, expires_at
      FROM violations
      WHERE account_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 40
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT restriction_id, type, module, starts_at, ends_at, created_at
      FROM restrictions
      WHERE account_id = $1
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT action, event_code, created_at, metadata
      FROM account_activity
      WHERE account_id = $1
        AND (
          event_code IN (
            'ACCOUNT_STATUS_CHANGED',
            'FORUM_TIMEOUT',
            'VIOLATION_ISSUED',
            'WARNING_ISSUED',
            'WARNING_RESCINDED'
          )
          OR event_code LIKE '%TIMEOUT%'
          OR event_code LIKE '%RESTRICTION%'
        )
      ORDER BY created_at DESC
      LIMIT 30
      `,
      [accountId]
    ),
  ]);

  return {
    ...(standing || { status: 'Active', endsAt: null, forumTimeout: false, forumTimeoutEndsAt: null }),
    warnings: warnings.rows.map((row) => ({
      id: row.violation_id,
      number: row.violation_number,
      type: row.type,
      reason: row.reason,
      points: row.points,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    })),
    restrictions: restrictions.rows.map((row) => ({
      id: row.restriction_id,
      type: row.type,
      module: row.module,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      createdAt: row.created_at,
    })),
    activity: activity.rows.map((row) => ({
      action: row.action,
      eventCode: row.event_code,
      createdAt: row.created_at,
      endsAt: row.metadata?.expiresAt || row.metadata?.endsAt || null,
    })),
  };
}

const BANNED_READ_ALLOWLIST = [
  /^\/api\/csrf-token$/,
  /^\/api\/users\/me$/,
  /^\/api\/users\/me\/standing$/,
  /^\/api\/users\/session$/,
  /^\/api\/users\/check-user-role$/,
  /^\/api\/users\/ticket-catalog$/,
  /^\/api\/users\/ticket-context$/,
  /^\/api\/users\/tickets$/,
  /^\/api\/users\/tickets\/[^/]+$/,
  /^\/api\/users\/disputes$/,
  /^\/api\/users\/disputes\/[^/]+$/,
  /^\/api\/accounts\/disputes\/[^/]+$/,
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

const DEACTIVATED_READ_ALLOWLIST = [
  /^\/api\/csrf-token$/,
  /^\/api\/users\/me$/,
  /^\/api\/users\/session$/,
  /^\/api\/accounts\/deactivation$/,
];

const DEACTIVATED_WRITE_ALLOWLIST = [
  /^\/api\/users\/logout$/,
  /^\/api\/users\/refresh-token$/,
  /^\/api\/accounts\/reactivate$/,
];

function deactivatedRequestAllowed(req) {
  const method = String(req.method || 'GET').toUpperCase();
  const path = requestPath(req);
  if (method === 'HEAD' || method === 'OPTIONS' || method === 'GET') {
    return DEACTIVATED_READ_ALLOWLIST.some((pattern) => pattern.test(path));
  }
  if (method === 'POST') return DEACTIVATED_WRITE_ALLOWLIST.some((pattern) => pattern.test(path));
  return false;
}

function rejectDeactivatedAccount(req, res) {
  if (!req.accountAccess?.deactivated || deactivatedRequestAllowed(req)) return false;
  res.status(403).json({
    success: false,
    code: 'ACCOUNT_DEACTIVATED',
    message: 'This account is deactivated. Reactivation unlocks 72 hours after you turn it off.',
    restriction: req.accountAccess,
  });
  return true;
}

/**
 * Deleted accounts, and locked or banned staff and team accounts, lose the session.
 * Banned and locked members stay signed in and may only use the appeal allowlist.
 * Returns true when a response has already been sent.
 */
async function rejectRestrictedAccount(req, res) {
  if (req.accountAccessChecked) {
    if (rejectDeactivatedAccount(req, res)) return true;
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

  if (rejectDeactivatedAccount(req, res)) return true;

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
 * A timeout blocks every forum write: posts, comments, reactions, membership, and reports.
 * Reading the forums stays open.
 */
function rejectForumTimeout(req, res) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  if (!requestPath(req).startsWith('/api/forum')) return false;
  if (req.accountAccess?.forumTimeout) {
    res.status(403).json({
      success: false,
      code: BLOCKING_CODES.forumTimeout,
      message: req.accountAccess.message || FORUM_TIMEOUT_MESSAGE,
      restriction: req.accountAccess,
    });
    return true;
  }
  if (req.accountAccess?.meritFrozen) {
    res.status(403).json({
      success: false,
      code: BLOCKING_CODES.meritFrozen,
      message: ACTION_MESSAGES.forum_write,
      restriction: req.accountAccess,
    });
    return true;
  }
  return false;
}

module.exports = {
  APPEAL_TICKET_TYPE,
  BANNED_ACTION_MESSAGE,
  SUSPENDED_ACTION_MESSAGE,
  FORUM_TIMEOUT_MESSAGE,
  DEFAULT_SUSPENSION_DAYS,
  getAccountAccess,
  getPublicAccountStanding,
  getOwnAccountRecord,
  rejectRestrictedAccount,
  rejectSuspendedWrite,
  rejectForumTimeout,
  clearAuthSession,
  suspensionEndFromDays,
  timeoutEndFromDays,
  sanctionEndsAt,
  warningExpiry,
};
