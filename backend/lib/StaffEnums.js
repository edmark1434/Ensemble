/**
 * staff.role — canonical Title Case labels.
 * Keep in sync with PostgreSQL enum staff_role.
 */

const STAFF_ROLES = Object.freeze([
  'Admin',
  'Support Moderator',
  'Marketplace Moderator',
  'Forum Moderator',
  'Jobs N Gigs Moderator',
]);

const STAFF_ROLE = Object.freeze({
  ADMIN: 'Admin',
  SUPPORT_MODERATOR: 'Support Moderator',
  MARKETPLACE_MODERATOR: 'Marketplace Moderator',
  FORUM_MODERATOR: 'Forum Moderator',
  JOBS_N_GIGS_MODERATOR: 'Jobs N Gigs Moderator',
});

const MODERATOR_ROLES = Object.freeze([
  STAFF_ROLE.SUPPORT_MODERATOR,
  STAFF_ROLE.MARKETPLACE_MODERATOR,
  STAFF_ROLE.FORUM_MODERATOR,
  STAFF_ROLE.JOBS_N_GIGS_MODERATOR,
]);

const ALLOWED_STAFF_ROLES = STAFF_ROLES;

const LEGACY_ROLE_MAP = Object.freeze({
  administrator: STAFF_ROLE.ADMIN,
  admin: STAFF_ROLE.ADMIN,
  'support moderator': STAFF_ROLE.SUPPORT_MODERATOR,
  support_moderator: STAFF_ROLE.SUPPORT_MODERATOR,
  'marketplace moderator': STAFF_ROLE.MARKETPLACE_MODERATOR,
  marketplace_moderator: STAFF_ROLE.MARKETPLACE_MODERATOR,
  'forum moderator': STAFF_ROLE.FORUM_MODERATOR,
  forum_moderator: STAFF_ROLE.FORUM_MODERATOR,
  'jobs n gigs moderator': STAFF_ROLE.JOBS_N_GIGS_MODERATOR,
  'jobs & gigs moderator': STAFF_ROLE.JOBS_N_GIGS_MODERATOR,
  'jobs and gigs moderator': STAFF_ROLE.JOBS_N_GIGS_MODERATOR,
  'jobs moderator': STAFF_ROLE.JOBS_N_GIGS_MODERATOR,
});

function normalizeStaffRole(value, fallback = STAFF_ROLE.SUPPORT_MODERATOR) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (STAFF_ROLES.includes(raw)) return raw;
  const exact = STAFF_ROLES.find((role) => role.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const mapped = LEGACY_ROLE_MAP[raw.toLowerCase()];
  if (mapped) return mapped;
  return fallback;
}

module.exports = {
  STAFF_ROLES,
  STAFF_ROLE,
  MODERATOR_ROLES,
  ALLOWED_STAFF_ROLES,
  LEGACY_ROLE_MAP,
  normalizeStaffRole,
};
