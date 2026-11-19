const {
  fetchAccountBase,
  fetchAccountWorkStats,
  fetchAccountCreditTotals,
  fetchUserProjectStats,
  fetchTeamProfile,
  fetchLastActivityForAccounts,
  fetchForumStatsForMember,
} = require('../repositories/AdminAccountProfileRepositories');
const { getAccountAccess } = require('../lib/AccountRestriction');

function notFound() {
  const err = new Error('Account not found');
  err.statusCode = 404;
  return err;
}

/** Current standing as staff need it: status, end dates, timeout, warning band and credit hold. */
function standingFromAccess(access, base) {
  return {
    status: access.status,
    message: access.message || null,
    suspensionEndsAt: access.suspended ? access.suspensionEndsAt : null,
    banEndsAt: access.banEndsAt,
    lockEndsAt: access.lockEndsAt,
    forumTimeout: access.forumTimeout,
    forumTimeoutEndsAt: access.forumTimeoutEndsAt,
    warningPoints: access.warningPoints,
    warningBand: access.warningBand,
    warningBandLabel: access.warningBandLabel,
    warningBandEndsAt: access.warningBandEndsAt,
    muted: Boolean(access.muted),
    mutedUntil: access.mutedUntil || null,
    meritPenalties: access.meritPenalties || [],
    merit: access.merit,
    creditsFrozen: access.creditsFrozen,
    frozenCredits: access.frozenCredits,
    creditsFrozenAt: access.creditsFrozenAt,
    creditsFrozenUntil: access.creditsFrozenUntil,
    creditsFrozenReason: access.creditsFrozenReason,
    deactivatedAt: base.deactivated_at || null,
    returnsToDeactivated: access.returnsToDeactivated,
  };
}

async function settle(promise, fallback, label) {
  try {
    return await promise;
  } catch (err) {
    console.warn(`Account profile: could not load ${label}:`, err.message);
    return fallback;
  }
}

/**
 * Everything the staff "View profile" panel shows beyond the list row:
 * live standing, work and marketplace activity, credit totals, forum activity,
 * and for teams the settings and full roster.
 */
async function getAdminAccountProfile(accountId) {
  const base = await fetchAccountBase(accountId);
  if (!base) throw notFound();

  const isTeam = Boolean(base.team_id) || String(base.type || '').toLowerCase() === 'team';
  const teamId = base.team_id || null;
  const userId = base.user_id || null;

  const [access, work, credits, lastActivity, forum, projects, team] = await Promise.all([
    settle(getAccountAccess(accountId), null, 'standing'),
    settle(fetchAccountWorkStats(accountId, { teamId }), null, 'work stats'),
    settle(fetchAccountCreditTotals(accountId), null, 'credit totals'),
    settle(fetchLastActivityForAccounts([accountId]), new Map(), 'last activity'),
    isTeam
      ? Promise.resolve(null)
      : settle(fetchForumStatsForMember([userId, accountId]), null, 'forum stats'),
    isTeam ? Promise.resolve(null) : settle(fetchUserProjectStats(userId), null, 'projects'),
    isTeam && teamId ? settle(fetchTeamProfile(teamId), null, 'team roster') : Promise.resolve(null),
  ]);

  const lastActivityAt = [lastActivity.get(accountId), forum?.lastPostAt]
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  const roster = team?.members || [];
  const activeMembers = roster.filter((m) => String(m.status).toLowerCase() === 'active');
  const pendingMembers = roster.filter((m) => String(m.status).toLowerCase() === 'pending');

  return {
    accountId,
    accountType: isTeam ? 'team' : 'user',
    handle: base.handle || null,
    introduction: base.introduction || null,
    budgetCredits: base.budget_credits == null ? null : Number(base.budget_credits),
    createdAt: base.created_at || null,
    lastActivityAt,
    standing: access ? standingFromAccess(access, base) : null,
    work,
    credits,
    forum,
    projects,
    team: isTeam
      ? {
          settings: team?.settings || null,
          owner: activeMembers.find((m) => String(m.role).toLowerCase() === 'owner') || activeMembers[0] || null,
          activeMemberCount: activeMembers.length,
          pendingInviteCount: pendingMembers.length,
          members: roster,
        }
      : null,
  };
}

module.exports = {
  getAdminAccountProfile,
};
