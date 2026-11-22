/**
 * Team standing: what a team account can still do while it is suspended, locked or banned,
 * and who hears about it. Teams have no session of their own (members act for them), so the
 * session gate in CheckSession never sees a team's standing; every team write checks it here.
 *
 * Rules (docs/punishment-system.md §8.10):
 *  - Suspended team: no new work, no wallet moves, no roster or settings changes, no ownership
 *    transfer. Live contract work (tasks, video projects) continues so clients are not stranded.
 *  - Locked or banned team: every team write stops. Live contracts are left for staff (§9).
 *  - Always allowed: reading, leaving (non-owners), declining an invitation, reporting, team chat.
 *  - A team whose leader is banned, locked or missing cannot take new work or move team credits
 *    until staff transfer ownership (or the leader's penalty ends).
 */
const TeamsRepositories = require('../repositories/TeamsRepositories');

const TEAM_ACTION_LABELS = {
  manage_team: 'edit the team profile or settings',
  delete_team: 'be deleted',
  join: 'take new members',
  invite: 'invite new members',
  manage_members: 'change its roster',
  transfer: 'transfer ownership',
  wallet: 'move team credits',
  marketplace: 'take new work, post jobs or send proposals',
  hire: 'hire or subcontract',
  work: 'update team work',
};

/** Actions each restricted standing still allows. Anything not listed is refused. */
const ALLOWED_WHILE = {
  suspended: new Set(['work']),
  locked: new Set(),
  banned: new Set(),
};

/** Actions that also need an accountable leader (an active, unrestricted Owner). */
const NEEDS_LEADER = new Set(['marketplace', 'wallet', 'hire']);

const STATUS_LABEL = { active: 'Active', suspended: 'Suspended', locked: 'Locked', banned: 'Banned' };

class TeamStandingError extends Error {
  constructor(message, code, statusCode = 403, standing = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.standing = standing;
  }
}

function formatWhen(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * The team's standing right now. A penalty whose end date has passed counts as over even
 * before the one-minute standing job records the lift.
 */
function effectiveTeamStatus(team) {
  const status = String(team?.account_status || 'Active').toLowerCase();
  const endsAt = {
    suspended: team?.account_suspension_ends_at,
    banned: team?.account_ban_ends_at,
    locked: team?.account_lock_ends_at,
  }[status];
  if (!ALLOWED_WHILE[status]) return { status: 'active', endsAt: null };
  if (endsAt && new Date(endsAt).getTime() <= Date.now()) return { status: 'active', endsAt: null };
  return { status, endsAt: endsAt || null };
}

function leaderState(team) {
  if (!team?.owner_account_id) return { status: 'missing', restricted: true };
  const status = String(team.owner_account_status || 'Active').toLowerCase();
  return { status, restricted: status === 'banned' || status === 'locked' };
}

/** What members see on the team page while the team is restricted. */
function teamStandingSummary(team) {
  if (!team) return null;
  const { status, endsAt } = effectiveTeamStatus(team);
  const standardTeam = String(team.team_type || 'standard').toLowerCase() === 'standard';
  const leader = standardTeam ? leaderState(team) : { status: 'active', restricted: false };
  const allowed = ALLOWED_WHILE[status];
  const paused = allowed
    ? Object.keys(TEAM_ACTION_LABELS).filter((action) => !allowed.has(action) && action !== 'delete_team')
    : leader.restricted
      ? [...NEEDS_LEADER]
      : [];
  const until = formatWhen(endsAt);
  let message = null;
  if (status !== 'active') {
    message =
      status === 'suspended'
        ? `This team is suspended${until ? ` until ${until}` : ' until staff lift it'}. Live contract work can continue, but the team cannot take new work, move credits or change its roster.`
        : `This team is ${status}${until ? ` until ${until}` : ''}. Team activity is paused while staff review it.`;
  } else if (leader.restricted) {
    message =
      leader.status === 'missing'
        ? 'This team has no active leader. New work and team payouts are paused until Support assigns an owner.'
        : 'The team leader’s account is restricted. New work and team payouts are paused until Support transfers ownership or the restriction ends.';
  }
  return {
    status: STATUS_LABEL[status] || 'Active',
    restricted: status !== 'active',
    endsAt,
    leaderRestricted: status === 'active' && leader.restricted,
    leaderStatus: leader.status,
    paused: paused.map((action) => TEAM_ACTION_LABELS[action]),
    message,
  };
}

async function loadTeam(teamOrId) {
  if (teamOrId && typeof teamOrId === 'object' && 'account_status' in teamOrId) return teamOrId;
  const team = teamOrId ? await TeamsRepositories.getTeamStanding(teamOrId) : null;
  if (!team) throw new TeamStandingError('Team not found', 'TEAM_NOT_FOUND', 404);
  return team;
}

/**
 * Refuse a team write that the team's standing does not allow.
 * @param {object|string} teamOrId a row with `account_status` (getTeam / getTeamStanding) or a team id
 * @param {keyof TEAM_ACTION_LABELS} action
 */
async function assertTeamAllows(teamOrId, action) {
  const team = await loadTeam(teamOrId);
  const { status, endsAt } = effectiveTeamStatus(team);
  const label = TEAM_ACTION_LABELS[action] || 'do that';
  const allowed = ALLOWED_WHILE[status];
  if (allowed && !allowed.has(action)) {
    const until = formatWhen(endsAt);
    const message =
      status === 'suspended'
        ? `This team is suspended${until ? ` until ${until}` : ''}, so it cannot ${label}. Live contract work can continue.`
        : `This team is ${status}${until ? ` until ${until}` : ''}, so it cannot ${label}.`;
    throw new TeamStandingError(message, `TEAM_${status.toUpperCase()}`, 403, teamStandingSummary(team));
  }
  // Contractual (project) workspaces are led by the contract's client, not a team Owner.
  const standardTeam = String(team.team_type || 'standard').toLowerCase() === 'standard';
  if (standardTeam && NEEDS_LEADER.has(action) && !('owner_account_status' in team)) {
    // Rows without the owner columns: load the full standing once.
    return assertTeamAllows(team.team_id, action);
  }
  if (standardTeam && NEEDS_LEADER.has(action)) {
    const leader = leaderState(team);
    if (leader.restricted) {
      throw new TeamStandingError(
        leader.status === 'missing'
          ? `This team has no active leader, so it cannot ${label}. Contact Support to assign an owner.`
          : `The team leader’s account is ${leader.status}, so the team cannot ${label} until Support transfers ownership or the restriction ends.`,
        'TEAM_LEADER_RESTRICTED',
        403,
        teamStandingSummary(team)
      );
    }
  }
  return team;
}

/**
 * Durable notice to the team's Owners and Admins (a team account has no inbox of its own),
 * then a live `team:standing_changed` to every active member so an open team page refreshes.
 */
async function notifyTeamManagers(teamAccountId, { message, prefix, referenceTable = 'accounts', referenceId = null, path = null, event = null }) {
  if (!teamAccountId || !message) return [];
  let team = null;
  try {
    team = await TeamsRepositories.getTeamStanding(teamAccountId);
  } catch (err) {
    console.warn('Team notice: could not load the team:', err.message);
  }
  const managers = await TeamsRepositories.getTeamManagerAccountIds(teamAccountId).catch(() => []);
  const { createNotification } = require('../repositories/NotificationRepositories');
  let io = null;
  try {
    io = require('../lib/WebSocket').getIo();
  } catch (_err) {
    io = null;
  }
  const sent = [];
  for (const accountId of managers) {
    try {
      const notification = await createNotification({
        account_id: accountId,
        message,
        is_read: false,
        reference_table: referenceTable,
        reference_prefix: prefix,
        reference_path: path || (team ? `/teams/${team.team_id}` : '/notifications'),
        reference_id: referenceId || teamAccountId,
      });
      if (io && notification) io.to(String(accountId)).emit('notification', notification);
      sent.push(accountId);
    } catch (err) {
      console.warn('Team notice skipped:', err.message);
    }
  }
  if (io && team) {
    try {
      const members = await TeamsRepositories.getActiveTeamMemberAccountIds(teamAccountId);
      const payload = {
        teamId: String(team.team_id),
        teamAccountId: String(teamAccountId),
        event: event || prefix,
        standing: teamStandingSummary(team),
      };
      for (const accountId of members) io.to(String(accountId)).emit('team:standing_changed', payload);
    } catch (err) {
      console.warn('Team standing broadcast skipped:', err.message);
    }
  }
  return sent;
}

/**
 * A team leader's own account was banned or locked (or that ended). The team's other Owners
 * and Admins hear what it means, and that they do not need a ticket: the team's open jobs and
 * gigs pause on their own (lib/OwnerAvailability), live contract work continues, the Teams
 * desk flags the team, and Support transfers ownership or the team resumes when the penalty
 * ends. Suspension does not pause a team, so it is not announced. Never throws.
 * @param {string} accountId the leader's personal account
 * @param {{ restricted: boolean, status?: string }} change
 */
async function notifyTeamsOfLeaderStanding(accountId, { restricted, status = null }) {
  try {
    const teams = await TeamsRepositories.getTeamsLedByAccount(accountId);
    for (const team of teams) {
      const name = team.display_name || team.handle || 'your team';
      const message = restricted
        ? `The leader of ${name} is ${String(status || 'restricted').toLowerCase()} and can't use Ensemble right now. The team's open jobs and gigs are paused and it can't take new work or pay out until Ensemble Support assigns a new owner or the restriction ends. Live contract work continues. You don't need to open a ticket: Support already sees this team.`
        : `The leader of ${name} can use Ensemble again. The team's jobs and gigs are back and it can take new work again.`;
      await notifyTeamManagers(team.account_id, {
        message,
        prefix: restricted ? 'TEAM_LEADER_RESTRICTED' : 'TEAM_LEADER_RESTORED',
        event: 'standing_changed',
      });
    }
    return teams.length;
  } catch (err) {
    console.warn('Team leader standing notice skipped:', err.message);
    return 0;
  }
}

/** `{ isTeam, teamId, name }` for a wallet owner, so wallet notices can say "Team X's wallet". */
async function describeTeamAccount(accountId) {
  const team = accountId ? await TeamsRepositories.getTeamStanding(accountId).catch(() => null) : null;
  if (!team || String(team.account_id) !== String(accountId)) return { isTeam: false, teamId: null, name: null };
  return { isTeam: true, teamId: String(team.team_id), name: team.display_name || team.handle || 'your team' };
}

module.exports = {
  TEAM_ACTION_LABELS,
  TeamStandingError,
  effectiveTeamStatus,
  teamStandingSummary,
  assertTeamAllows,
  notifyTeamManagers,
  notifyTeamsOfLeaderStanding,
  describeTeamAccount,
};
