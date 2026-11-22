/**
 * Staff punishments aimed at a team account (docs/punishment-system.md §8.10).
 *
 * A team acts as one account, but people work in it, so every team penalty reaches people.
 * `memberScope` says who: `leader` (the first active Owner; the default), `selected`
 * (`memberAccountIds`, active members of this team) or `all` active members. There is no "team
 * only": `none` (or `includeLeader: false`) is refused, as is staff picking `leader` for a team with
 * no active leader.
 *  - Warnings: teams have no Platform Merit, so the named warning lands on each person in scope
 *    (merit, automatic punishments and appeals as usual). `violations.team_account_id` names the
 *    team, so the team's record lists it even after the person leaves or ownership moves.
 *  - Forum timeouts: teams never post, so the timeout goes on each person in scope. Members already
 *    timed out are left as they are. Clearing ends only timeouts that were set with this team.
 *  - Ban / suspend / lock change the team account and each person in scope. A member already at
 *    the same or a stricter standing is left alone.
 *  - A leader or chosen member staff may not act on stops the whole action before anything
 *    changes; with `all` such members are skipped and named in the summary.
 *  - Lifting the team's penalty also lifts the penalty of each member in scope when it was applied
 *    together with this team and is still that member's current penalty.
 *  - Team Owners and Admins are told about team standing changes; the team page refreshes live.
 * Ownership transfers live in TeamOwnershipServices.
 */
const TeamsRepositories = require('../repositories/TeamsRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { notifyTeamManagers } = require('./TeamStandingServices');
const { memberMeritSummary } = require('../lib/TeamMerit');

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

const MEMBER_SCOPES = new Set(['leader', 'selected', 'all']);
const MAX_CHOSEN_MEMBERS = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCOPE_REQUIRED_MESSAGE =
  'A team penalty always reaches people. Pick the team leader, specific members or all members.';

/**
 * Who besides the team account the action reaches. `explicit` is false only for the internal
 * default (no `memberScope`, no `includeLeader`: report decisions, dispute bans, appeal
 * follow-ups), which reaches the leader and stays quiet about members it leaves alone.
 * The older `includeLeader: true` flag maps to `leader`; `false` asked for the team only and is refused.
 */
function memberScopeOf(options) {
  const raw = String(options.memberScope || '').trim().toLowerCase();
  if (raw) {
    if (!MEMBER_SCOPES.has(raw)) throw sanctionError(SCOPE_REQUIRED_MESSAGE, 422, 'TEAM_MEMBER_SCOPE_INVALID');
    return { scope: raw, explicit: true };
  }
  if (options.includeLeader === false || options.includeLeader === 'false') {
    throw sanctionError(SCOPE_REQUIRED_MESSAGE, 422, 'TEAM_MEMBER_SCOPE_INVALID');
  }
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

function memberFromRow(leader) {
  return (row) => ({
    accountId: String(row.account_id),
    name: row.display_name || row.handle || 'a team member',
    handle: row.handle || null,
    role: row.role || 'Member',
    status: String(row.status || 'Active').toLowerCase(),
    merit: row.merit == null ? null : Number(row.merit),
    forumTimeout: Boolean(row.forum_timeout),
    timeoutViaTeam: Boolean(row.forum_timeout && row.timeout_via_team),
    isLeader: Boolean(leader && String(row.account_id) === leader.accountId),
  });
}

/** The people in scope, each with their own standing. The leader is marked. */
async function memberTargetsFor(team, leader, scope, memberAccountIds) {
  const members = (await TeamsRepositories.listTeamMemberStandings(team.account_id)).map(memberFromRow(leader));
  if (scope === 'leader') {
    if (!leader) return [];
    return [members.find((member) => member.isLeader) || { ...leader, isLeader: true, forumTimeout: false, timeoutViaTeam: false }];
  }
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

/**
 * Whether staff may act on one person in scope. Checked before anything changes, so a refused
 * leader or chosen member never leaves a half-applied action. With `all` they are skipped instead
 * (returns the skip row); otherwise the whole action stops.
 */
async function guardMember({ staffId, actorAccountId, scope }, member, action) {
  const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
  try {
    await assertCanSanctionTarget({
      actorStaffId: staffId,
      actorAccountId: actorAccountId || null,
      targetAccountId: member.accountId,
      action,
    });
    return null;
  } catch (err) {
    if (scope === 'all') return { ...member, applied: false, skipped: 'not_allowed', message: err.message };
    throw sanctionError(
      `${err.message} (${member.isLeader ? 'the team leader' : member.name}). ${
        scope === 'selected' ? 'Leave them out of the chosen members' : 'Pick specific members instead'
      }.`,
      err.statusCode || 403
    );
  }
}

function noLeaderError(verb) {
  return sanctionError(
    `This team has no active leader to ${verb}. Pick specific members or all members, or transfer ownership first.`,
    422,
    'TEAM_NO_LEADER'
  );
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
  if (isLift && explicit && !parts.length && targetCount) {
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

/** One line per outcome for team warnings and timeouts. */
function describePersonResults(results, { scope, verbDone, skipNotes = {} }) {
  const parts = [];
  const applied = results.filter((row) => row.applied);
  if (applied.length === 1 && applied[0].isLeader && scope === 'leader') {
    parts.push(`${verbDone} team leader ${applied[0].name}.`);
  } else if (applied.length) {
    parts.push(`${verbDone} ${applied.length} member${applied.length === 1 ? '' : 's'}: ${nameList(applied)}.`);
  }
  const group = (reason) => results.filter((row) => !row.applied && row.skipped === reason);
  for (const [reason, note] of Object.entries(skipNotes)) {
    const rows = group(reason);
    if (rows.length) parts.push(`${nameList(rows)} ${note(rows.length === 1)}`);
  }
  const refused = group('not_allowed');
  if (refused.length) parts.push(`Skipped ${nameList(refused)}: ${refused[0].message}`);
  const failed = group('failed');
  if (failed.length) parts.push(`Could not update ${nameList(failed)}: ${failed[0].message}`);
  return parts;
}

/**
 * A warning issued against a team. Teams have no Platform Merit, so each person in scope carries
 * the named warning on their own record; the team's record lists every one of them.
 * @param {{ account_id: string }} teamAccount
 * @param {{ warningId?: string, type?: string, reason?: string, memberScope?: string, memberAccountIds?: string[], activityContext?: object }} payload
 */
async function warnTeam(teamAccount, payload = {}, staffId) {
  const team = await loadTeam(teamAccount.account_id);
  const leader = leaderOf(team);
  const teamName = teamNameOf(team);
  const reason = String(payload?.reason || '').trim();
  if (!reason) throw sanctionError('A reason is required', 400);
  const { scope } = memberScopeOf(payload);
  if (scope === 'leader' && !leader) throw noLeaderError('warn');
  const targets = await memberTargetsFor(team, leader, scope, payload.memberAccountIds);
  if (!targets.length) throw sanctionError('This team has no active members to warn.', 422, 'TEAM_NO_MEMBERS');

  // The named warning must be on the issuer's desk: checked once, before anyone is warned.
  const { resolveIssuedWarning } = require('./WarningDefServices');
  const { staffRoleOf } = require('../lib/SuspendGuards');
  await resolveIssuedWarning({ warningId: payload.warningId, type: payload.type, actorRole: await staffRoleOf(staffId) });

  const ctx = { staffId, actorAccountId: payload.actorAccountId || null, scope };
  const plans = [];
  for (const member of targets) {
    const refused = await guardMember(ctx, member, 'warn');
    plans.push(refused || { ...member, apply: true });
  }

  const { warnAccount } = require('../repositories/AdminUserTeamRepositories');
  const results = [];
  let first = null;
  const punishmentsStarted = [];
  for (const plan of plans) {
    if (!plan.apply) {
      results.push(plan);
      continue;
    }
    const { apply: _apply, ...member } = plan;
    try {
      const result = await warnAccount(
        member.accountId,
        {
          warningId: payload.warningId,
          type: payload.type,
          reason,
          activityContext: payload.activityContext,
          viaTeam: { accountId: String(team.account_id), name: teamName, asLeader: member.isLeader },
        },
        staffId
      );
      first = first || result;
      if (Array.isArray(result.punishmentsStarted)) {
        punishmentsStarted.push(...result.punishmentsStarted.map((row) => ({ ...row, accountId: member.accountId, memberName: member.name })));
      }
      results.push({ ...member, applied: true, violationId: result.violationId, violationNumber: result.violationNumber });
      await recordAccountActivity({
        accountId: team.account_id,
        action: `Warning issued to team ${member.isLeader ? 'leader' : 'member'} ${member.name}: ${result.type}`,
        eventCode: member.isLeader ? 'TEAM_LEADER_WARNED' : 'TEAM_MEMBER_WARNED',
        referenceTable: 'violations',
        referencePrefix: 'VIO',
        referenceId: result.violationId || result.violationNumber,
        actorStaffId: staffId,
        metadata: {
          ...(member.isLeader ? { leaderAccountId: member.accountId } : {}),
          memberAccountId: member.accountId,
          memberScope: scope,
          violationId: result.violationId,
          violationNumber: result.violationNumber,
          type: result.type,
          points: result.points,
          reason,
          ...(payload?.activityContext && typeof payload.activityContext === 'object' ? payload.activityContext : {}),
        },
      });
    } catch (err) {
      // The first person failing (bad catalog row, merit engine down) is a real error, not a skip.
      if (!first && !results.some((row) => row.applied)) throw err;
      console.warn('Team member warning failed:', err.message);
      results.push({ ...member, applied: false, skipped: 'failed', message: err.message });
    }
  }

  const applied = results.filter((row) => row.applied);
  if (!applied.length) {
    throw sanctionError(
      ['Nobody in scope could be warned.', ...describePersonResults(results, { scope, verbDone: 'Warned' })].join(' '),
      409,
      'TEAM_NOBODY_WARNED'
    );
  }
  const only = applied.length === 1 ? applied[0] : null;
  const summary = [
    `${first.type} (${first.points} pt) issued through Team ${teamName}.`,
    ...describePersonResults(results, { scope, verbDone: 'Warned' }),
    'Teams have no Platform Merit: each person carries the points on their own record.',
  ].join(' ');

  return {
    ...first,
    accountId: String(team.account_id),
    isTeam: true,
    teamAccountId: String(team.account_id),
    team: { accountId: String(team.account_id), name: teamName, status: team.account_status },
    memberScope: scope,
    members: results,
    warned: applied.length,
    punishmentsStarted,
    // Kept for callers that expect one recipient (report decisions on a team).
    issuedTo: only ? { accountId: only.accountId, name: only.name, handle: only.handle } : null,
    summary,
  };
}

/**
 * Forum timeouts aimed at a team: each person in scope is timed out (or, for clear, has the
 * timeout set with this team ended). Nothing changes on the team account itself.
 */
async function changeTeamTimeouts(team, key, staffId, options = {}) {
  const teamName = teamNameOf(team);
  const leader = leaderOf(team);
  const cleared = key.startsWith('clear');
  const reason = String(options.reason || '').trim();
  const { scope, explicit } = memberScopeOf(options);
  if (scope === 'leader' && !leader) throw noLeaderError(cleared ? 'clear a timeout for' : 'time out');
  const targets = await memberTargetsFor(team, leader, scope, options.memberAccountIds);
  if (!targets.length) throw sanctionError('This team has no active members.', 422, 'TEAM_NO_MEMBERS');

  if (!cleared) {
    // The named timeout and its clock are checked once, before anyone is timed out.
    const { actorRoleOf } = require('../lib/SuspendGuards');
    const { resolveStandingOptions } = require('./PunishmentDefServices');
    const { sanctionEndsAt } = require('../lib/AccountRestriction');
    const actorRole = await actorRoleOf({ staffId, actorAccountId: options.actorAccountId || null });
    sanctionEndsAt(await resolveStandingOptions(key, { ...options, actorRole }), 'temporary');
  }

  const ctx = { staffId, actorAccountId: options.actorAccountId || null, scope };
  const plans = [];
  for (const member of targets) {
    if (!cleared) {
      if (member.forumTimeout) {
        plans.push({ ...member, applied: false, skipped: 'already_timed_out', message: 'Already timed out.' });
        continue;
      }
      const refused = await guardMember(ctx, member, 'timeout');
      plans.push(refused || { ...member, apply: true });
      continue;
    }
    if (member.timeoutViaTeam) {
      const refused = await guardMember(ctx, member, 'restore');
      plans.push(refused || { ...member, apply: true });
    } else if (explicit && scope !== 'all' && member.forumTimeout) {
      plans.push({ ...member, applied: false, skipped: 'not_linked', message: 'Not set together with this team.' });
    }
  }

  const { updateAccountStatus } = require('../repositories/AdminUserTeamRepositories');
  const results = [];
  for (const plan of plans) {
    if (!plan.apply) {
      results.push(plan);
      continue;
    }
    const { apply: _apply, ...member } = plan;
    try {
      await updateAccountStatus(member.accountId, key, staffId, {
        ...options,
        viaTeamAccountId: String(team.account_id),
        viaTeamName: teamName,
        teamDirect: undefined,
        memberScope: undefined,
        memberAccountIds: undefined,
        reason: cleared
          ? `${reason} (lifted together with Team ${teamName})`
          : `${reason} (applied together with Team ${teamName}, ${member.isLeader ? 'which you lead' : 'which you are a member of'})`,
      });
      results.push({ ...member, applied: true });
      await recordAccountActivity({
        accountId: team.account_id,
        action: `${cleared ? 'Forum timeout cleared for' : 'Forum timeout applied to'} team ${member.isLeader ? 'leader' : 'member'} ${member.name}${reason ? `: ${reason}` : ''}`,
        eventCode: cleared
          ? member.isLeader ? 'TEAM_LEADER_TIMEOUT_CLEARED' : 'TEAM_MEMBER_TIMEOUT_CLEARED'
          : member.isLeader ? 'TEAM_LEADER_TIMEOUT' : 'TEAM_MEMBER_TIMEOUT',
        referenceTable: 'accounts',
        referencePrefix: 'ACC',
        referenceId: member.accountId,
        actorStaffId: staffId,
        metadata: {
          ...(member.isLeader ? { leaderAccountId: member.accountId } : {}),
          memberAccountId: member.accountId,
          memberScope: scope,
          reason: reason || null,
          ...(options.activityContext && typeof options.activityContext === 'object' ? options.activityContext : {}),
        },
      });
    } catch (err) {
      if (!results.some((row) => row.applied)) throw err;
      console.warn('Team member timeout failed:', err.message);
      results.push({ ...member, applied: false, skipped: 'failed', message: err.message });
    }
  }

  const describe = () =>
    describePersonResults(results, {
      scope,
      verbDone: cleared ? 'Forum timeout cleared for' : 'Forum timeout applied to',
      skipNotes: {
        already_timed_out: (one) => `${one ? 'is' : 'are'} already timed out and ${one ? 'was' : 'were'} left as is.`,
        not_linked: (one) => `${one ? 'has a timeout' : 'have timeouts'} not set together with this team, so ${one ? 'it stays' : 'they stay'}. Clear ${one ? 'it' : 'them'} from the Users tab.`,
      },
    });
  if (!results.some((row) => row.applied)) {
    const lead = cleared
      ? 'No member in scope has a forum timeout set together with this team.'
      : 'Nobody in scope could be timed out.';
    throw sanctionError([lead, ...describe()].join(' '), 409, cleared ? 'TEAM_NO_LINKED_TIMEOUTS' : 'TEAM_NOBODY_TIMED_OUT');
  }
  const leaderRow = results.find((row) => row.isLeader) || null;
  return {
    accountId: String(team.account_id),
    status: team.account_status,
    forumTimeout: !cleared,
    isTeam: true,
    team: { accountId: String(team.account_id), name: teamName, status: team.account_status },
    leader: leaderRow,
    memberScope: scope,
    members: results,
    summary: [...describe(), cleared ? '' : 'Teams never post in the forums, so the timeout is on each person.'].filter(Boolean).join(' '),
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

  // Teams never post in the forums: a timeout goes on the people in scope.
  if (TIMEOUT_KEYS.has(key)) return changeTeamTimeouts(team, key, staffId, options);

  const target = SANCTION_TARGET[key] || null;
  const isLift = Object.prototype.hasOwnProperty.call(LIFT_FROM, key);
  const { scope, explicit } = target || isLift ? memberScopeOf(options) : { scope: null, explicit: false };
  // Staff who pick the leader of a leaderless team would otherwise change the team alone.
  if (target && explicit && scope === 'leader' && !leader) {
    throw sanctionError('This team has no active leader. Pick specific members or all members instead.', 422, 'TEAM_NO_LEADER');
  }
  const targets = target || isLift ? await memberTargetsFor(team, leader, scope, options.memberAccountIds) : [];
  const ctx = { staffId, actorAccountId: options.actorAccountId || null, scope };
  const guard = (member, action) => guardMember(ctx, member, action);

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
 * A team's name, current leader (first active Owner), active members (with merit and forum
 * timeouts) and their merit added up, for staff screens that say who a team penalty reaches.
 * Null when the team does not exist.
 */
async function describeTeamLeader(teamAccountId) {
  const team = await TeamsRepositories.getTeamStanding(teamAccountId).catch(() => null);
  if (!team || String(team.account_id) !== String(teamAccountId)) return null;
  const leader = leaderOf(team);
  const rows = await TeamsRepositories.listTeamMemberStandings(team.account_id).catch(() => []);
  const members = rows.map(memberFromRow(leader));
  return {
    teamName: teamNameOf(team),
    status: team.account_status || null,
    leader,
    members,
    memberMerit: memberMeritSummary(members),
  };
}

module.exports = {
  warnTeam,
  // Older name: report decisions and other callers still import it.
  warnTeamLeader: warnTeam,
  changeTeamStanding,
  teamStandingMessage,
  describeTeamLeader,
  // Moved to TeamOwnershipServices; re-exported for older imports.
  transferTeamOwnership: (...args) => require('./TeamOwnershipServices').transferTeamOwnershipByStaff(...args),
};
