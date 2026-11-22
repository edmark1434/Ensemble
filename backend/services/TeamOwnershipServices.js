/**
 * Moving a team's ownership (docs/punishment-system.md §8.10, docs/api.md "Team ownership").
 *
 * Two doors, one set of rules:
 *  - The team's owner hands the team to an active member (`PATCH /api/teams/:teamId/transfer-ownership`)
 *    and becomes a team Admin or Member.
 *  - Admin / Support move it from the Teams desk (`POST /api/admin/teams/:accountId/transfer-ownership`),
 *    e.g. when the leader is banned or gone; the previous owner becomes Admin, Member or leaves.
 *
 * Either way the new owner must be an active member whose own account is Active (a restricted
 * owner would pause the team), contract workspaces are client-led and never change hands, and the
 * roster update is one locked transaction. Afterwards the team record gets
 * `TEAM_OWNERSHIP_TRANSFERRED`, both owners and the team's managers are told, team chat roles and
 * team video project access follow, and open team pages refresh (`team:standing_changed`).
 */
const TeamsRepositories = require('../repositories/TeamsRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAFF_PREVIOUS_ROLES = new Set(['Admin', 'Member', 'Removed']);
const OWNER_PREVIOUS_ROLES = new Set(['Admin', 'Member']);
const NOTE_MAX = 1000;

function ownershipError(message, statusCode = 400, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

function teamNameOf(team) {
  return team?.display_name || team?.handle || 'this team';
}

async function loadTeam(teamIdOrAccountId) {
  const team = await TeamsRepositories.getTeamStanding(teamIdOrAccountId);
  if (!team) throw ownershipError('Team not found', 404, 'TEAM_NOT_FOUND');
  if (String(team.team_type || 'standard') === 'contractual') {
    throw ownershipError(
      'Contract workspaces are led by their client and cannot change owner.',
      422,
      'TEAM_CONTRACT_WORKSPACE'
    );
  }
  return team;
}

/** The member who will lead: an active member of this team whose own account is Active. */
async function loadNewOwner(team, newOwnerAccountId) {
  const accountId = String(newOwnerAccountId || '').trim();
  if (!UUID_RE.test(accountId)) throw ownershipError('Pick the member who will own the team', 422, 'TEAM_OWNER_REQUIRED');
  const membership = await TeamsRepositories.getMembership(team.team_id, accountId);
  if (!membership || membership.status !== 'Active' || membership.deleted_at) {
    throw ownershipError('The new owner must be an active member of this team', 422, 'TEAM_OWNER_NOT_MEMBER');
  }
  if (membership.role === 'Owner') throw ownershipError('That member already owns this team', 409, 'TEAM_OWNER_ALREADY');
  const { getAccountById } = require('../repositories/AccountRepositories');
  const account = await getAccountById(accountId);
  if (!account || account.deleted_at) throw ownershipError('That account no longer exists', 404);
  const status = String(account.status || '').toLowerCase();
  if (status !== 'active') {
    throw ownershipError(
      `That member's account is ${status || 'not active'}. Pick a member in good standing to lead the team.`,
      409,
      'TEAM_OWNER_RESTRICTED'
    );
  }
  return {
    accountId,
    userId: membership.user_id,
    role: membership.role,
    name: account.display_name || (account.handle ? `@${account.handle}` : 'the new owner'),
    handle: account.handle || null,
  };
}

function cleanNote(value, { required }) {
  const note = String(value || '').replace(/\s+/g, ' ').trim();
  if (required && note.length < 5) throw ownershipError('Write why ownership is moving (at least 5 characters)', 422);
  if (note.length > NOTE_MAX) throw ownershipError(`Keep the reason under ${NOTE_MAX.toLocaleString()} characters`, 422);
  return note;
}

function roleAfterLabel(role) {
  if (role === 'Removed') return 'You are no longer a member of the team.';
  return `You are now a team ${role}.`;
}

/**
 * Notices, team chat roles, project access and the live refresh. Each step is best effort: the
 * transfer itself is already committed.
 */
async function announceOwnershipTransfer({ team, newOwner, previousOwners, previousOwnerRole, note, byStaff, actorName }) {
  const teamName = teamNameOf(team);
  const why = note ? ` ${byStaff ? 'Reason' : 'Note'}: ${note}` : '';
  const by = byStaff ? 'Support' : actorName || 'The previous owner';
  const { createNotification } = require('../repositories/NotificationRepositories');
  let io = null;
  try {
    io = require('../lib/WebSocket').getIo();
  } catch (_err) {
    io = null;
  }

  const previousIds = previousOwners.map((owner) => owner.accountId).filter((id) => id !== newOwner.accountId);
  const notices = [
    {
      accountId: newOwner.accountId,
      message: `${by} made you the owner (leader) of Team ${teamName}. You now pay out the team wallet, answer for the team's standing and get its notices.${why}`,
    },
    ...previousIds.map((accountId) => ({
      accountId,
      message: byStaff
        ? `Support transferred ownership of Team ${teamName} to ${newOwner.name}. ${roleAfterLabel(previousOwnerRole)}${why}`
        : `You handed Team ${teamName} to ${newOwner.name}. ${roleAfterLabel(previousOwnerRole)}`,
    })),
  ];
  // The team's other Admins hear who leads now (read after the change, so the new owner is in it).
  const told = new Set(notices.map((notice) => notice.accountId));
  const managers = await TeamsRepositories.getTeamManagerAccountIds(team.account_id).catch(() => []);
  for (const accountId of managers.map(String)) {
    if (told.has(accountId)) continue;
    notices.push({ accountId, message: `${newOwner.name} now owns Team ${teamName}${byStaff ? ' (moved by Support)' : ''}.` });
  }

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
  void TeamsRepositories.ensureTeamMembersHaveProjectAccess(team.team_id).catch((err) =>
    console.warn('Team project access after transfer failed:', err.message)
  );

  // Open team pages (members, and a previous owner who just left) reload roles and buttons.
  if (io) {
    try {
      const { teamStandingSummary } = require('./TeamStandingServices');
      const refreshed = await TeamsRepositories.getTeamStanding(team.account_id);
      const members = await TeamsRepositories.getActiveTeamMemberAccountIds(team.account_id);
      const payload = {
        teamId: String(team.team_id),
        teamAccountId: String(team.account_id),
        event: 'ownership_transferred',
        standing: refreshed ? teamStandingSummary(refreshed) : null,
      };
      for (const accountId of new Set([...members.map(String), ...previousIds])) {
        io.to(accountId).emit('team:standing_changed', payload);
      }
    } catch (err) {
      console.warn('Ownership transfer broadcast skipped:', err.message);
    }
  }
}

/**
 * Admin / Support move a team's ownership, e.g. when the leader is banned or gone. Works while
 * the team is suspended, locked or banned: that is when it is needed most.
 * @param {string} teamAccountId
 * @param {{ newOwnerAccountId: string, previousOwnerRole?: 'Admin'|'Member'|'Removed', reason: string }} input
 */
async function transferTeamOwnershipByStaff(teamAccountId, input = {}, staffId = null, actorAccountId = null) {
  const team = await loadTeam(teamAccountId);
  if (String(team.account_id) !== String(teamAccountId)) throw ownershipError('Team not found', 404, 'TEAM_NOT_FOUND');
  const reason = cleanNote(input.reason, { required: true });
  const previousOwnerRole = STAFF_PREVIOUS_ROLES.has(input.previousOwnerRole) ? input.previousOwnerRole : 'Member';
  if (actorAccountId && String(actorAccountId) === String(input.newOwnerAccountId || '').trim()) {
    throw ownershipError('You cannot transfer a team to your own account', 403);
  }
  const newOwner = await loadNewOwner(team, input.newOwnerAccountId);
  const previousOwner = team.owner_account_id
    ? { accountId: String(team.owner_account_id), name: team.owner_name || team.owner_handle || 'the previous owner' }
    : null;

  const { previousOwnerAccountIds } = await TeamsRepositories.transferOwnershipByStaff(
    team.team_id,
    newOwner.userId,
    previousOwnerRole
  );
  const previousOwners = previousOwnerAccountIds.map((accountId) => ({
    accountId,
    name: previousOwner && previousOwner.accountId === accountId ? previousOwner.name : null,
  }));

  await recordAccountActivity({
    accountId: team.account_id,
    action: `Ownership transferred by staff to ${newOwner.name}${previousOwner ? ` (from ${previousOwner.name})` : ''}: ${reason}`,
    eventCode: 'TEAM_OWNERSHIP_TRANSFERRED',
    referenceTable: 'teams',
    referencePrefix: 'TEAM',
    referenceId: team.team_id,
    actorStaffId: staffId,
    actorAccountId,
    metadata: {
      by: 'staff',
      newOwnerAccountId: newOwner.accountId,
      newOwnerPreviousRole: newOwner.role,
      previousOwnerAccountIds,
      previousOwnerRole,
      reason,
    },
  });

  await announceOwnershipTransfer({ team, newOwner, previousOwners, previousOwnerRole, note: reason, byStaff: true });

  return {
    teamId: String(team.team_id),
    teamAccountId: String(team.account_id),
    newOwner: { accountId: newOwner.accountId, name: newOwner.name, handle: newOwner.handle },
    previousOwnerAccountIds,
    previousOwnerRole,
  };
}

/**
 * The team's owner hands it to an active member. The team must be allowed to change hands
 * (not suspended, locked or banned), and the new owner must have room for another team on their
 * plan (owned teams count against the plan's team limit, the same as creating one).
 * @param {string} teamId
 * @param {string} actorAccountId the current owner
 * @param {{ accountId: string, previousOwnerRole?: 'Admin'|'Member', note?: string }} input
 */
async function transferTeamOwnershipByOwner(teamId, actorAccountId, input = {}) {
  const team = await loadTeam(teamId);
  const mine = await TeamsRepositories.getMembership(team.team_id, actorAccountId);
  if (!mine || mine.role !== 'Owner' || mine.status !== 'Active') {
    throw ownershipError('Only the team owner can transfer ownership', 403, 'TEAM_OWNER_ONLY');
  }
  const { assertTeamAllows } = require('./TeamStandingServices');
  await assertTeamAllows(team.team_id, 'transfer');
  if (String(input.accountId || '').trim() === String(actorAccountId)) {
    throw ownershipError('You already own this team. Pick another member.', 422);
  }
  const newOwner = await loadNewOwner(team, input.accountId);
  const previousOwnerRole = OWNER_PREVIOUS_ROLES.has(input.previousOwnerRole) ? input.previousOwnerRole : 'Admin';
  const note = cleanNote(input.note, { required: false });

  const limit = await TeamsRepositories.getTeamCreationEligibility(newOwner.accountId).catch(() => null);
  if (limit && limit.allowed === false) {
    throw ownershipError(
      `${newOwner.name} already owns as many teams as their plan allows${limit.limit != null ? ` (${limit.limit})` : ''}. They need to upgrade or hand over another team first.`,
      409,
      'TEAM_OWNER_LIMIT_REACHED'
    );
  }

  await TeamsRepositories.transferOwnership(team.team_id, mine.user_id, newOwner.userId, previousOwnerRole);
  const actorName = mine.display_name || (mine.handle ? `@${mine.handle}` : 'The previous owner');

  await recordAccountActivity({
    accountId: team.account_id,
    action: `Ownership handed by ${actorName} to ${newOwner.name}${note ? `: ${note}` : ''}`,
    eventCode: 'TEAM_OWNERSHIP_TRANSFERRED',
    referenceTable: 'teams',
    referencePrefix: 'TEAM',
    referenceId: team.team_id,
    actorAccountId,
    metadata: {
      by: 'owner',
      newOwnerAccountId: newOwner.accountId,
      newOwnerPreviousRole: newOwner.role,
      previousOwnerAccountIds: [String(actorAccountId)],
      previousOwnerRole,
      note: note || null,
    },
  });

  await announceOwnershipTransfer({
    team,
    newOwner,
    previousOwners: [{ accountId: String(actorAccountId), name: actorName }],
    previousOwnerRole,
    note,
    byStaff: false,
    actorName,
  });

  return {
    teamId: String(team.team_id),
    newOwner: { accountId: newOwner.accountId, name: newOwner.name, handle: newOwner.handle },
    previousOwnerRole,
  };
}

module.exports = {
  transferTeamOwnershipByStaff,
  transferTeamOwnershipByOwner,
};
