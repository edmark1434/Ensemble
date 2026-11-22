/**
 * Staff punishments aimed at a team account (docs/punishment-system.md §8.10).
 *
 * A team acts as one account, but a person leads it, so:
 *  - Warnings and forum timeouts go to the team's leader (active Owner). Teams have no Platform
 *    Merit and never post in the forums. The team's record lists them (`violations.team_account_id`).
 *  - Ban / suspend / lock change the team account. `memberScope` says who else gets the same
 *    penalty: `none` (team only), `leader` (default), `selected` (`memberAccountIds`, active
 *    members of this team) or `all` active members. A member already at the same or a stricter
 *    standing is left alone. A leader or chosen member staff may not act on stops the whole action
 *    before anything changes; with `all` such members are skipped and named in the summary.
 *  - Lifting the team's penalty also lifts the penalty of each member in scope when it was applied
 *    together with this team and is still that member's current penalty.
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

const MEMBER_SCOPES = new Set(['none', 'leader', 'selected', 'all']);
const MAX_CHOSEN_MEMBERS = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Who besides the team account the action reaches. `explicit` is false only for the old default
 * (no `memberScope`, no `includeLeader`), which stays quiet about members it leaves alone.
 * The older `includeLeader` flag maps to `leader` / `none`.
 */
function memberScopeOf(options) {
  const raw = String(options.memberScope || '').trim().toLowerCase();
  if (raw) {
    if (!MEMBER_SCOPES.has(raw)) {
      throw sanctionError('Pick who else this reaches: the team only, its leader, chosen members or all members.', 422, 'TEAM_MEMBER_SCOPE_INVALID');
    }
    return { scope: raw, explicit: true };
  }
  if (options.includeLeader === false || options.includeLeader === 'false') return { scope: 'none', explicit: true };
  return { scope: 'leader', explicit: options.includeLeader === true || options.includeLeader === 'true' };
}

function chosenMemberIds(value) {
  const list = Array.isArray(value) ? value : [];
  const ids = [...new Set(list.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) throw sanctionError('Pick at least one team member.', 422, 'TEAM_MEMBERS_REQUIRED');
  if (ids.length > MAX_CHOSEN_MEMBERS) throw sanctionError(`Pick at most ${MAX_CHOSEN_MEMBERS} members.`, 422);
  if (ids.some((id) => !UUID_RE.test(id))) throw sanctionError('One of the chosen members is not a valid account.', 422);
  return ids;
}

/** The people in scope, each with their own standing. The leader is marked. */
async function memberTargetsFor(team, leader, scope, memberAccountIds) {
  if (scope === 'none') return [];
  if (scope === 'leader') return leader ? [{ ...leader, isLeader: true }] : [];
  const members = (await TeamsRepositories.listTeamMemberStandings(team.account_id)).map((row) => ({
    accountId: String(row.account_id),
    name: row.display_name || row.handle || 'a team member',
    handle: row.handle || null,
    status: String(row.status || 'Active').toLowerCase(),
    isLeader: Boolean(leader && String(row.account_id) === leader.accountId),
  }));
  if (scope === 'all') return members;
  const wanted = chosenMemberIds(memberAccountIds);
  const byId = new Map(members.map((member) => [member.accountId, member]));
  const missing = wanted.filter((id) => !byId.has(id));
  if (missing.length) {
    throw sanctionError(
      `${missing.length === 1 ? 'One chosen account is' : `${missing.length} chosen accounts are`} no longer an active member of this team. Refresh and pick again.`,
      422,
      'TEAM_MEMBER_NOT_FOUND'
    );
  }
  return wanted.map((id) => byId.get(id));
}

function labelOf(member) {
  return member.isLeader ? `${member.name} (leader)` : member.name;
}

function nameList(rows, max = 5) {
  const names = rows.map(labelOf);
  return names.length > max ? `${names.slice(0, max).join(', ')} and ${names.length - max} more` : names.join(', ');
}

/** One line per outcome, so a 40-member ban still reads as a short summary. */
function describeMemberResults(results, { scope, explicit, isLift, targetCount }) {
  if (scope === 'all' && !targetCount) return ['The team has no active members.'];
  const parts = [];
  const applied = results.filter((row) => row.applied);
  if (applied.length === 1 && applied[0].isLeader && scope === 'leader') {
    parts.push(`Leader ${applied[0].name} set to ${applied[0].status}.`);
  } else if (applied.length) {
    parts.push(`${applied.length} member${applied.length === 1 ? '' : 's'} set to ${applied[0].status}: ${nameList(applied)}.`);
  }
  const group = (reason) => results.filter((row) => !row.applied && row.skipped === reason);
  const one = (rows, singular, plural) => (rows.length === 1 ? singular : plural);
  const noLeader = group('no_leader');
  if (noLeader.length) parts.push(noLeader[0].message);
  const strict = group('already_restricted');
  if (strict.length) {
    parts.push(`${nameList(strict)} ${one(strict, 'is', 'are')} already as strict or stricter and ${one(strict, 'was', 'were')} left as is.`);
  }
  const refused = group('not_allowed');
  if (refused.length) {
    parts.push(`Skipped ${nameList(refused)}: ${refused[0].message}`);
  }
  const unlinked = group('not_linked');
  if (unlinked.length) {
    parts.push(`${nameList(unlinked)}: own standing was not set together with this team, so it stays. Change it from the Users tab.`);
  }
  const failed = group('failed');
  if (failed.length) {
    parts.push(`Could not ${isLift ? 'lift' : 'update'} ${nameList(failed)}: ${failed[0].message}`);
  }
  if (isLift && explicit && !parts.length && targetCount && scope !== 'none') {
    parts.push('No member in scope had a penalty set together with this team, so member accounts stay as they are.');
  }
  return parts;
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
  const { scope, explicit } = target || isLift ? memberScopeOf(options) : { scope: 'none', explicit: false };
  const targets = target || isLift ? await memberTargetsFor(team, leader, scope, options.memberAccountIds) : [];
  const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
  // Checked before the team changes, so a refused leader or chosen member never leaves a
  // half-applied action. With `all`, members staff may not act on are skipped instead.
  const guard = async (member, action) => {
    try {
      await assertCanSanctionTarget({
        actorStaffId: staffId,
        actorAccountId: options.actorAccountId || null,
        targetAccountId: member.accountId,
        action,
      });
      return null;
    } catch (err) {
      if (scope === 'all') return { ...member, applied: false, skipped: 'not_allowed', message: err.message };
      throw sanctionError(
        `${err.message} (${member.isLeader ? 'the team leader' : member.name}). Leave them out to act on the team${scope === 'selected' ? ' and the other members' : ' only'}.`,
        err.statusCode || 403
      );
    }
  };

  /** Each entry is either a plan (`apply: true`) or a finished skip. */
  const plans = [];
  if (target && scope === 'leader' && !leader) {
    plans.push({ applied: false, skipped: 'no_leader', message: 'The team has no active leader, so only the team was changed.' });
  }
  for (const member of targets) {
    if (target) {
      if ((SEVERITY[member.status] ?? 0) >= SEVERITY[target]) {
        plans.push({
          ...member,
          applied: false,
          skipped: 'already_restricted',
          message: `${member.name} is already ${member.status}; their account was left as it is.`,
        });
        continue;
      }
      const refused = await guard(member, GUARD_ACTION[target]);
      plans.push(refused || { ...member, apply: true, key });
      continue;
    }
    const linked = await leaderPenaltyLinkedToTeam(member.accountId, team.account_id);
    const from = LIFT_FROM[key];
    if (linked && (!from || linked === from)) {
      const refused = await guard(member, 'restore');
      plans.push(refused || { ...member, apply: true, key: from ? key : 'restore' });
    } else if (explicit && scope !== 'all' && member.status !== 'active') {
      plans.push({ ...member, applied: false, skipped: 'not_linked', message: 'Not set together with this team.' });
    }
  }

  const teamResult = await updateAccountStatus(team.account_id, key, staffId, { ...options, teamDirect: true });

  const memberResults = [];
  for (const plan of plans) {
    if (!plan.apply) {
      memberResults.push(plan);
      continue;
    }
    const { apply: _apply, key: planKey, ...member } = plan;
    try {
      const applied = await updateAccountStatus(member.accountId, planKey, staffId, {
        ...options,
        ...viaTeam,
        teamDirect: undefined,
        memberScope: undefined,
        memberAccountIds: undefined,
        reason: target
          ? `${reason} (applied together with Team ${teamName}, ${member.isLeader ? 'which you lead' : 'which you are a member of'})`
          : `${reason} (lifted together with Team ${teamName})`,
      });
      memberResults.push({ ...member, applied: true, status: applied.status });
      await recordAccountActivity({
        accountId: team.account_id,
        action: `Team ${member.isLeader ? 'leader' : 'member'} ${member.name} set to ${applied.status} with the team${reason ? `: ${reason}` : ''}`,
        eventCode: member.isLeader ? 'TEAM_LEADER_STANDING_CHANGED' : 'TEAM_MEMBER_STANDING_CHANGED',
        referenceTable: 'accounts',
        referencePrefix: 'ACC',
        referenceId: member.accountId,
        actorStaffId: staffId,
        metadata: {
          ...(member.isLeader ? { leaderAccountId: member.accountId } : {}),
          memberAccountId: member.accountId,
          memberScope: scope,
          status: applied.status,
          action: planKey,
          reason: reason || null,
        },
      });
    } catch (err) {
      console.warn('Team member cascade failed:', err.message);
      memberResults.push({ ...member, applied: false, skipped: 'failed', message: err.message });
    }
  }
  const leaderResult = memberResults.find((row) => row.isLeader || row.skipped === 'no_leader') || null;

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

  const parts = [
    `Team ${teamName} set to ${teamResult.status}.`,
    ...describeMemberResults(memberResults, { scope, explicit, isLift, targetCount: targets.length }),
  ];
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
    memberScope: scope,
    members: memberResults,
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
 * A team's name, current leader (first active Owner) and active members, for staff screens that
 * need to say who a team penalty also reaches. Null when the team does not exist.
 */
async function describeTeamLeader(teamAccountId) {
  const team = await TeamsRepositories.getTeamStanding(teamAccountId).catch(() => null);
  if (!team || String(team.account_id) !== String(teamAccountId)) return null;
  const leader = leaderOf(team);
  const rows = await TeamsRepositories.listTeamMemberStandings(team.account_id).catch(() => []);
  const members = rows.map((row) => ({
    accountId: String(row.account_id),
    name: row.display_name || row.handle || 'Member',
    handle: row.handle || null,
    role: row.role || 'Member',
    status: String(row.status || 'Active').toLowerCase(),
    isLeader: Boolean(leader && String(row.account_id) === leader.accountId),
  }));
  return { teamName: teamNameOf(team), status: team.account_status || null, leader, members };
}

module.exports = {
  warnTeamLeader,
  changeTeamStanding,
  transferTeamOwnership,
  teamStandingMessage,
  describeTeamLeader,
};
