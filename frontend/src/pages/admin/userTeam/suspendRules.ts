/** Keep in sync with backend/lib/StaffEnums.js */
const STAFF_ROLES = new Set([
  'Admin',
  'Support Moderator',
  'Marketplace Moderator',
  'Forum Moderator',
  'Jobs N Gigs Moderator',
]);

export function canSuspendTarget({
  actorRole,
  actorAccountId,
  targetAccountId,
  targetStaffRole,
}: {
  actorRole?: string | null;
  actorAccountId?: string | null;
  targetAccountId?: string | null;
  targetStaffRole?: string | null;
}) {
  if (
    actorAccountId &&
    targetAccountId &&
    String(actorAccountId) === String(targetAccountId)
  ) {
    return false;
  }
  const role = String(targetStaffRole || '').trim();
  if (!role || !STAFF_ROLES.has(role)) return true;
  return String(actorRole || '') === 'Admin';
}
