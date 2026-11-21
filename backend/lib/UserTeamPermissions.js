/**
 * User & Team capability matrix by staff role.
 * Forum + Marketplace + Jobs & Gigs: view users/teams; warn / suspend / lock only.
 * Admin + Support: full toolkit (ban, credits, verification, pardons).
 */

const FULL_STATUS_ACTIONS = [
  'ban',
  'unban',
  'suspend',
  'unsuspend',
  'lock',
  'unlock',
  'restore',
  'timeout',
  'clear_timeout',
];

const LIMITED_STATUS_ACTIONS = ['suspend', 'unsuspend', 'lock', 'unlock'];
const FORUM_TIMEOUT_ACTIONS = ['timeout', 'clear_timeout'];

function roleOf(session) {
  return String(session?.role || '');
}

function isAdminOrSupport(session) {
  const role = roleOf(session);
  return role === 'Admin' || role === 'Support Moderator';
}

function isForumModerator(session) {
  return roleOf(session) === 'Forum Moderator';
}

function isMarketplaceModerator(session) {
  return roleOf(session) === 'Marketplace Moderator';
}

function isJobsModerator(session) {
  const role = roleOf(session);
  return role === 'Jobs N Gigs Moderator' || role === 'Jobs Moderator' || role === 'Jobs & Gigs Moderator';
}

function isLimitedEnforcer(session) {
  return isForumModerator(session) || isMarketplaceModerator(session) || isJobsModerator(session);
}

function canAccessUserTeam(session) {
  const role = roleOf(session);
  return (
    role === 'Admin' ||
    role === 'Support Moderator' ||
    role === 'Forum Moderator' ||
    role === 'Marketplace Moderator' ||
    isJobsModerator(session)
  );
}

/** Full team management (credits/verification/ban). Listing teams uses canAccessUserTeam. */
function canManageTeams(session) {
  return isAdminOrSupport(session);
}

function canManageCredits(session) {
  return isAdminOrSupport(session);
}

function canManageVerification(session) {
  return isAdminOrSupport(session);
}

function canPardon(session) {
  return isAdminOrSupport(session);
}

function canWarn(session) {
  return canAccessUserTeam(session);
}

function allowedStatusActions(session) {
  if (isAdminOrSupport(session)) return [...FULL_STATUS_ACTIONS];
  if (isForumModerator(session)) return [...LIMITED_STATUS_ACTIONS, ...FORUM_TIMEOUT_ACTIONS];
  if (isLimitedEnforcer(session)) return [...LIMITED_STATUS_ACTIONS];
  return [];
}

function assertStatusActionAllowed(session, action) {
  const allowed = allowedStatusActions(session);
  const normalized = String(action || '')
    .trim()
    .toLowerCase();
  if (!allowed.includes(normalized)) {
    const err = new Error(
      `Your role cannot perform account action "${normalized}". Specialist moderators may only warn, suspend/unsuspend, and lock/unlock.`
    );
    err.statusCode = 403;
    throw err;
  }
}

/** Desk key a staff session works from (same keys as `warning_defs.desks` / `punishment_defs.desks`). */
function deskForSession(session) {
  const role = roleOf(session);
  if (role === 'Admin') return 'admin';
  if (role === 'Support Moderator') return 'support';
  if (isForumModerator(session)) return 'forum';
  if (isMarketplaceModerator(session)) return 'marketplace';
  if (isJobsModerator(session)) return 'jobs';
  return null;
}

/**
 * Desk whose catalog rows a session may list. Admin and Support may look at any desk's list;
 * a specialist always gets their own, whatever `?desk=` says, so pickers never offer rows the
 * issue path would refuse.
 */
function catalogDeskFor(session, requested) {
  const own = deskForSession(session);
  if (own === 'admin' || own === 'support') return String(requested || 'admin');
  return own || 'admin';
}

function assertFullWrite(session, featureLabel) {
  if (!isAdminOrSupport(session)) {
    const err = new Error(
      `Your role cannot manage ${featureLabel}. Ask Support or Admin.`
    );
    err.statusCode = 403;
    throw err;
  }
}

module.exports = {
  FULL_STATUS_ACTIONS,
  LIMITED_STATUS_ACTIONS,
  FORUM_STATUS_ACTIONS: LIMITED_STATUS_ACTIONS,
  canAccessUserTeam,
  canManageTeams,
  canManageCredits,
  canManageVerification,
  canPardon,
  canWarn,
  allowedStatusActions,
  assertStatusActionAllowed,
  assertFullWrite,
  deskForSession,
  catalogDeskFor,
  isAdminOrSupport,
  isForumModerator,
  isMarketplaceModerator,
  isJobsModerator,
  isLimitedEnforcer,
};
