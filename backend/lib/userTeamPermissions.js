/**
 * User & Team capability matrix by staff role.
 * Forum + Marketplace: enforce from reports only (warn / suspend / lock + view).
 * Admin + Support: full toolkit.
 */

const FULL_STATUS_ACTIONS = [
  'ban',
  'unban',
  'suspend',
  'unsuspend',
  'lock',
  'unlock',
  'restore',
];

const LIMITED_STATUS_ACTIONS = ['suspend', 'unsuspend', 'lock', 'unlock'];

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

function isLimitedEnforcer(session) {
  return isForumModerator(session) || isMarketplaceModerator(session);
}

function canAccessUserTeam(session) {
  const role = roleOf(session);
  return (
    role === 'Admin' ||
    role === 'Support Moderator' ||
    role === 'Forum Moderator' ||
    role === 'Marketplace Moderator'
  );
}

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
  isAdminOrSupport,
  isForumModerator,
  isMarketplaceModerator,
  isLimitedEnforcer,
};
