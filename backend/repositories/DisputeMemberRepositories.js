/**
 * Data access for team members named in a contract dispute (migration
 * `1830500000000_dispute-members`) and for who may act for a dispute's team party.
 * Rules live in services/DisputeMemberServices.js.
 */
const { pool } = require('../lib/Database');

/** Team roles that act for a team on its cases (the people a team's standing notices reach). */
const TEAM_CASE_ROLES = ['Owner', 'Admin'];

let membersTableReady = false;
let membersTableCheckedAt = 0;

/**
 * Whether `dispute_members` exists yet. Cached once true; rechecked every minute while false, so
 * member reads keep working before the migration runs.
 */
async function disputeMembersReady(db = pool) {
  if (membersTableReady) return true;
  if (Date.now() - membersTableCheckedAt < 60_000) return false;
  membersTableCheckedAt = Date.now();
  try {
    const result = await db.query(`SELECT to_regclass('public.dispute_members') IS NOT NULL AS ready`);
    membersTableReady = Boolean(result.rows[0]?.ready);
  } catch (_err) {
    membersTableReady = false;
  }
  return membersTableReady;
}

/**
 * SQL: the person `personParam` acts for the account in `column` on its cases. The account
 * itself, or a team where the person is an active Owner or Admin.
 */
function actsForAccountSql(column, personParam) {
  return `(
    ${column} = ${personParam}
    OR EXISTS (
      SELECT 1
      FROM teams af_t
      JOIN team_members af_tm
        ON af_tm.team_id = af_t.team_id
       AND af_tm.status = 'Active'
       AND af_tm.deleted_at IS NULL
       AND af_tm.role IN ('Owner', 'Admin')
      JOIN users af_u ON af_u.user_id = af_tm.user_id
      WHERE af_t.account_id = ${column}
        AND af_t.deleted_at IS NULL
        AND af_u.account_id = ${personParam}
    )
  )`;
}

/** SQL: the person is named on the dispute in `disputeColumn` (and was not removed). */
function namedMemberSql(disputeColumn, personParam, ready) {
  if (!ready) return 'FALSE';
  return `EXISTS (
    SELECT 1 FROM dispute_members nm_dm
    WHERE nm_dm.dispute_id = ${disputeColumn}
      AND nm_dm.account_id = ${personParam}
      AND nm_dm.removed_at IS NULL
  )`;
}

/** The client and freelancer accounts of a contract, with its title. */
async function getContractParties(contractId, db = pool) {
  const result = await db.query(
    `
    SELECT
      c.contract_id,
      c.contract_type,
      COALESCE(jc_info.client_account_id, gc_info.client_account_id) AS client_account_id,
      COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) AS freelancer_account_id,
      COALESCE(jc_info.title, gc_info.title, 'Contract') AS contract_title
    FROM contracts c
    LEFT JOIN (
      SELECT jc.contract_id, j.client_account_id, p.freelancer_account_id, j.title
      FROM job_contracts jc
      JOIN proposals p ON jc.proposal_id = p.proposal_id
      JOIN jobs j ON p.job_id = j.job_id
    ) jc_info ON c.contract_id = jc_info.contract_id
    LEFT JOIN (
      SELECT gc.contract_id, gr.client_account_id, g.freelancer_account_id, g.title
      FROM gig_contracts gc
      JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
      JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
      JOIN gigs g ON gt.gig_id = g.gig_id
    ) gc_info ON c.contract_id = gc_info.contract_id
    WHERE c.contract_id = $1
    `,
    [contractId]
  );
  return result.rows[0] || null;
}

/** An account as a dispute side shows it, with the team behind it when it is one. */
async function getSideAccount(accountId, db = pool) {
  if (!accountId) return null;
  const result = await db.query(
    `
    SELECT a.account_id, a.type, a.display_name, a.handle, a.status, f.path AS avatar_path,
           t.team_id, COALESCE(t.team_type, 'standard') AS team_type
    FROM accounts a
    LEFT JOIN files f ON f.file_id = a.avatar_file_id
    LEFT JOIN teams t ON t.account_id = a.account_id AND t.deleted_at IS NULL
    WHERE a.account_id = $1
    `,
    [accountId]
  );
  return result.rows[0] || null;
}

/** Active members of a team, each with their own standing. Owners first, then by join date. */
async function listActiveTeamMembers(teamId, db = pool) {
  const result = await db.query(
    `
    SELECT u.account_id, a.display_name, a.handle, a.status, f.path AS avatar_path,
           tm.role, tm.joined_at
    FROM team_members tm
    JOIN users u ON u.user_id = tm.user_id
    JOIN accounts a ON a.account_id = u.account_id
    LEFT JOIN files f ON f.file_id = a.avatar_file_id
    WHERE tm.team_id = $1
      AND tm.status = 'Active'
      AND tm.deleted_at IS NULL
      AND a.deleted_at IS NULL
    ORDER BY CASE tm.role WHEN 'Owner' THEN 0 WHEN 'Admin' THEN 1 ELSE 2 END, tm.joined_at ASC NULLS LAST
    `,
    [teamId]
  );
  return result.rows;
}

/** The contract's workspace team (`team_type = 'contractual'`), when it has one. */
async function getContractWorkspaceTeam(contractId, db = pool) {
  const result = await db.query(
    `
    SELECT t.team_id, t.account_id, a.display_name, a.handle
    FROM team_contract_workspaces tcw
    JOIN teams t ON t.team_id = tcw.team_id AND t.team_type = 'contractual' AND t.deleted_at IS NULL
    JOIN accounts a ON a.account_id = t.account_id
    WHERE tcw.contract_id = $1
    ORDER BY tcw.created_at ASC NULLS LAST
    LIMIT 1
    `,
    [contractId]
  );
  return result.rows[0] || null;
}

/**
 * The freelancer side of a contract workspace team: its active members except the client lead
 * (the workspace Owner), the client account and, when the client is a team, that team's people.
 * Subcontractors carry their contract role title.
 */
async function listWorkspaceFreelancerSide(
  { workspaceTeamId, contractId, clientAccountId, clientTeamId = null },
  db = pool
) {
  const result = await db.query(
    `
    SELECT u.account_id, a.display_name, a.handle, a.status, f.path AS avatar_path,
           tm.role, tm.joined_at, cs.role_title AS subcontract_role
    FROM team_members tm
    JOIN users u ON u.user_id = tm.user_id
    JOIN accounts a ON a.account_id = u.account_id
    LEFT JOIN files f ON f.file_id = a.avatar_file_id
    LEFT JOIN contract_subcontractors cs ON cs.contract_id = $2 AND cs.account_id = u.account_id
    WHERE tm.team_id = $1
      AND tm.status = 'Active'
      AND tm.deleted_at IS NULL
      AND tm.role <> 'Owner'
      AND a.deleted_at IS NULL
      AND u.account_id <> $3
      AND (
        $4::uuid IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM team_members ctm
          WHERE ctm.team_id = $4::uuid
            AND ctm.user_id = tm.user_id
            AND ctm.status = 'Active'
            AND ctm.deleted_at IS NULL
        )
      )
    ORDER BY tm.joined_at ASC NULLS LAST
    `,
    [workspaceTeamId, contractId, clientAccountId, clientTeamId]
  );
  return result.rows;
}

/**
 * Name people on a dispute. A person removed earlier is restored with the new details.
 * @param {Array<{ accountId: string, teamAccountId?: string|null, teamRole?: string|null, isLeader?: boolean, source?: string }>} members
 */
async function insertDisputeMembers(
  db,
  disputeId,
  members,
  { namedBy = 'filer', addedByAccountId = null, addedByStaffId = null } = {}
) {
  if (!members?.length) return [];
  const rows = members.map((member) => ({
    account_id: String(member.accountId),
    team_account_id: member.teamAccountId ? String(member.teamAccountId) : null,
    team_role: member.teamRole ? String(member.teamRole).slice(0, 50) : null,
    is_leader: Boolean(member.isLeader),
    source: ['team', 'contract', 'both'].includes(member.source) ? member.source : 'team',
  }));
  const result = await db.query(
    `
    INSERT INTO dispute_members (
      dispute_id, account_id, team_account_id, team_role, is_leader, source,
      named_by, added_by_account_id, added_by_staff_id
    )
    SELECT $1, x.account_id, x.team_account_id, x.team_role, x.is_leader, x.source, $2, $3, $4
    FROM jsonb_to_recordset($5::jsonb)
      AS x(account_id uuid, team_account_id uuid, team_role text, is_leader boolean, source text)
    ON CONFLICT (dispute_id, account_id) DO UPDATE
      SET team_account_id = EXCLUDED.team_account_id,
          team_role = EXCLUDED.team_role,
          is_leader = EXCLUDED.is_leader,
          source = EXCLUDED.source,
          named_by = CASE WHEN dispute_members.removed_at IS NULL THEN dispute_members.named_by ELSE EXCLUDED.named_by END,
          added_by_account_id = CASE WHEN dispute_members.removed_at IS NULL THEN dispute_members.added_by_account_id ELSE EXCLUDED.added_by_account_id END,
          added_by_staff_id = CASE WHEN dispute_members.removed_at IS NULL THEN dispute_members.added_by_staff_id ELSE EXCLUDED.added_by_staff_id END,
          created_at = CASE WHEN dispute_members.removed_at IS NULL THEN dispute_members.created_at ELSE CURRENT_TIMESTAMP END,
          removed_at = NULL,
          removed_by_staff_id = NULL,
          removed_reason = NULL
    RETURNING account_id
    `,
    [disputeId, namedBy === 'staff' ? 'staff' : 'filer', addedByAccountId, addedByStaffId, JSON.stringify(rows)]
  );
  return result.rows.map((row) => String(row.account_id));
}

/** Take people off a dispute (soft). `accountIds` null removes everyone still named. */
async function removeDisputeMembers(db, disputeId, accountIds, { staffId = null, reason = 'staff_removed' } = {}) {
  const result = await db.query(
    `
    UPDATE dispute_members
    SET removed_at = CURRENT_TIMESTAMP,
        removed_by_staff_id = $2,
        removed_reason = $3
    WHERE dispute_id = $1
      AND removed_at IS NULL
      AND ($4::uuid[] IS NULL OR account_id = ANY($4::uuid[]))
    RETURNING account_id
    `,
    [disputeId, staffId, String(reason || 'staff_removed').slice(0, 40), accountIds ? accountIds.map(String) : null]
  );
  return result.rows.map((row) => String(row.account_id));
}

async function setRespondentMemberScope(db, disputeId, scope) {
  await db.query(`UPDATE disputes SET respondent_member_scope = $2 WHERE dispute_id = $1`, [
    disputeId,
    scope || null,
  ]);
}

/**
 * The people named on a dispute, with their account standing and who named them.
 * Empty before the migration runs.
 */
async function listDisputeMembers(disputeId, { includeRemoved = false, db = pool } = {}) {
  if (!disputeId || !(await disputeMembersReady(db))) return [];
  const result = await db.query(
    `
    SELECT dm.account_id, dm.team_account_id, dm.team_role, dm.is_leader, dm.source, dm.named_by,
           dm.created_at, dm.removed_at, dm.removed_reason,
           a.display_name, a.handle, a.status, f.path AS avatar_path,
           ta.display_name AS team_name, ta.handle AS team_handle,
           COALESCE(NULLIF(TRIM(CONCAT_WS(' ', ast.first_name, ast.last_name)), ''), asa.display_name) AS added_by_staff_name,
           COALESCE(NULLIF(TRIM(CONCAT_WS(' ', rst.first_name, rst.last_name)), ''), rsa.display_name) AS removed_by_staff_name
    FROM dispute_members dm
    JOIN accounts a ON a.account_id = dm.account_id
    LEFT JOIN files f ON f.file_id = a.avatar_file_id
    LEFT JOIN accounts ta ON ta.account_id = dm.team_account_id
    LEFT JOIN staff ast ON ast.staff_id = dm.added_by_staff_id
    LEFT JOIN accounts asa ON asa.account_id = ast.account_id
    LEFT JOIN staff rst ON rst.staff_id = dm.removed_by_staff_id
    LEFT JOIN accounts rsa ON rsa.account_id = rst.account_id
    WHERE dm.dispute_id = $1
      AND ($2::boolean OR dm.removed_at IS NULL)
    ORDER BY dm.removed_at IS NOT NULL, dm.is_leader DESC, dm.created_at ASC, a.display_name ASC
    `,
    [disputeId, Boolean(includeRemoved)]
  );
  return result.rows;
}

/** Account ids of the people still named on a dispute. */
async function listNamedMemberAccountIds(disputeId, db = pool) {
  if (!disputeId || !(await disputeMembersReady(db))) return [];
  const result = await db.query(
    `SELECT account_id FROM dispute_members WHERE dispute_id = $1 AND removed_at IS NULL`,
    [disputeId]
  );
  return result.rows.map((row) => String(row.account_id));
}

/**
 * Which of `accountIds` are teams, and the people who act for each on its cases (active Owners
 * and Admins). A team account has no inbox of its own, so its case notices go to them.
 */
async function teamCaseRecipients(accountIds, db = pool) {
  const ids = [...new Set((accountIds || []).filter(Boolean).map(String))];
  const teams = new Map();
  if (!ids.length) return teams;
  const result = await db.query(
    `
    SELECT t.account_id AS team_account_id, u.account_id AS person_account_id
    FROM teams t
    LEFT JOIN team_members tm
      ON tm.team_id = t.team_id
     AND tm.status = 'Active'
     AND tm.deleted_at IS NULL
     AND tm.role = ANY($2::text[])
    LEFT JOIN users u ON u.user_id = tm.user_id
    WHERE t.account_id = ANY($1::uuid[])
      AND t.deleted_at IS NULL
    `,
    [ids, TEAM_CASE_ROLES]
  );
  for (const row of result.rows) {
    const key = String(row.team_account_id);
    if (!teams.has(key)) teams.set(key, []);
    if (row.person_account_id) teams.get(key).push(String(row.person_account_id));
  }
  return teams;
}

/**
 * How one person relates to a dispute: files for it (the disputer account or a team they act
 * for), answers it (the disputee account or a team they act for), or is named on it.
 */
async function getDisputeViewer(disputeId, personAccountId, db = pool) {
  if (!disputeId || !personAccountId) return { isFiler: false, actsForRespondent: false, namedMember: false };
  const ready = await disputeMembersReady(db);
  const result = await db.query(
    `
    SELECT
      ${actsForAccountSql('d.by_account_id', '$2::uuid')} AS is_filer,
      ${actsForAccountSql('d.for_account_id', '$2::uuid')} AS acts_for_respondent,
      ${namedMemberSql('d.dispute_id', '$2::uuid', ready)} AS named_member
    FROM disputes d
    WHERE d.dispute_id = $1
    `,
    [disputeId, personAccountId]
  );
  const row = result.rows[0];
  return {
    isFiler: Boolean(row?.is_filer),
    actsForRespondent: Boolean(row?.acts_for_respondent),
    namedMember: Boolean(row?.named_member),
  };
}

/**
 * Every account a person answers dispute cases for: their own, and each team where they are an
 * active Owner or Admin. Member case reads match disputes against this list.
 */
async function caseAccountIdsFor(personAccountId, db = pool) {
  if (!personAccountId) return [];
  const result = await db.query(
    `
    SELECT $1::uuid AS account_id
    UNION
    SELECT t.account_id
    FROM teams t
    JOIN team_members tm
      ON tm.team_id = t.team_id
     AND tm.status = 'Active'
     AND tm.deleted_at IS NULL
     AND tm.role = ANY($2::text[])
    JOIN users u ON u.user_id = tm.user_id AND u.account_id = $1::uuid
    WHERE t.deleted_at IS NULL
    `,
    [personAccountId, TEAM_CASE_ROLES]
  );
  return result.rows.map((row) => String(row.account_id));
}

/**
 * A team's wallet as a dispute about one contract needs it: spendable, held by staff, escrow,
 * and what this contract released to the team that the team still owes its members
 * (net of dispute reversals; see lib/TeamContractReserve.js).
 */
async function teamWalletForContract({ teamAccountId, teamId, contractId }, db = pool) {
  const { releaseCountsSql, netReleaseCreditsSql } = require('../lib/TeamContractReserve');
  const [balances, released, distributed] = await Promise.all([
    db.query(
      `
      SELECT
        COALESCE(SUM(w.balance_credits) FILTER (WHERE w.type = 'account wallets'), 0)::bigint AS available,
        COALESCE(SUM(w.frozen_balance_credits), 0)::bigint AS held,
        COALESCE(SUM(w.balance_credits) FILTER (WHERE w.type = 'escrow wallets'), 0)::bigint AS escrow
      FROM account_wallets aw
      JOIN wallets w ON w.wallet_id = aw.wallet_id
      WHERE aw.account_id = $1
      `,
      [teamAccountId]
    ),
    contractId
      ? db.query(
          `
          SELECT COALESCE(SUM(${netReleaseCreditsSql('ct')}), 0)::bigint AS released
          FROM credit_transactions ct
          JOIN account_wallets aw ON aw.wallet_id = ct.destination_wallet_id AND aw.account_id = $1
          JOIN wallets w ON w.wallet_id = aw.wallet_id AND w.type = 'account wallets'
          WHERE ct.reference_table = 'contracts'
            AND ct.reference_id = $2
            AND ct.type = 'Escrow Release'
            AND ${releaseCountsSql('ct')}
          `,
          [teamAccountId, contractId]
        )
      : Promise.resolve({ rows: [{ released: 0 }] }),
    contractId && teamId
      ? db
          .query(
            `SELECT COALESCE(SUM(amount_credits), 0)::bigint AS distributed
             FROM team_contract_distributions WHERE team_id = $1 AND contract_id = $2`,
            [teamId, contractId]
          )
          .catch(() => ({ rows: [{ distributed: 0 }] }))
      : Promise.resolve({ rows: [{ distributed: 0 }] }),
  ]);
  const row = balances.rows[0] || {};
  const contractReleased = Number(released.rows[0]?.released || 0);
  const contractDistributed = Number(distributed.rows[0]?.distributed || 0);
  return {
    available: Number(row.available || 0),
    held: Number(row.held || 0),
    escrow: Number(row.escrow || 0),
    contractReleased,
    contractDistributed,
    contractOwed: Math.max(0, contractReleased - contractDistributed),
  };
}

/** The accounts among `accountIds` that a person acts for (themself, or teams they manage). */
async function accountsActedForBy(personAccountId, accountIds, db = pool) {
  const ids = [...new Set((accountIds || []).filter(Boolean).map(String))];
  if (!personAccountId || !ids.length) return new Set();
  const result = await db.query(
    `
    SELECT x.account_id
    FROM unnest($2::uuid[]) AS x(account_id)
    WHERE ${actsForAccountSql('x.account_id', '$1::uuid')}
    `,
    [personAccountId, ids]
  );
  return new Set(result.rows.map((row) => String(row.account_id)));
}

module.exports = {
  TEAM_CASE_ROLES,
  disputeMembersReady,
  actsForAccountSql,
  namedMemberSql,
  getContractParties,
  getSideAccount,
  listActiveTeamMembers,
  getContractWorkspaceTeam,
  listWorkspaceFreelancerSide,
  insertDisputeMembers,
  removeDisputeMembers,
  setRespondentMemberScope,
  listDisputeMembers,
  listNamedMemberAccountIds,
  teamCaseRecipients,
  getDisputeViewer,
  caseAccountIdsFor,
  teamWalletForContract,
  accountsActedForBy,
};
