/**
 * Which staff desk may work a ticket. Each check mirrors that desk's ticket list query, so a
 * ticket a moderator cannot see in their queue cannot be reached by id either.
 */
const { FORUM_TYPES, MARKETPLACE_TYPES, JOBS_TYPES, normalizeTicketType } = require('./TicketEnums');

function isAdminRoleName(role) {
  const r = String(role || '').toLowerCase().trim();
  return r === 'admin' || r === 'administrator';
}

/** The desk a staff role works, or null for roles this module does not restrict. */
function staffRoleQueue(role) {
  const r = String(role || '').toLowerCase().trim();
  if (isAdminRoleName(r)) return 'admin';
  if (r.includes('marketplace')) return 'marketplace';
  if (r.includes('forum')) return 'forum';
  if (r.includes('jobs')) return 'jobs';
  return null;
}

/** Escalated to Admin, or handled by an Admin. */
function isAdminOwned({ escalatedToRole, handlerRole } = {}) {
  return isAdminRoleName(escalatedToRole) || isAdminRoleName(handlerRole);
}

/**
 * `facts` = { type, escalatedToRole, handlerRole }. Support and unrestricted roles keep their
 * existing behaviour (Support has its own scope checks in its controllers).
 */
function ticketInStaffQueue(role, facts = {}) {
  const queue = staffRoleQueue(role);
  if (!queue || queue === 'admin') return true;
  const type = normalizeTicketType(facts.type, null);
  if (!type) return false;
  if (queue === 'marketplace') return MARKETPLACE_TYPES.includes(type) && !isAdminOwned(facts);
  if (queue === 'forum') return FORUM_TYPES.includes(type);
  if (queue === 'jobs') return JOBS_TYPES.includes(type);
  return true;
}

/** Ticket types a specialist desk may open for a member. Null means any type. */
function creatableTypesForRole(role) {
  const queue = staffRoleQueue(role);
  if (queue === 'marketplace') return [...MARKETPLACE_TYPES];
  if (queue === 'forum') return [...FORUM_TYPES];
  if (queue === 'jobs') return [...JOBS_TYPES];
  return null;
}

module.exports = {
  staffRoleQueue,
  isAdminOwned,
  ticketInStaffQueue,
  creatableTypesForRole,
};
