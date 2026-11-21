/**
 * Staff punishments aimed at a team account (docs/punishment-system.md §8.10).
 *
 * A team acts as one account, but a person leads it, so:
 *  - Warnings and forum timeouts go to the team's leader (active Owner). Teams have no Platform
 *    Merit and never post in the forums. The team's record lists them (`violations.team_account_id`).
 *  - Ban / suspend / lock change the team account. By default the leader gets the same penalty
 *    ("Also apply to the team leader"); staff can turn that off. A leader already at the same or a
 *    stricter standing is left alone, and a leader staff may not act on stops the whole action
 *    before anything changes.
 *  - Lifting the team's penalty also lifts the leader's when it was applied together with this
 *    team and is still the leader's current penalty.
 *  - Team Owners and Admins are told; the team page refreshes live.
 */
const TeamsRepositories = require('../repositories/TeamsRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { notifyTeamManagers } = require('./TeamStandingServices');

const TIMEOUT_KEYS = new Set(['timeout', 'forum_timeout', 'clear_timeout', 'clear-timeout']);
const SANCTION_TARGET = {
  ban: 'banned',
  banned: 'banned',
  lock: 'locked',
  locked: 'locked',
  suspend: 'suspended',
  suspended: 'suspended',
};
const LIFT_FROM = {
  unban: 'banned',
  unsuspend: 'suspended',
  unlock: 'locked',
  restore: null,
  active: null,
};
/** Higher is stricter. A cascade never replaces a stricter leader penalty with a lighter one. */
const SEVERITY = { active: 0, deactivated: 0, suspended: 1, locked: 2, banned: 3 };
const GUARD_ACTION = { banned: 'ban', locked: 'lock', suspended: 'suspend' };
const OWNER_ROLES_AFTER_TRANSFER = new Set(['Admin', 'Member', 'Removed']);

function sanctionError(message, statusCode = 400, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

function formatWhen(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function teamNameOf(team) {
  return team?.display_name || team?.handle || 'this team';
}

function leaderOf(team) {
  if (!team?.owner_account_id) return null;
  return {
    accountId: String(team.owner_account_id),
    name: team.owner_name || team.owner_handle || 'the team leader',
    handle: team.owner_handle || null,
    status: String(team.owner_account_status || 'Active').toLowerCase(),
  };
}

function wantsLeader(options) {
  return options.includeLeader !== false && options.includeLeader !== 'false';
}

async function loadTeam(teamAccountId) {
  const team = await TeamsRepositories.getTeamStanding(teamAccountId);
  if (!team || String(team.account_id) !== String(teamAccountId)) {
    throw sanctionError('Team not found', 404, 'TEAM_NOT_FOUND');
  }
  return team;
}

/**
 * A warning issued against a team: the leader carries the points, the team's record lists it.
 * @param {{ account_id: string }} teamAccount
 */
async function warnTeamLeader(teamAccount, payload, staffId) {
  const team = await loadTeam(teamAccount.account_id);
  const leader = leaderOf(team);
  if (!leader) {
    throw sanctionError(
      'This team has no active leader to warn. Lock the team, or transfer ownership first.',
      409,
      'TEAM_NO_LEADER'
    );
  }
  const teamName = teamNameOf(team);
  const { warnAccount } = require('../repositories/AdminUserTeamRepositories');
  const result = await warnAccount(
    leader.accountId,
    { ...payload, viaTeam: { accountId: String(team.account_id), name: teamName } },
    staffId
  );
  await recordAccountActivity({
    accountId: team.account_id,
    action: `Warning issued to team leader ${leader.name}: ${result.type}`,
    eventCode: 'TEAM_LEADER_WARNED',
    referenceTable: 'violations',
    referencePrefix: 'VIO',
    referenceId: result.violationId || result.violationNumber,
    actorStaffId: staffId,
    metadata: {
      leaderAccountId: leader.accountId,
      violationId: result.violationId,
      violationNumber: result.violationNumber,
      type: result.type,
      points: result.points,
      reason: String(payload?.reason || '').trim() || null,
      ...(payload?.activityContext && typeof payload.activityContext === 'object' ? payload.activityContext : {}),
    },
  });
  return {
    ...result,
    teamAccountId: String(team.account_id),
    issuedTo: { accountId: leader.accountId, name: leader.name, handle: leader.handle },
  };
}

function teamStandingMessage(teamName, status, { endsAt, reason, banCleanup } = {}) {
  const until = formatWhen(endsAt);
  const why = reason ? ` Reason: ${reason}` : '';
  switch (String(status).toLowerCase()) {
    case 'suspended':
      return `Staff suspended Team ${teamName}${until ? ` until ${until}` : ''}. The team cannot take new work, move team credits or change its roster; live contract work can continue.${why}`;
    case 'locked':
      return `Staff locked Team ${teamName}${until ? ` until ${until}` : ''} while they review it. Team activity is paused.${why}`;
    case 'banned':
      return `Staff banned Team ${teamName}${until ? ` until ${until}` : ''}.${banCleanup ? ' Its open jobs, gigs and listings were closed.' : ''} Team activity is paused; Support handles live contracts and the team wallet.${why}`;
    default:
      return `Team ${teamName} is active again. All team features are available.${why}`;
  }
}

/**
 * Ban / suspend / lock / lift on a team account, with the leader cascade, or a forum timeout
 * that goes to the leader. Called by updateAccountStatus for team targets.
 */
async function changeTeamStanding(teamAccount, key, staffId, options = {}) {
  const team = await loadTeam(teamAccount.account_id);
  const teamName = teamNameOf(team);
  const leader = leaderOf(team);
  const { updateAccountStatus, leaderPenaltyLinkedToTeam } = require('../repositories/AdminUserTeamRepositories');
  const reason = String(options.reason || '').trim();
  const viaTeam = { viaTeamAccountId: String(team.account_id), viaTeamName: teamName };

  // Teams never post in the forums: a timeout is the leader's.
  if (TIMEOUT_KEYS.has(key)) {
    if (!leader) {
      throw sanctionError('This team has no active leader to time out.', 409, 'TEAM_NO_LEADER');
    }
    const result = await updateAccountStatus(leader.accountId, key, staffId, { ...options, ...viaTeam, teamDirect: undefined });
    const cleared = key.startsWith('clear');
    await recordAccountActivity({
      accountId: team.account_id,
      action: `${cleared ? 'Forum timeout cleared for' : 'Forum timeout applied to'} team leader ${leader.name}${reason ? `: ${reason}` : ''}`,
      eventCode: cleared ? 'TEAM_LEADER_TIMEOUT_CLEARED' : 'TEAM_LEADER_TIMEOUT',
      referenceTable: 'accounts',
      referencePrefix: 'ACC',
      referenceId: leader.accountId,
      actorStaffId: staffId,
      metadata: {
        leaderAccountId: leader.accountId,
        reason: reason || null,
        ...(options.activityContext && typeof options.activityContext === 'object' ? options.activityContext : {}),
      },
    });
    return {
      ...result,
      isTeam: true,
      team: { accountId: String(team.account_id), name: teamName, status: team.account_status },
      leader: { ...leader, applied: true },
      summary: cleared
        ? `Forum timeout cleared for team leader ${leader.name}.`
        : `Forum timeout applied to team leader ${leader.name} (teams do not post in the forums).`,
    };
  }

  const target = SANCTION_TARGET[key] || null;
  const isLift = Object.prototype.hasOwnProperty.call(LIFT_FROM, key);
  let leaderPlan = null;

  if (target && wantsLeader(options)) {
    if (!leader) {
      leaderPlan = { applied: false, skipped: 'no_leader', message: 'The team has no active leader.' };
    } else if ((SEVERITY[leader.status] ?? 0) >= SEVERITY[target]) {
      leaderPlan = {
        ...leader,
        applied: false,
        skipped: 'already_restricted',
        message: `${leader.name} is already ${leader.status}; their account was left as it is.`,
      };
    } else {
      // Checked before the team changes, so a refused leader never leaves a half-applied action.
      const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
      await assertCanSanctionTarget({
        actorStaffId: staffId,
        actorAccountId: options.actorAccountId || null,
        targetAccountId: leader.accountId,
        action: GUARD_ACTION[target],
      }).catch((err) => {
        throw sanctionError(
          `${err.message} (the team leader). Untick "Also apply to the team leader" to act on the team only.`,
          err.statusCode || 403
        );
      });
      leaderPlan = { ...leader, apply: true, key };
    }
  } else if (isLift && leader && wantsLeader(options)) {
    const linked = await leaderPenaltyLinkedToTeam(leader.accountId, team.account_id);
    const from = LIFT_FROM[key];
    if (linked && (!from || linked === from)) {
      const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
      await assertCanSanctionTarget({
        actorStaffId: staffId,
        actorAccountId: options.actorAccountId || null,
        targetAccountId: leader.accountId,
        action: 'restore',
      });
      leaderPlan = { ...leader, apply: true, key: from ? key : 'restore' };
    } else if (options.includeLeader === true) {
      leaderPlan = {
        ...leader,
        applied: false,
        skipped: 'not_linked',
        message: `${leader.name}'s own standing was not set together with this team, so it was left as it is. Change it from the Users tab.`,
      };
    }
  }

  const teamResult = await updateAccountStatus(team.account_id, key, staffId, { ...options, teamDirect: true });

  let leaderResult = leaderPlan && !leaderPlan.apply ? leaderPlan : null;
  if (leaderPlan?.apply) {
    try {
      const applied = await updateAccountStatus(leaderPlan.accountId, leaderPlan.key, staffId, {
        ...options,
        ...viaTeam,
        teamDirect: undefined,
        reason: target
          ? `${reason} (applied together with Team ${teamName}, which you lead)`
          : `${reason} (lifted together with Team ${teamName})`,
      });
      leaderResult = { ...leader, applied: true, status: applied.status };
      await recordAccountActivity({
        accountId: team.account_id,
        action: `Team leader ${leader.name} set to ${applied.status} with the team${reason ? `: ${reason}` : ''}`,
        eventCode: 'TEAM_LEADER_STANDING_CHANGED',
        referenceTable: 'accounts',
        referencePrefix: 'ACC',
        referenceId: leader.accountId,
        actorStaffId: staffId,
        metadata: { leaderAccountId: leader.accountId, status: applied.status, action: leaderPlan.key, reason: reason || null },
      });
    } catch (err) {
      console.warn('Team leader cascade failed:', err.message);
      leaderResult = { ...leader, applied: false, skipped: 'failed', message: err.message };
    }
  }

  // Owners and Admins hear about the team (a team account has no inbox of its own).
  let refreshed = null;
  try {
    refreshed = await TeamsRepositories.getTeamStanding(team.account_id);
    const status = String(refreshed?.account_status || teamResult.status);
    const endsAt =
      status.toLowerCase() === 'suspended'
        ? refreshed?.account_suspension_ends_at
        : status.toLowerCase() === 'banned'
          ? refreshed?.account_ban_ends_at
          : status.toLowerCase() === 'locked'
            ? refreshed?.account_lock_ends_at
            : null;
    await notifyTeamManagers(team.account_id, {
      message: teamStandingMessage(teamName, status, { endsAt, reason, banCleanup: teamResult.banCleanup }),
      prefix: status.toLowerCase() === 'active' ? 'TEAM_RESTORED' : `TEAM_${status.toUpperCase()}`,
      event: 'standing_changed',
    });
  } catch (err) {
    console.warn('Team standing notice skipped:', err.message);
  }

  const parts = [`Team ${teamName} set to ${teamResult.status}.`];
  if (leaderResult?.applied) parts.push(`Leader ${leaderResult.name} set to ${leaderResult.status}.`);
  else if (leaderResult?.message) parts.push(leaderResult.message);
  if (teamResult.banCleanup) {
    try {
      const { describeSummary } = require('./BanCleanupServices');
      if (Array.isArray(teamResult.banCleanup.failures) && 'jobsClosed' in teamResult.banCleanup) {
        parts.push(`${describeSummary(teamResult.banCleanup)}.`);
      }
    } catch (_err) {
      // The summary is a courtesy; the ban itself is saved.
    }
  }

  return {
    ...teamResult,
    isTeam: true,
    team: { accountId: String(team.account_id), name: teamName, status: teamResult.status },
    leader: leaderResult,
    summary: parts.join(' '),
  };
}

/**
 * Admin / Support move a team's ownership, e.g. when the leader is banned or gone.
 * @param {string} teamAccountId
 * @param {{ newOwnerAccountId: string, previousOwnerRole?: 'Admin'|'Member'|'Removed', reason: string }} input
 */
async function transferTeamOwnership(teamAccountId, input = {}, staffId = null, actorAccountId = null) {
  const team = await loadTeam(teamAccountId);
  const teamName = teamNameOf(team);
  const reason = String(input.reason || '').trim();
  if (reason.length < 5) throw sanctionError('Write why ownership is moving (at least 5 characters)');
  if (reason.length > 1000) throw sanctionError('Keep the reason under 1,000 characters');
  const newOwnerAccountId = String(input.newOwnerAccountId || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newOwnerAccountId)) {
    throw sanctionError('Pick the member who will own the team', 422);
  }
  const previousOwnerRole = OWNER_ROLES_AFTER_TRANSFER.has(input.previousOwnerRole) ? input.previousOwnerRole : 'Member';
  if (actorAccountId && String(actorAccountId) === newOwnerAccountId) {
    throw sanctionError('You cannot transfer a team to your own account', 403);
  }

  const membership = await TeamsRepositories.getMembership(team.team_id, newOwnerAccountId);
  if (!membership || membership.status !== 'Active') {
    throw sanctionError('The new owner must be an active member of this team', 422, 'TEAM_OWNER_NOT_MEMBER');
  }
  const { getAccountById } = require('../repositories/AccountRepositories');
  const account = await getAccountById(newOwnerAccountId);
  if (!account || account.deleted_at) throw sanctionError('That account no longer exists', 404);
  if (String(account.status || '').toLowerCase() !== 'active') {
    throw sanctionError(
      `That member's account is ${String(account.status).toLowerCase()}. Pick a member in good standing to lead the team.`,
      409,
      'TEAM_OWNER_RESTRICTED'
    );
  }

  const { previousOwnerAccountIds } = await TeamsRepositories.transferOwnershipByStaff(
    team.team_id,
    membership.user_id,
    previousOwnerRole
  );
  const newOwnerName = account.display_name || account.handle || 'the new owner';

  await recordAccountActivity({
    accountId: team.account_id,
    action: `Ownership transferred by staff to ${newOwnerName}: ${reason}`,
    eventCode: 'TEAM_OWNERSHIP_TRANSFERRED',
    referenceTable: 'teams',
    referencePrefix: 'TEAM',
    referenceId: team.team_id,
    actorStaffId: staffId,
    metadata: {
      newOwnerAccountId,
      previousOwnerAccountIds,
      previousOwnerRole,
      reason,
    },
  });

  const { createNotification } = require('../repositories/NotificationRepositories');
  let io = null;
  try {
    io = require('../lib/WebSocket').getIo();
  } catch (_err) {
    io = null;
  }
  const notices = [
    {
      accountId: newOwnerAccountId,
      message: `Support made you the owner (leader) of Team ${teamName}. You are now responsible for the team, its wallet and its standing. Reason: ${reason}`,
    },
    ...previousOwnerAccountIds
      .filter((id) => id !== newOwnerAccountId)
      .map((id) => ({
        accountId: id,
        message: `Support transferred ownership of Team ${teamName} to ${newOwnerName}. ${
          previousOwnerRole === 'Removed' ? 'You are no longer a member of the team.' : `You are now a team ${previousOwnerRole}.`
        } Reason: ${reason}`,
      })),
  ];
  for (const notice of notices) {
    try {
      const notification = await createNotification({
        account_id: notice.accountId,
        message: notice.message,
        is_read: false,
        reference_table: 'teams',
        reference_prefix: 'TEAM_OWNERSHIP_TRANSFERRED',
        reference_path: `/teams/${team.team_id}`,
        reference_id: team.team_id,
      });
      if (io && notification) io.to(String(notice.accountId)).emit('notification', notification);
    } catch (err) {
      console.warn('Ownership transfer notice skipped:', err.message);
    }
  }
  try {
    await require('./TeamsServices').syncChat(team.team_id);
  } catch (err) {
    console.warn('Team chat sync after transfer failed:', err.message);
  }

  return {
    teamId: String(team.team_id),
    teamAccountId: String(team.account_id),
    newOwner: { accountId: newOwnerAccountId, name: newOwnerName },
    previousOwnerAccountIds,
    previousOwnerRole,
  };
}

/**
 * A team's name and current leader (first active Owner), for staff screens that need to say who
 * a team penalty also reaches. Null when the team does not exist.
 */
async function describeTeamLeader(teamAccountId) {
  const team = await TeamsRepositories.getTeamStanding(teamAccountId).catch(() => null);
  if (!team || String(team.account_id) !== String(teamAccountId)) return null;
  return { teamName: teamNameOf(team), status: team.account_status || null, leader: leaderOf(team) };
}

module.exports = {
  warnTeamLeader,
  changeTeamStanding,
  transferTeamOwnership,
  teamStandingMessage,
  describeTeamLeader,
};
