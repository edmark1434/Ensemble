/**
 * Team members in contract disputes (docs/api.md "Contract disputes", docs/punishment-system.md §8.6).
 *
 * Who can name people: only the **client**, filing against the **freelancer side**. A contract
 * has one client account and one freelancer account; the freelancer side is often a group:
 *  - a team account (its active members; the leader is its first active Owner), and/or
 *  - the contract's workspace team (`teams.team_type = 'contractual'`): included members and
 *    subcontractors working this contract. The workspace Owner is the client and is never listed.
 * The client picks who answers for that side: the team leader (default; a personal freelancer
 * leads their own side), specific people, or everyone. A freelancer filing against the client
 * names nobody: the client is one account (a team that ordered a gig is still one party; staff
 * pick who on it gets a penalty when they decide the case).
 *
 * What naming does:
 *  - Named people (and the Owners / Admins of a team party) see the case in Cases once it is
 *    public, answer it as the disputee, and are told when it opens and when it is decided.
 *  - A dispute ban reaches the named people by default. Staff can pick the leader, specific
 *    people or everyone on the side instead. Team accounts go through TeamSanctionServices, so
 *    the team rules hold (a team penalty always reaches people, stricter standings stay,
 *    accounts staff may not act on stop the action unless everyone was picked).
 *  - Staff (handler or Admin) can change who is named while the case is open.
 */
const { pool } = require('../lib/Database');
const Repo = require('../repositories/DisputeMemberRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');

const MEMBER_SCOPES = new Set(['leader', 'selected', 'all']);
const MAX_PICKS = 200;
const MAX_STANDING_LOOKUPS = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function memberError(message, statusCode = 422, code = 'DISPUTE_MEMBERS_INVALID') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function isTeamAccount(account) {
  return Boolean(account?.team_id) && String(account?.type || '').toLowerCase() === 'team';
}

function nameOf(row) {
  return row?.display_name || row?.handle || 'Member';
}

function labelOf(person) {
  if (!person) return 'a member';
  return person.handle ? `@${person.handle}` : person.name || 'a member';
}

function sideSummary(account) {
  if (!account) return null;
  const team = isTeamAccount(account);
  return {
    accountId: String(account.account_id),
    name: nameOf(account),
    handle: account.handle || null,
    avatar: account.avatar_path || null,
    isTeam: team,
    teamType: team ? account.team_type || 'standard' : null,
    status: String(account.status || 'Active'),
  };
}

/** A friendly role line: the team role, the contract role, or both. */
function contractRoleFor(row) {
  if (row.subcontract_role) return row.subcontract_role;
  if (row.role === 'Subcontractor') return 'Subcontractor';
  if (row.role === 'Member') return 'Contributor';
  return row.role || null;
}

/** A team account's own roster, as people. The leader is its first active Owner. */
async function loadTeamRoster(account, db = pool) {
  const rows = await Repo.listActiveTeamMembers(account.team_id, db);
  const owner = rows.find((row) => row.role === 'Owner') || null;
  return {
    team: {
      accountId: String(account.account_id),
      teamId: String(account.team_id),
      name: nameOf(account),
      handle: account.handle || null,
      avatar: account.avatar_path || null,
      status: String(account.status || 'Active'),
      teamType: account.team_type || 'standard',
      memberCount: rows.length,
    },
    rows,
    leaderId: owner ? String(owner.account_id) : null,
  };
}

/**
 * The freelancer side of a contract as people, or null when it is one person working alone.
 * @param {{ contractId: string, parties: object, excludeAccountIds?: string[], db?: object }} input
 */
async function loadFreelancerSide({ contractId, parties, excludeAccountIds = [], db = pool }) {
  const [freelancer, client] = await Promise.all([
    Repo.getSideAccount(parties.freelancer_account_id, db),
    Repo.getSideAccount(parties.client_account_id, db),
  ]);
  if (!freelancer) return null;
  const excluded = new Set([...excludeAccountIds, parties.client_account_id].filter(Boolean).map(String));
  const members = new Map();
  const add = (row, { source, teamRole = null, contractRole = null, teamAccountId = null }) => {
    const id = String(row.account_id);
    if (excluded.has(id)) return;
    const current = members.get(id);
    if (current) {
      if (!current.sources.includes(source)) current.sources.push(source);
      current.teamRole = current.teamRole || teamRole;
      current.contractRole = current.contractRole || contractRole;
      current.teamAccountId = current.teamAccountId || teamAccountId;
      return;
    }
    members.set(id, {
      accountId: id,
      name: nameOf(row),
      handle: row.handle || null,
      avatar: row.avatar_path || null,
      status: String(row.status || 'Active'),
      teamRole,
      contractRole,
      sources: [source],
      teamAccountId,
      isLeader: false,
    });
  };

  let team = null;
  let leaderId = null;
  if (isTeamAccount(freelancer)) {
    const roster = await loadTeamRoster(freelancer, db);
    team = roster.team;
    leaderId = roster.leaderId;
    roster.rows.forEach((row) =>
      add(row, { source: 'team', teamRole: row.role, teamAccountId: String(freelancer.account_id) })
    );
  } else {
    // A personal freelancer leads their own side.
    leaderId = String(freelancer.account_id);
    add(freelancer, { source: 'contract', contractRole: 'Freelancer' });
  }

  let contractTeam = null;
  const workspace = await Repo.getContractWorkspaceTeam(contractId, db);
  if (workspace) {
    contractTeam = {
      accountId: String(workspace.account_id),
      teamId: String(workspace.team_id),
      name: workspace.display_name || 'Contract workspace',
      handle: workspace.handle || null,
    };
    const rows = await Repo.listWorkspaceFreelancerSide(
      {
        workspaceTeamId: workspace.team_id,
        contractId,
        clientAccountId: parties.client_account_id,
        clientTeamId: isTeamAccount(client) ? client.team_id : null,
      },
      db
    );
    rows.forEach((row) =>
      add(row, { source: 'contract', contractRole: contractRoleFor(row), teamAccountId: String(workspace.account_id) })
    );
  }

  const leader = leaderId ? members.get(leaderId) || null : null;
  if (leader) leader.isLeader = true;
  // One person on their own is not a group: there is nobody else to name.
  if (!team && members.size <= 1) return null;

  // Leader first, then people working this contract, then the rest of the team.
  const order = (member) => (member.isLeader ? 0 : member.sources.includes('contract') ? 1 : 2);
  const list = [...members.values()].sort((a, b) => order(a) - order(b));
  return {
    side: 'freelancer',
    respondent: sideSummary(freelancer),
    team,
    contractTeam,
    leader,
    members: list,
  };
}

/** A team that is not the freelancer side (it ordered a gig): its roster, for the ban scope only. */
async function loadTeamSide(account, db = pool) {
  const roster = await loadTeamRoster(account, db);
  const members = roster.rows.map((row) => ({
    accountId: String(row.account_id),
    name: nameOf(row),
    handle: row.handle || null,
    avatar: row.avatar_path || null,
    status: String(row.status || 'Active'),
    teamRole: row.role,
    contractRole: null,
    sources: ['team'],
    teamAccountId: String(account.account_id),
    isLeader: String(row.account_id) === roster.leaderId,
  }));
  return {
    side: 'client',
    respondent: sideSummary(account),
    team: roster.team,
    contractTeam: null,
    leader: members.find((member) => member.isLeader) || null,
    members,
  };
}

/** What the filer sees: no account standing, only who the people are and how they relate. */
function publicMember(member) {
  return {
    accountId: member.accountId,
    name: member.name,
    handle: member.handle,
    avatar: member.avatar,
    teamRole: member.teamRole,
    contractRole: member.contractRole,
    onContract: member.sources.includes('contract'),
    onTeam: member.sources.includes('team'),
    isLeader: Boolean(member.isLeader),
  };
}

function sourceOf(member) {
  if (member.sources.length > 1) return 'both';
  return member.sources[0] === 'contract' ? 'contract' : 'team';
}

function toMemberRow(member, group) {
  return {
    accountId: member.accountId,
    teamAccountId: member.teamAccountId || group.team?.accountId || group.contractTeam?.accountId || null,
    teamRole: member.teamRole || member.contractRole || null,
    isLeader: Boolean(member.isLeader),
    source: sourceOf(member),
  };
}

function normalizeScope(value) {
  const scope = String(value || '').trim().toLowerCase();
  if (scope && !MEMBER_SCOPES.has(scope)) {
    throw memberError('Pick the team leader, specific people or everyone.', 422, 'DISPUTE_MEMBER_SCOPE_INVALID');
  }
  return scope;
}

function chosenIds(value) {
  const list = Array.isArray(value) ? value : [];
  const ids = [...new Set(list.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) throw memberError('Pick at least one person.', 422, 'DISPUTE_MEMBERS_REQUIRED');
  if (ids.length > MAX_PICKS) throw memberError(`Pick at most ${MAX_PICKS} people.`, 422);
  if (ids.some((id) => !UUID_RE.test(id))) throw memberError('One of the picked people is not a valid account.', 422);
  return ids;
}

/** The people a scope picks from a roster. Throws 422 with a plain reason when it cannot. */
function pickMembers({ leader, members }, scope, memberAccountIds, { sideName = 'this team' } = {}) {
  if (scope === 'leader') {
    if (!leader) {
      throw memberError(
        `${sideName} has no active leader. Pick specific people or everyone instead.`,
        422,
        'DISPUTE_MEMBERS_NO_LEADER'
      );
    }
    return [leader];
  }
  if (scope === 'all') return members;
  const wanted = chosenIds(memberAccountIds);
  const byId = new Map(members.map((member) => [member.accountId, member]));
  const missing = wanted.filter((id) => !byId.has(id));
  if (missing.length) {
    throw memberError(
      `${missing.length === 1 ? 'One picked person is' : `${missing.length} picked people are`} no longer on ${sideName}. Refresh and pick again.`,
      422,
      'DISPUTE_MEMBERS_NOT_FOUND'
    );
  }
  return wanted.map((id) => byId.get(id));
}

/** Which account the person files as on this contract: the same rule as the filing itself. */
function filingAccountOf(parties, actorAccountIds) {
  return (actorAccountIds || []).find(
    (id) =>
      String(id) === String(parties.client_account_id) || String(id) === String(parties.freelancer_account_id)
  );
}

/**
 * `GET /api/contracts/:contractId/dispute-members`: the dispute form's "who answers on their side".
 */
async function getFilingMemberOptions({ contractId, actorAccountIds, personalAccountId }) {
  if (!UUID_RE.test(String(contractId || ''))) throw memberError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
  const parties = await Repo.getContractParties(contractId);
  if (!parties) throw memberError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
  const filingAs = filingAccountOf(parties, actorAccountIds);
  if (!filingAs) throw memberError('You are not a party to this contract.', 403, 'NOT_A_PARTY');
  const viewerSide = String(filingAs) === String(parties.client_account_id) ? 'client' : 'freelancer';
  const respondentId = viewerSide === 'client' ? parties.freelancer_account_id : parties.client_account_id;
  const [me, other] = await Promise.all([Repo.getSideAccount(filingAs), Repo.getSideAccount(respondentId)]);
  const group =
    viewerSide === 'client'
      ? await loadFreelancerSide({ contractId, parties, excludeAccountIds: [personalAccountId] })
      : null;
  return {
    contractId: String(contractId),
    viewerSide,
    filingAs: sideSummary(me),
    respondent: sideSummary(other),
    canNameMembers: Boolean(group),
    reason: group
      ? null
      : viewerSide !== 'client'
        ? 'You are disputing the client, who is one party on this contract.'
        : 'The freelancer works on this contract alone.',
    group: group
      ? {
          team: group.team,
          contractTeam: group.contractTeam,
          leader: group.leader ? publicMember(group.leader) : null,
          members: group.members.map(publicMember),
        }
      : null,
    // Sanctions follow the team rules: the leader answers, or everyone when nobody leads.
    defaultScope: group ? (group.leader ? 'leader' : 'all') : null,
  };
}

/**
 * The people a client names when filing, checked against the live roster. Null when nothing is
 * named (the filer is the freelancer, or the freelancer works alone).
 */
async function resolveFilingMembers({ db = pool, contractId, parties, filerAccountId, personalAccountId, memberScope, memberAccountIds }) {
  const raw = normalizeScope(memberScope);
  if (String(filerAccountId) !== String(parties.client_account_id)) {
    if (raw === 'selected' || raw === 'all') {
      throw memberError(
        'Only the client can name team members, when disputing the freelancer side.',
        422,
        'DISPUTE_MEMBERS_CLIENT_ONLY'
      );
    }
    return null;
  }
  const group = await loadFreelancerSide({ contractId, parties, excludeAccountIds: [personalAccountId], db });
  if (!group) return null;
  const scope = raw || (group.leader ? 'leader' : 'all');
  const sideName = group.team ? `Team ${group.team.name}` : 'this contract';
  const picks = pickMembers(group, scope, memberAccountIds, { sideName });
  return { scope, group, members: picks.map((member) => toMemberRow(member, group)), people: picks };
}

/** "@lead (leader), @a, @b and 3 more". */
function describePeople(people, max = 6) {
  const names = people.map((person) => `${labelOf(person)}${person.isLeader ? ' (leader)' : ''}`);
  return names.length > max ? `${names.slice(0, max).join(', ')} and ${names.length - max} more` : names.join(', ');
}

/** Account standing for up to MAX_STANDING_LOOKUPS people, from the shared staff case summary. */
async function standingFor(accountIds) {
  const ids = [...new Set(accountIds.filter(Boolean).map(String))].slice(0, MAX_STANDING_LOOKUPS);
  const map = new Map();
  if (!ids.length) return map;
  const { getDisputePartyStanding } = require('../repositories/TicketCaseRepositories');
  const pairs = [];
  for (let i = 0; i < ids.length; i += 2) pairs.push([ids[i], ids[i + 1] || null]);
  const results = await Promise.all(pairs.map(([a, b]) => getDisputePartyStanding(a, b).catch(() => null)));
  results.forEach((result, index) => {
    const [a, b] = pairs[index];
    if (result?.initiator) map.set(a, result.initiator);
    if (b && result?.respondent) map.set(b, result.respondent);
  });
  return map;
}

/**
 * The disputee side for staff: roster, who is named (and who was taken off), the leader, the
 * team wallet with what this contract owes its members, and the ban's default reach.
 * Null when the disputee is one person with nobody else around them.
 */
async function getDisputeRespondentGroup(row, { standing = true } = {}) {
  if (!row?.dispute_id || !row.for_account_id) return null;
  const named = await Repo.listDisputeMembers(row.dispute_id, { includeRemoved: true });
  const parties = row.contract_id ? await Repo.getContractParties(row.contract_id) : null;
  const forId = String(row.for_account_id);
  const side = parties
    ? forId === String(parties.freelancer_account_id)
      ? 'freelancer'
      : forId === String(parties.client_account_id)
        ? 'client'
        : null
    : null;
  const disputerIsClient = Boolean(parties && String(row.by_account_id) === String(parties.client_account_id));

  let group = null;
  if (side === 'freelancer') {
    group = await loadFreelancerSide({ contractId: row.contract_id, parties, excludeAccountIds: [row.by_account_id] });
  }
  if (!group) {
    const account = await Repo.getSideAccount(row.for_account_id);
    if (isTeamAccount(account)) group = await loadTeamSide(account);
  }
  const activeNamed = named.filter((entry) => !entry.removed_at);
  if (!group && !activeNamed.length) return null;

  const respondent = group?.respondent || sideSummary(await Repo.getSideAccount(row.for_account_id));
  const roster = group ? group.members.map((member) => ({ ...member, onRoster: true })) : [];
  const byId = new Map(roster.map((member) => [member.accountId, member]));
  for (const entry of activeNamed) {
    const id = String(entry.account_id);
    const current = byId.get(id);
    const namedInfo = {
      named: true,
      namedBy: entry.named_by,
      namedAt: entry.created_at,
      namedByStaff: entry.added_by_staff_name || null,
    };
    if (current) {
      Object.assign(current, namedInfo);
      continue;
    }
    // Named, but no longer on the team or the contract (left, or removed from the roster).
    const person = {
      accountId: id,
      name: nameOf(entry),
      handle: entry.handle || null,
      avatar: entry.avatar_path || null,
      status: String(entry.status || 'Active'),
      teamRole: entry.team_role || null,
      contractRole: null,
      sources: [],
      teamAccountId: entry.team_account_id ? String(entry.team_account_id) : null,
      isLeader: false,
      onRoster: false,
      ...namedInfo,
    };
    roster.push(person);
    byId.set(id, person);
  }

  const standings = standing
    ? await standingFor([...activeNamed.map((entry) => entry.account_id), group?.leader?.accountId])
    : new Map();
  let wallet = null;
  if (group?.team) {
    try {
      wallet = await Repo.teamWalletForContract({
        teamAccountId: group.team.accountId,
        teamId: group.team.teamId,
        contractId: row.contract_id || null,
      });
    } catch (err) {
      console.warn('Dispute team wallet skipped:', err.message);
    }
  }

  const members = roster.map((member) => ({
    accountId: member.accountId,
    name: member.name,
    handle: member.handle,
    avatar: member.avatar,
    status: member.status,
    teamRole: member.teamRole,
    contractRole: member.contractRole,
    teamAccountId: member.teamAccountId || null,
    onTeam: member.sources.includes('team'),
    onContract: member.sources.includes('contract'),
    onRoster: member.onRoster !== false,
    isLeader: Boolean(member.isLeader),
    named: Boolean(member.named),
    namedBy: member.namedBy || null,
    namedAt: member.namedAt || null,
    namedByStaff: member.namedByStaff || null,
    standing: standings.get(member.accountId) || null,
  }));
  const namedIds = members.filter((member) => member.named).map((member) => member.accountId);
  const leaderId = group?.leader?.accountId || null;
  // The ban reaches who the disputer named; the leader when they named nobody else.
  const onlyLeaderNamed = namedIds.length === 1 && namedIds[0] === leaderId;
  const banDefault = namedIds.filter((id) => id !== forId).length && !onlyLeaderNamed
    ? { scope: 'selected', memberAccountIds: namedIds.filter((id) => id !== forId) }
    : leaderId
      ? { scope: 'leader', memberAccountIds: [] }
      : { scope: 'all', memberAccountIds: [] };

  return {
    side: side || group?.side || null,
    respondent,
    team: group?.team ? { ...group.team, wallet } : null,
    contractTeam: group?.contractTeam || null,
    leader: leaderId ? members.find((member) => member.accountId === leaderId) || null : null,
    // Only a client disputing the freelancer side names people; staff may change them then.
    canName: Boolean(side === 'freelancer' && disputerIsClient && group),
    filedScope: row.respondent_member_scope || null,
    members,
    namedCount: namedIds.length,
    removed: named
      .filter((entry) => entry.removed_at)
      .map((entry) => ({
        accountId: String(entry.account_id),
        name: nameOf(entry),
        handle: entry.handle || null,
        removedAt: entry.removed_at,
        reason: entry.removed_reason || null,
        removedBy: entry.removed_by_staff_name || null,
      })),
    banDefault,
  };
}

/**
 * Personal accounts that receive a dispute's notices and live updates for one side. A team
 * account has no inbox, so its notices go to its active Owners and Admins. The disputee side
 * also reaches the named people once the case is public (`includeNamed` overrides that).
 * @param {{ dispute_id: string, by_account_id?: string, for_account_id?: string, visibility?: boolean }} row
 * @param {'disputer'|'disputee'|'both'} side
 */
async function disputeSideRecipients(row, side = 'both', { includeNamed = null } = {}) {
  const accounts = (side === 'disputer' ? [row?.by_account_id] : side === 'disputee' ? [row?.for_account_id] : [row?.by_account_id, row?.for_account_id])
    .filter(Boolean)
    .map(String);
  try {
    const out = new Set();
    const teams = await Repo.teamCaseRecipients(accounts);
    for (const id of accounts) {
      if (teams.has(id)) teams.get(id).forEach((person) => out.add(person));
      else out.add(id);
    }
    const withNamed = includeNamed === null ? Boolean(row?.visibility) : Boolean(includeNamed);
    if (side !== 'disputer' && withNamed && row?.dispute_id) {
      (await Repo.listNamedMemberAccountIds(row.dispute_id)).forEach((id) => out.add(id));
    }
    return [...out];
  } catch (err) {
    console.warn('Dispute recipients fell back to the party accounts:', err.message);
    return accounts;
  }
}

/** The personal accounts behind some party accounts (teams → their Owners and Admins). */
async function expandPartyAccounts(accountIds) {
  const ids = [...new Set((accountIds || []).filter(Boolean).map(String))];
  if (!ids.length) return [];
  try {
    const teams = await Repo.teamCaseRecipients(ids);
    const out = new Set();
    for (const id of ids) {
      if (teams.has(id)) teams.get(id).forEach((person) => out.add(person));
      else out.add(id);
    }
    return [...out];
  } catch (err) {
    console.warn('Dispute party expansion skipped:', err.message);
    return ids;
  }
}

/**
 * Live targets for one dispute message: the accounts the caller named, with team accounts turned
 * into their Owners and Admins, plus the named people when the message reaches the disputee side.
 */
async function expandMessageTargets(disputeId, accountIds, audience) {
  const expanded = new Set(await expandPartyAccounts(accountIds));
  const value = String(audience || '').toLowerCase();
  if (disputeId && ['disputee', 'parties', 'public'].includes(value)) {
    try {
      (await Repo.listNamedMemberAccountIds(disputeId)).forEach((id) => expanded.add(id));
    } catch (err) {
      console.warn('Dispute named-member targets skipped:', err.message);
    }
  }
  return [...expanded];
}

/** How a person relates to a dispute; see `Repo.getDisputeViewer`. */
async function resolveDisputeViewer(disputeId, personAccountId) {
  const viewer = await Repo.getDisputeViewer(disputeId, personAccountId);
  const isFiler = viewer.isFiler;
  return {
    isFiler,
    isRespondent: !isFiler && (viewer.actsForRespondent || viewer.namedMember),
    actsForRespondent: !isFiler && viewer.actsForRespondent,
    namedMember: !isFiler && viewer.namedMember,
  };
}

/* ------------------------------------------------------------------ */
/* Staff: change who is named                                          */
/* ------------------------------------------------------------------ */

async function notifyNamedPeople(row, accountIds, sideName) {
  if (!accountIds.length || !row.visibility) return;
  const { notifyDisputeAccount } = require('../repositories/DisputeChatRepositories');
  const number = row.dispute_number || 'a dispute';
  for (const accountId of accountIds) {
    await notifyDisputeAccount(accountId, row.dispute_id, {
      message: `You are named in dispute ${number} with ${sideName}. Please give your side in Cases.`,
    });
  }
}

/**
 * Staff change who is named on the disputee side (handler or Admin, open case). Picks come from
 * the live roster, like at filing. Taken-off people keep a removed row for the record.
 * @returns {Promise<{ changed: boolean, scope: string, added: object[], removed: object[] }>}
 */
async function setDisputeMembersByStaff(row, input = {}, staff) {
  if (String(row.status || '').toLowerCase() === 'closed') {
    throw memberError('This dispute is closed. Reopen it before changing who is named.', 400, 'DISPUTE_CLOSED');
  }
  const group = await getDisputeRespondentGroup(row, { standing: false });
  if (!group?.canName) {
    throw memberError(
      'People can be named only when the client disputes the freelancer side and that side is a team.',
      400,
      'DISPUTE_MEMBERS_NOT_NAMEABLE'
    );
  }
  const scope = normalizeScope(input.memberScope) || 'selected';
  const roster = group.members.filter((member) => member.onRoster);
  const sideName = group.team ? `Team ${group.team.name}` : 'this contract';
  const picks = pickMembers({ leader: group.leader, members: roster }, scope, input.memberAccountIds, { sideName });
  const current = group.members.filter((member) => member.named).map((member) => member.accountId);
  const next = picks.map((member) => member.accountId);
  const added = picks.filter((member) => !current.includes(member.accountId));
  const removed = group.members.filter((member) => member.named && !next.includes(member.accountId));
  if (!added.length && !removed.length && scope === (row.respondent_member_scope || '')) {
    return { changed: false, scope, added: [], removed: [] };
  }

  const groupForRows = { team: group.team, contractTeam: group.contractTeam };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT 1 FROM disputes WHERE dispute_id = $1 FOR UPDATE`, [row.dispute_id]);
    if (added.length) {
      await Repo.insertDisputeMembers(
        client,
        row.dispute_id,
        added.map((member) =>
          toMemberRow({ ...member, sources: [member.onTeam ? 'team' : null, member.onContract ? 'contract' : null].filter(Boolean) }, groupForRows)
        ),
        { namedBy: 'staff', addedByStaffId: staff.staff_id }
      );
    }
    if (removed.length) {
      await Repo.removeDisputeMembers(client, row.dispute_id, removed.map((member) => member.accountId), {
        staffId: staff.staff_id,
        reason: 'staff_removed',
      });
    }
    await Repo.setRespondentMemberScope(client, row.dispute_id, scope);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  await recordAccountActivity({
    accountId: row.for_account_id,
    action: `Dispute ${row.dispute_number || row.dispute_id}: named people changed${
      added.length ? ` (added ${describePeople(added)})` : ''
    }${removed.length ? ` (removed ${describePeople(removed)})` : ''}`,
    eventCode: 'DISPUTE_MEMBERS_CHANGED',
    referenceTable: 'disputes',
    referencePrefix: 'DIS',
    referenceId: row.dispute_id,
    actorStaffId: staff.staff_id,
    metadata: {
      scope,
      added: added.map((member) => member.accountId),
      removed: removed.map((member) => member.accountId),
    },
  });

  try {
    await notifyNamedPeople(row, added.map((member) => member.accountId), sideName);
  } catch (err) {
    console.warn('Named-member notices skipped:', err.message);
  }
  // People taken off a case they could open lose it from Cases right away.
  if (removed.length) {
    try {
      const io = require('../lib/WebSocket').getIo();
      for (const member of removed) {
        // A team Owner or Admin keeps the case as the team's manager.
        const stillParty = await Repo.accountsActedForBy(member.accountId, [row.by_account_id, row.for_account_id]);
        if (stillParty.size) continue;
        io?.to(String(member.accountId)).emit('caseUpdated', {
          kind: 'dispute',
          id: String(row.dispute_id),
          reason: 'members_changed',
          removed: true,
        });
      }
    } catch (err) {
      console.warn('Named-member removal notice skipped:', err.message);
    }
  }
  return { changed: true, scope, added, removed };
}

/* ------------------------------------------------------------------ */
/* Dispute bans with the people on the disputee side                   */
/* ------------------------------------------------------------------ */

function banScopeInput(body) {
  return {
    memberScope: body?.memberScope ?? body?.member_scope ?? null,
    memberAccountIds: body?.memberAccountIds ?? body?.member_account_ids ?? null,
  };
}

/**
 * Who a dispute ban reaches, checked before anything changes (no credits move and no account
 * changes when this throws). The disputee account is always banned; `memberScope` adds people:
 * default the named people (else the leader), `leader`, `selected` (`memberAccountIds`, from the
 * roster or the named list) or `all` (everyone on the side and everyone named).
 * People already banned are skipped. Someone staff may not ban stops the ban, except with `all`.
 */
async function planDisputeBan(row, input = {}, staff) {
  const respondent = await Repo.getSideAccount(row.for_account_id);
  const respondentIsTeam = isTeamAccount(respondent);
  const sideName = respondentIsTeam ? `Team ${nameOf(respondent)}` : nameOf(respondent);
  const group = await getDisputeRespondentGroup(row, { standing: false });
  const empty = {
    scope: null,
    respondentIsTeam,
    sideName,
    teamScope: null,
    people: [],
    extra: [],
    skipped: [],
  };
  if (!group) return empty;

  const forId = String(row.for_account_id);
  const raw = normalizeScope(input.memberScope);
  const scope = raw || group.banDefault.scope;
  const ids = raw ? input.memberAccountIds : group.banDefault.memberAccountIds;
  const roster = group.members.filter((member) => member.onRoster);
  const reachable = group.members;
  let people;
  if (scope === 'leader') {
    if (!group.leader && raw) {
      throw memberError(`${sideName} has no active leader. Pick specific people or everyone.`, 422, 'TEAM_NO_LEADER');
    }
    people = group.leader ? [group.leader] : [];
  } else if (scope === 'all') {
    people = [...roster, ...group.members.filter((member) => !member.onRoster && member.named)];
  } else {
    people = pickMembers({ leader: group.leader, members: reachable }, 'selected', ids, { sideName });
  }
  // The disputee account itself is banned as the respondent, not again as a member.
  const seen = new Set([forId]);
  people = people.filter((person) => {
    if (seen.has(person.accountId)) return false;
    seen.add(person.accountId);
    return true;
  });

  const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
  const skipped = [];
  const allowed = [];
  for (const person of people) {
    if (String(person.status || '').toLowerCase() === 'banned') {
      skipped.push({ ...person, skipped: 'already_banned' });
      continue;
    }
    try {
      await assertCanSanctionTarget({ actorStaffId: staff.staff_id, targetAccountId: person.accountId, action: 'ban' });
      allowed.push(person);
    } catch (err) {
      if (scope === 'all') {
        skipped.push({ ...person, skipped: 'not_allowed', message: err.message });
        continue;
      }
      throw memberError(`${err.message} (${person.name}). Leave them out of the ban.`, err.statusCode || 403, 'DISPUTE_BAN_TARGET_REFUSED');
    }
  }

  let teamScope = null;
  let extra = allowed;
  if (respondentIsTeam) {
    // Team members go through the team service (team rules, team record, team notices).
    const onTeam = new Set(group.members.filter((member) => member.onTeam).map((member) => member.accountId));
    const refused = new Set(skipped.filter((entry) => entry.skipped === 'not_allowed').map((entry) => entry.accountId));
    const teamPeople = people.filter((person) => onTeam.has(person.accountId) && !refused.has(person.accountId));
    extra = allowed.filter((person) => !onTeam.has(person.accountId));
    if (scope === 'all') teamScope = { memberScope: 'all' };
    else if (scope === 'leader' && group.leader && onTeam.has(group.leader.accountId)) teamScope = { memberScope: 'leader' };
    else if (teamPeople.length) {
      teamScope = { memberScope: 'selected', memberAccountIds: teamPeople.map((person) => person.accountId) };
    } else if (onTeam.size) {
      throw memberError(
        `A team ban always reaches someone on ${sideName}. Pick the leader or at least one team member.`,
        422,
        'TEAM_MEMBER_SCOPE_INVALID'
      );
    }
  }
  return { scope, respondentIsTeam, sideName, teamScope, people, extra, skipped };
}

/**
 * Ban the disputee account and the people the plan reaches. Each person's reason says it came
 * with the dispute. The disputee's ban is the decision; a person who could not be banned after it
 * is reported, never undoing it.
 */
async function executeDisputeBan(row, plan, { reason, staff }) {
  const { updateAccountStatus } = require('../repositories/AdminUserTeamRepositories');
  const base = {
    reason,
    duration: 'permanent',
    punishmentId: 'ban_dispute_conviction',
    disputeId: row.dispute_id,
    disputeNumber: row.dispute_number || null,
  };
  const teamResult = await updateAccountStatus(row.for_account_id, 'ban', staff.staff_id, {
    ...base,
    ...(plan?.teamScope || {}),
  });
  const banned = [];
  const skipped = [...(plan?.skipped || [])];
  const failed = [];
  for (const member of Array.isArray(teamResult?.members) ? teamResult.members : []) {
    if (member.applied) banned.push(member);
    else if (member.accountId && !skipped.some((entry) => entry.accountId === member.accountId)) {
      if (member.skipped === 'failed') failed.push(member);
      else skipped.push(member);
    }
  }
  const number = row.dispute_number || 'this dispute';
  for (const person of plan?.extra || []) {
    try {
      await updateAccountStatus(person.accountId, 'ban', staff.staff_id, {
        ...base,
        reason: `${reason} (named in dispute ${number} with ${plan.sideName})`,
        activityContext: {
          namedInDisputeId: String(row.dispute_id),
          disputeSideAccountId: String(row.for_account_id),
        },
      });
      banned.push(person);
    } catch (err) {
      failed.push({ ...person, message: err.message });
    }
  }
  const parts = [];
  if (banned.length) parts.push(`Also banned: ${describePeople(banned)}.`);
  const already = skipped.filter((entry) => ['already_banned', 'already_restricted'].includes(entry.skipped));
  if (already.length) parts.push(`Already banned or stricter: ${describePeople(already)}.`);
  const refused = skipped.filter((entry) => entry.skipped === 'not_allowed');
  if (refused.length) parts.push(`Skipped (staff may not ban them): ${describePeople(refused)}.`);
  if (failed.length) parts.push(`Could not ban ${describePeople(failed)}: ${failed[0].message || 'unknown error'}`);
  return { teamResult, banned, skipped, failed, summary: parts.join(' ') };
}

module.exports = {
  MEMBER_SCOPES,
  getFilingMemberOptions,
  resolveFilingMembers,
  describePeople,
  labelOf,
  getDisputeRespondentGroup,
  setDisputeMembersByStaff,
  disputeSideRecipients,
  expandPartyAccounts,
  expandMessageTargets,
  resolveDisputeViewer,
  banScopeInput,
  planDisputeBan,
  executeDisputeBan,
};
