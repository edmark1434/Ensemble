/**
 * Staff-only case file for one support ticket: the records the ticket is about, picked by its
 * category. Appeals get the member's standing, punishments and appeal history; marketplace
 * tickets get the listing, purchase and seller; jobs tickets get the contract, milestones,
 * escrow and disputes; and so on.
 *
 * Read-only. Every section loads on its own: a failed lookup leaves that section empty and is
 * reported in `notes` instead of failing the ticket. Never returns secrets, verification
 * documents or links, or other members' emails.
 */
const { pool } = require('../lib/Database');
const {
  FORUM_TYPES,
  MARKETPLACE_TYPES,
  JOBS_TYPES,
  normalizeTicketType,
} = require('../lib/TicketEnums');
const { canViewTicketPayments } = require('./TicketHelpRepositories');

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const OBJECT_ID_RE = /\b[0-9a-f]{24}\b/i;
const APPEAL_TICKET_TYPE = 'Appeal an account penalty';
const AREA_APPEALS = {
  'Appeal a forum action': 'forum',
  'Appeal a marketplace action': 'marketplace',
  'Appeal a jobs action': 'jobs',
};
const BILLING_TYPES = new Set([
  'Subscriptions and plans',
  'Credits and balance',
  'Payouts and withdrawals',
  'Charges and receipts',
]);
const ACCOUNT_TYPES = new Set([
  'Sign-in and password',
  'Account compromised',
  'Identity verification',
  'Profile and settings',
  'Teams',
  'Delete account or export data',
]);
const EDITOR_TYPES = new Set([
  'Editor problems',
  'Export and rendering',
  'Uploads and storage',
  'Project files',
  'Sharing and collaboration',
]);
const SAFETY_TYPES = new Set(['Report a user', 'Copyright claim']);
/**
 * Free-text usernames the form asks for that no case layout reads itself: the other person in a
 * chat, a project collaborator, a reviewer. They resolve to a standing card in `namedPeople`.
 */
const NAMED_PERSON_KEYS = new Set(['other_username', 'collaborator', 'reviewer_username']);
/** Layouts that list other tickets about their item themselves. */
const KINDS_WITH_OWN_RELATED = new Set(['marketplace', 'jobs', 'appeal']);
const ACTIVE_WARNING_SQL = `
  v.deleted_at IS NULL
  AND LOWER(COALESCE(v.status, 'active')) IN ('active', 'open', 'pending')
  AND (v.expires_at IS NULL OR v.expires_at > NOW())
`;
const STAFF_NAME_SQL = (staffAlias, accountAlias) =>
  `COALESCE(${accountAlias}.display_name, NULLIF(TRIM(CONCAT(${staffAlias}.first_name, ' ', ${staffAlias}.last_name)), ''), 'Staff')`;
const MEMBER_NAME_SQL = (accountAlias, userAlias) =>
  `COALESCE(${accountAlias}.display_name, NULLIF(TRIM(CONCAT(${userAlias}.first_name, ' ', ${userAlias}.last_name)), ''), ${accountAlias}.handle, 'Unknown')`;

/** Which case layout a ticket type gets. */
function caseKindForType(rawType) {
  const type = normalizeTicketType(rawType, rawType) || rawType;
  if (type === APPEAL_TICKET_TYPE || AREA_APPEALS[type]) return 'appeal';
  if (MARKETPLACE_TYPES.includes(type)) return 'marketplace';
  if (JOBS_TYPES.includes(type)) return 'jobs';
  if (FORUM_TYPES.includes(type)) return 'forum';
  if (BILLING_TYPES.has(type)) return 'billing';
  if (ACCOUNT_TYPES.has(type)) return 'account';
  if (EDITOR_TYPES.has(type)) return 'editor';
  if (SAFETY_TYPES.has(type)) return 'safety';
  return 'general';
}

function parseFormAnswers(raw) {
  let rows = raw;
  if (typeof raw === 'string') {
    try {
      rows = JSON.parse(raw);
    } catch {
      rows = [];
    }
  }
  return Array.isArray(rows) ? rows.filter((row) => row && row.key) : [];
}

function answerOf(form, ...keys) {
  for (const key of keys) {
    const row = form.find((item) => item.key === key);
    if (row && (row.value || row.id)) return { value: String(row.value || ''), id: row.id ? String(row.id) : null };
  }
  return { value: '', id: null };
}

function uuidIn(text) {
  const match = String(text || '').match(UUID_RE);
  return match ? match[0].toLowerCase() : null;
}

function objectIdIn(text) {
  const match = String(text || '').match(OBJECT_ID_RE);
  return match ? match[0].toLowerCase() : null;
}

/** "@ana", "ana", or a profile link → "ana". */
function handleIn(text) {
  const value = String(text || '').trim();
  if (!value) return null;
  const fromLink = value.match(/\/profile\/([A-Za-z0-9_.-]+)/i);
  const raw = fromLink ? fromLink[1] : value.split(/\s+/)[0];
  const handle = raw.replace(/^@/, '').replace(/[^A-Za-z0-9_.-]/g, '');
  if (!handle || handle.length > 60 || UUID_RE.test(handle)) return null;
  return handle;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Runs one section; a failure leaves it null and adds a note for staff. */
async function section(notes, label, load) {
  try {
    return await load();
  } catch (err) {
    console.warn(`Ticket case section "${label}" skipped:`, err.message);
    notes.push(`${label} could not be loaded.`);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

/**
 * A team's members at a glance: their merit as a share of the total, plus the warnings and
 * disputes of every active member. Teams have none of their own.
 */
async function teamMemberTotals(teamAccountId) {
  const { platformMeritSql } = require('./WarningBandRepositories');
  const { memberMeritSummary } = require('../lib/TeamMerit');
  const { rows: members } = await pool.query(
    `
    SELECT u.account_id, COALESCE(a.display_name, a.handle, 'Member') AS name,
      ${platformMeritSql('a.account_id')}::int AS merit
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.team_id
    JOIN users u ON u.user_id = tm.user_id
    JOIN accounts a ON a.account_id = u.account_id
    WHERE t.account_id = $1 AND tm.status = 'Active' AND tm.deleted_at IS NULL AND a.deleted_at IS NULL
    `,
    [teamAccountId]
  );
  const ids = members.map((member) => member.account_id);
  const { rows } = await pool.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM violations v
        WHERE v.deleted_at IS NULL AND v.account_id = ANY($1::uuid[])) AS total_warnings,
      (SELECT COUNT(*)::int FROM violations v
        WHERE v.account_id = ANY($1::uuid[]) AND ${ACTIVE_WARNING_SQL}) AS active_warnings,
      (SELECT COALESCE(SUM(LEAST(GREATEST(COALESCE(v.points, 1), 1), 10)), 0)::int FROM violations v
        WHERE v.account_id = ANY($1::uuid[]) AND ${ACTIVE_WARNING_SQL}) AS active_points,
      (SELECT COUNT(DISTINCT d.dispute_id)::int FROM disputes d
        WHERE d.deleted_at IS NULL AND (d.by_account_id = ANY($1::uuid[]) OR d.for_account_id = ANY($1::uuid[]))) AS total_disputes,
      (SELECT COUNT(DISTINCT d.dispute_id)::int FROM disputes d
        WHERE d.deleted_at IS NULL AND d.for_account_id = ANY($1::uuid[]) AND d.status <> 'closed') AS open_disputes_against
    `,
    [ids]
  );
  const totals = rows[0] || {};
  return {
    memberMerit: memberMeritSummary(members.map((member) => ({ accountId: member.account_id, name: member.name, merit: member.merit }))),
    activeWarnings: num(totals.active_warnings),
    activeWarningPoints: num(totals.active_points),
    totalWarnings: num(totals.total_warnings),
    totalDisputes: num(totals.total_disputes),
    openDisputesAgainst: num(totals.open_disputes_against),
  };
}

/** One member at a glance: identity, live standing, and history counts. */
async function accountSummary(accountId) {
  if (!accountId || !UUID_RE.test(String(accountId))) return null;
  const { getAccountAccess } = require('../lib/AccountRestriction');
  const [result, access] = await Promise.all([
    pool.query(
      `
      SELECT
        a.account_id,
        a.handle,
        a.type,
        a.created_at,
        ${MEMBER_NAME_SQL('a', 'u')} AS name,
        ver.is_verified,
        ver.verified_at,
        (SELECT COUNT(*)::int FROM violations v WHERE v.account_id = a.account_id AND v.deleted_at IS NULL) AS total_warnings,
        (SELECT COUNT(*)::int FROM violations v WHERE v.account_id = a.account_id AND ${ACTIVE_WARNING_SQL}) AS active_warnings,
        (SELECT COUNT(*)::int FROM disputes d
          WHERE d.deleted_at IS NULL AND (d.by_account_id = a.account_id OR d.for_account_id = a.account_id)) AS total_disputes,
        (SELECT COUNT(*)::int FROM disputes d
          WHERE d.deleted_at IS NULL AND d.for_account_id = a.account_id AND d.status <> 'closed') AS open_disputes_against,
        (SELECT COUNT(*)::int FROM reports r WHERE r.deleted_at IS NULL AND r.for_account_id = a.account_id) AS reports_against,
        (SELECT COUNT(*)::int FROM tickets t WHERE t.deleted_at IS NULL AND t.account_id = a.account_id) AS total_tickets
      FROM accounts a
      LEFT JOIN users u ON u.account_id = a.account_id
      LEFT JOIN LATERAL (
        SELECT v.is_verified, v.verified_at FROM verifications v WHERE v.account_id = a.account_id LIMIT 1
      ) ver ON TRUE
      WHERE a.account_id = $1
      `,
      [accountId]
    ),
    getAccountAccess(accountId),
  ]);
  const row = result.rows[0];
  if (!row) return null;
  // Teams have no Platform Merit and never break rules on their own: read them through their
  // active members (merit added up, members' warnings and disputes).
  const team = String(row.type || '').toLowerCase() === 'team' ? await teamMemberTotals(row.account_id).catch(() => null) : null;
  const statusEndsAt = access.banned
    ? access.banEndsAt
    : access.locked
      ? access.lockEndsAt
      : access.suspended
        ? access.suspensionEndsAt
        : null;
  return {
    accountId: row.account_id,
    name: row.name,
    handle: row.handle || null,
    type: row.type || null,
    joinedAt: row.created_at || null,
    status: access.status || 'Active',
    statusEndsAt: statusEndsAt || null,
    merit: team ? null : access.merit ?? null,
    memberMerit: team ? team.memberMerit : null,
    warningPoints: team ? team.activeWarningPoints : num(access.warningPoints),
    warningBandLabel: access.warningBandLabel || null,
    warningBandEndsAt: access.warningBandEndsAt || null,
    // Running automatic merit punishments, each on its own clock (timed-merit punishments).
    meritPenalties: Array.isArray(access.meritPenalties) ? access.meritPenalties : [],
    muted: Boolean(access.muted),
    mutedUntil: access.mutedUntil || null,
    forumTimeout: Boolean(access.forumTimeout),
    forumTimeoutEndsAt: access.forumTimeoutEndsAt || null,
    creditsFrozen: Boolean(access.creditsFrozen),
    frozenCredits: num(access.frozenCredits),
    creditsFrozenUntil: access.creditsFrozenUntil || null,
    creditsFrozenReason: access.creditsFrozenReason || null,
    deactivated: Boolean(access.deactivated),
    identityVerified: Boolean(row.is_verified),
    identityVerifiedAt: row.verified_at || null,
    counts: {
      activeWarnings: team ? team.activeWarnings : num(row.active_warnings),
      totalWarnings: team ? team.totalWarnings : num(row.total_warnings),
      totalDisputes: team ? team.totalDisputes : num(row.total_disputes),
      openDisputesAgainst: team ? team.openDisputesAgainst : num(row.open_disputes_against),
      reportsAgainst: num(row.reports_against),
      totalTickets: num(row.total_tickets),
    },
  };
}

async function accountIdForHandle(handle) {
  if (!handle) return null;
  const result = await pool.query(
    `SELECT account_id FROM accounts WHERE LOWER(handle) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
    [handle]
  );
  return result.rows[0]?.account_id || null;
}

/** A named member (reported user, counterparty) from a free-text answer: @handle, link, or id. */
async function accountFromText(text) {
  const id = uuidIn(text);
  if (id) {
    const exists = await pool.query(`SELECT 1 FROM accounts WHERE account_id = $1`, [id]);
    if (exists.rows.length) return accountSummary(id);
  }
  const accountId = await accountIdForHandle(handleIn(text));
  return accountId ? accountSummary(accountId) : null;
}

async function reportsList(whereSql, params, limit = 10) {
  const result = await pool.query(
    `
    SELECT r.report_id, r.report_number, r.type, r.status, r.priority, r.target_type, r.target_id,
           r.created_at, ${MEMBER_NAME_SQL('ba', 'bu')} AS reporter_name, ba.handle AS reporter_handle
    FROM reports r
    LEFT JOIN accounts ba ON ba.account_id = r.by_account_id
    LEFT JOIN users bu ON bu.account_id = ba.account_id
    WHERE r.deleted_at IS NULL AND ${whereSql}
    ORDER BY r.created_at DESC
    LIMIT ${Number(limit)}
    `,
    params
  );
  return result.rows.map((row) => ({
    id: row.report_id,
    number: row.report_number,
    type: row.type,
    status: row.status,
    priority: row.priority,
    targetType: row.target_type,
    reporter: row.reporter_handle ? `@${row.reporter_handle}` : row.reporter_name,
    createdAt: row.created_at,
  }));
}

/** Other tickets that name the same record (contract, listing, order, project) in their form. */
async function ticketsReferencing(entityIds, excludeTicketId) {
  // One record can be named by several ids (a listing by its listing id or its asset id).
  const ids = [...new Set((Array.isArray(entityIds) ? entityIds : [entityIds]).filter(Boolean).map(String))];
  if (!ids.length) return [];
  const result = await pool.query(
    `
    SELECT t.ticket_id, t.ticket_number, t.type, t.status, t.created_at,
           ${MEMBER_NAME_SQL('a', 'u')} AS requester_name, a.handle AS requester_handle
    FROM tickets t
    LEFT JOIN accounts a ON a.account_id = t.account_id
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE t.deleted_at IS NULL
      AND ($2::uuid IS NULL OR t.ticket_id <> $2::uuid)
      AND jsonb_typeof(t.form_answers) = 'array'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(t.form_answers) answer
        WHERE answer->>'id' = ANY($1::text[])
      )
    ORDER BY t.created_at DESC
    LIMIT 10
    `,
    [ids, excludeTicketId || null]
  );
  return result.rows.map((row) => ({
    id: row.ticket_id,
    number: row.ticket_number,
    type: row.type,
    status: row.status,
    requester: row.requester_handle ? `@${row.requester_handle}` : row.requester_name,
    createdAt: row.created_at,
  }));
}

/**
 * The accounts the requester acts as on Jobs & Gigs and the marketplace: their own and teams
 * they own. A contract, posting or listing held by one of those teams is the requester's too.
 */
async function requesterActorIds(accountId) {
  if (!accountId) return [];
  const own = String(accountId);
  try {
    const { getAuthorizedActorAccountIds } = require('./MarketplaceActorRepositories');
    const ids = await getAuthorizedActorAccountIds(accountId);
    return [...new Set([own, ...(ids || []).map(String)])];
  } catch (err) {
    console.warn('Ticket case actor accounts skipped:', err.message);
    return [own];
  }
}

/**
 * What each gig order bought, keyed by contract id: the package (tier) and the add-ons the
 * client picked. A gig edit retires add-on rows and inserts new ones instead of changing them,
 * so an order's add-ons keep the price and extra days it was placed with. Tier rows are edited
 * in place, so the package price is the current one. Job contracts have no entry.
 */
async function gigOrdersForContracts(contractIds) {
  const ids = [...new Set((contractIds || []).map(String).filter((id) => UUID_RE.test(id)))];
  const byContract = new Map();
  if (!ids.length) return byContract;
  const result = await pool.query(
    `
    SELECT DISTINCT ON (gc.contract_id)
           gc.contract_id, gr.gig_request_id,
           gt.title AS tier_title, gt.rate_credits AS tier_credits,
           gt.delivery_days AS tier_days, gt.no_of_revisions_max AS tier_revisions,
           COALESCE((
             SELECT json_agg(json_build_object(
               'id', ga.gig_addon_id,
               'name', ga.name,
               'priceCredits', ga.price_credits,
               'additionalDays', ga.additional_days
             ) ORDER BY ga.name ASC, ga.gig_addon_id ASC)
             FROM gig_request_addons gra
             JOIN gig_addons ga ON ga.gig_addon_id = gra.gig_addon_id
             WHERE gra.gig_request_id = gr.gig_request_id
           ), '[]'::json) AS addons
    FROM gig_contracts gc
    JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
    LEFT JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
    WHERE gc.contract_id = ANY($1::uuid[])
    ORDER BY gc.contract_id, gr.created_at ASC, gr.gig_request_id ASC
    `,
    [ids]
  );
  for (const row of result.rows) {
    const addons = (Array.isArray(row.addons) ? row.addons : [])
      .filter((addon) => addon && addon.id)
      .map((addon) => ({
        id: String(addon.id),
        name: String(addon.name || 'Add-on'),
        priceCredits: num(addon.priceCredits),
        additionalDays: num(addon.additionalDays),
      }));
    byContract.set(String(row.contract_id), {
      requestId: String(row.gig_request_id),
      tierTitle: row.tier_title || null,
      tierCredits: row.tier_credits == null ? null : num(row.tier_credits),
      tierDeliveryDays: row.tier_days == null ? null : num(row.tier_days),
      tierRevisions: row.tier_revisions == null ? null : num(row.tier_revisions),
      addons,
      addonCredits: addons.reduce((sum, addon) => sum + addon.priceCredits, 0),
      addonDays: addons.reduce((sum, addon) => sum + addon.additionalDays, 0),
    });
  }
  return byContract;
}

/* ------------------------------------------------------------------ */
/* Appeals                                                             */
/* ------------------------------------------------------------------ */

/**
 * Evidence saved with a penalty taken from platform view (the item as it read when staff
 * acted). Null for penalties issued anywhere else, which keep their report snapshot instead.
 */
function evidenceFromMetadata(meta) {
  if (!meta || typeof meta !== 'object' || !meta.evidenceTitle) return null;
  return {
    source: meta.source || null,
    kind: meta.evidenceKind || null,
    title: meta.evidenceTitle,
    excerpt: meta.evidenceExcerpt || null,
    page: meta.evidenceHref || meta.sourcePage || null,
    stateWhenActed: meta.evidenceStatus || null,
    capturedAt: meta.evidenceCapturedAt || null,
    relatedReports: meta.relatedReports || null,
    pairedAction: meta.pairedAction || null,
  };
}

async function punishmentRecord(accountId) {
  const [warnings, restrictions, history] = await Promise.all([
    pool.query(
      `
      SELECT v.violation_id, v.violation_number, v.type, v.reason, v.points, v.status, v.created_at,
             v.expires_at, (${ACTIVE_WARNING_SQL}) AS is_active, ${STAFF_NAME_SQL('s', 'sa')} AS issued_by,
             issued.metadata AS issue_metadata
      FROM violations v
      LEFT JOIN staff s ON s.staff_id = v.staff_id
      LEFT JOIN accounts sa ON sa.account_id = s.account_id
      LEFT JOIN LATERAL (
        SELECT aa.metadata
        FROM account_activity aa
        WHERE aa.reference_table = 'violations'
          AND aa.reference_id = v.violation_id::text
          AND aa.event_code = 'ACCOUNT_WARNED'
        ORDER BY aa.created_at ASC
        LIMIT 1
      ) issued ON TRUE
      WHERE v.account_id = $1 AND v.deleted_at IS NULL
      ORDER BY v.created_at DESC
      LIMIT 30
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT r.restriction_id, r.type, r.module, r.starts_at, r.ends_at, r.created_at, r.violation_id,
             (r.starts_at <= NOW() AND (r.ends_at IS NULL OR r.ends_at > NOW())) AS is_active,
             ${STAFF_NAME_SQL('s', 'sa')} AS issued_by
      FROM restrictions r
      LEFT JOIN staff s ON s.staff_id = r.staff_id
      LEFT JOIN accounts sa ON sa.account_id = s.account_id
      WHERE r.account_id = $1
      ORDER BY r.created_at DESC
      LIMIT 20
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT aa.account_activity_id, aa.action, aa.event_code, aa.metadata, aa.created_at,
             ${STAFF_NAME_SQL('s', 'sa')} AS actor_name, s.role AS actor_role
      FROM account_activity aa
      LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
      LEFT JOIN accounts sa ON sa.account_id = s.account_id
      WHERE aa.account_id = $1
        AND (
          aa.event_code IN (
            'ACCOUNT_STATUS_CHANGED', 'ACCOUNT_PARDONED', 'WARNING_RESCINDED', 'APPEAL_DECISION',
            'CREDITS_FROZEN', 'CREDITS_RELEASED', 'FORUM_TIMEOUT'
          )
          OR aa.event_code LIKE '%TIMEOUT%'
        )
      ORDER BY aa.created_at DESC
      LIMIT 30
      `,
      [accountId]
    ),
  ]);
  return {
    warnings: warnings.rows.map((row) => ({
      id: row.violation_id,
      number: row.violation_number,
      type: row.type,
      reason: row.reason || null,
      points: num(row.points),
      status: row.is_active ? 'active' : row.expires_at && new Date(row.expires_at) <= new Date() ? 'expired' : row.status,
      active: Boolean(row.is_active),
      issuedBy: row.issued_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at || null,
      evidence: evidenceFromMetadata(row.issue_metadata),
    })),
    restrictions: restrictions.rows.map((row) => ({
      id: row.restriction_id,
      type: row.type,
      module: row.module || null,
      active: Boolean(row.is_active),
      issuedBy: row.issued_by,
      startsAt: row.starts_at,
      endsAt: row.ends_at || null,
      warningId: row.violation_id || null,
    })),
    history: history.rows.map((row) => {
      const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
      return {
        id: row.account_activity_id,
        eventCode: row.event_code,
        action: row.action,
        status: meta.status || null,
        previousStatus: meta.previousStatus || null,
        reason: meta.reason || meta.note || null,
        endsAt: meta.banEndsAt || meta.suspensionEndsAt || meta.lockEndsAt || meta.endsAt || meta.expiresAt || null,
        disputeNumber: meta.disputeNumber || null,
        actor: row.actor_name ? { name: row.actor_name, role: row.actor_role || 'Staff' } : null,
        createdAt: row.created_at,
        evidence: evidenceFromMetadata(meta),
      };
    }),
  };
}

async function appealHistory(accountId, ticketId) {
  const [tickets, hold] = await Promise.all([
    pool.query(
      `
      SELECT t.ticket_id, t.ticket_number, t.type, t.status, t.appeal_decision, t.appeal_decided_at, t.created_at,
             to_jsonb(t) ->> 'appeal_target_type' AS appeal_target_type,
             to_jsonb(t) ->> 'appeal_target_label' AS appeal_target_label
      FROM tickets t
      WHERE t.account_id = $1 AND t.deleted_at IS NULL AND t.ticket_id <> $2
        AND (t.type = $3 OR t.type::text LIKE 'Appeal a %')
      ORDER BY t.created_at DESC
      LIMIT 10
      `,
      [accountId, ticketId, APPEAL_TICKET_TYPE]
    ),
    pool.query(
      `SELECT decision, blocked_until, permanently_denied, decided_at, ticket_id
       FROM account_appeal_holds WHERE account_id = $1`,
      [accountId]
    ),
  ]);
  const holdRow = hold.rows[0] || null;
  return {
    previous: tickets.rows.map((row) => ({
      id: row.ticket_id,
      number: row.ticket_number,
      type: row.type,
      status: row.status,
      decision: row.appeal_decision || null,
      decidedAt: row.appeal_decided_at || null,
      createdAt: row.created_at,
      // Null for account-wide appeals filed before appeals were per penalty.
      targetType: row.appeal_target_type || null,
      targetLabel: row.appeal_target_label || null,
    })),
    // Account-wide denial from before appeals were per penalty; it only covers older penalties.
    hold: holdRow
      ? {
          decision: holdRow.decision,
          permanentlyDenied: Boolean(holdRow.permanently_denied),
          blockedUntil: holdRow.blocked_until || null,
          active:
            Boolean(holdRow.permanently_denied) ||
            Boolean(holdRow.blocked_until && new Date(holdRow.blocked_until) > new Date()),
          decidedAt: holdRow.decided_at,
          ticketId: holdRow.ticket_id || null,
        }
      : null,
  };
}

/** The record a member names in "Case ID": a warning, dispute, report, ticket or listing number. */
async function referencedCase(caseText, accountId) {
  const value = String(caseText || '').trim();
  if (!value || /^not provided$/i.test(value)) return null;
  const id = uuidIn(value);
  const token = value.split(/\s+/)[0].replace(/^#/, '');
  const result = await pool.query(
    `
    SELECT * FROM (
      -- Every column is cast: disputes use native enums, which UNION cannot mix with varchar.
      SELECT 'warning'::text AS kind, v.violation_id::text AS id, v.violation_number::text AS number,
             v.type::text AS title, v.status::text AS status, v.created_at::timestamptz AS created_at,
             (v.account_id = $3) AS own, v.reason::text AS detail
      FROM violations v
      WHERE v.deleted_at IS NULL AND (LOWER(v.violation_number) = LOWER($1) OR v.violation_id::text = $2)
      UNION ALL
      SELECT 'restriction', r.restriction_id::text, NULL::text, r.type::text, NULL::text, r.created_at::timestamptz,
             (r.account_id = $3), r.module::text
      FROM restrictions r WHERE r.restriction_id::text = $2
      UNION ALL
      SELECT 'dispute', d.dispute_id::text, d.dispute_number::text, d.title::text, d.status::text,
             d.opened_at::timestamptz, (d.by_account_id = $3 OR d.for_account_id = $3), d.sanction_type::text
      FROM disputes d
      WHERE d.deleted_at IS NULL AND (LOWER(d.dispute_number) = LOWER($1) OR d.dispute_id::text = $2)
      UNION ALL
      SELECT 'report', r.report_id::text, r.report_number::text, r.type::text, r.status::text, r.created_at::timestamptz,
             (r.for_account_id = $3 OR r.by_account_id = $3), r.target_type::text
      FROM reports r
      WHERE r.deleted_at IS NULL AND (LOWER(r.report_number) = LOWER($1) OR r.report_id::text = $2)
      UNION ALL
      SELECT 'ticket', t.ticket_id::text, t.ticket_number::text, t.type::text, t.status::text, t.created_at::timestamptz,
             (t.account_id = $3), NULL::text
      FROM tickets t
      WHERE t.deleted_at IS NULL AND (LOWER(t.ticket_number) = LOWER($1) OR t.ticket_id::text = $2)
      UNION ALL
      SELECT 'listing', l.listing_id::text, l.listing_number::text, l.title::text, l.status::text, l.created_at::timestamptz,
             (l.submitted_by_account_id = $3), l.rejection_reason::text
      FROM marketplace_listings l
      WHERE LOWER(COALESCE(l.listing_number, '')) = LOWER($1) OR l.listing_id::text = $2
    ) found
    LIMIT 1
    `,
    [token, id || '', accountId]
  );
  const row = result.rows[0];
  if (!row) return { found: false, query: value.slice(0, 80) };
  return {
    found: true,
    query: value.slice(0, 80),
    kind: row.kind,
    id: row.id,
    number: row.number || null,
    title: row.title || null,
    status: row.status || null,
    detail: row.detail || null,
    belongsToRequester: Boolean(row.own),
    createdAt: row.created_at || null,
  };
}

/**
 * Area appeals also show the actions taken in that area, on the member's own listings and
 * postings and on those of teams they own (`actorIds`).
 */
async function areaActions(area, accountId, actorIds = [accountId]) {
  if (area === 'marketplace') {
    const result = await pool.query(
      `
      SELECT l.listing_id, l.listing_number, l.title, l.status, l.rejection_reason, l.moderation_note,
             l.permanently_rejected_at, l.reviewed_at, l.updated_at
      FROM marketplace_listings l
      WHERE l.submitted_by_account_id = ANY($1::uuid[]) AND l.status IN ('rejected', 'delisted', 'pending', 'scheduled')
      ORDER BY COALESCE(l.reviewed_at, l.updated_at) DESC
      LIMIT 10
      `,
      [actorIds]
    );
    return result.rows.map((row) => ({
      id: row.listing_id,
      label: row.title,
      number: row.listing_number || null,
      status: row.status === 'rejected' && row.permanently_rejected_at ? 'permanently rejected' : row.status,
      reason: row.rejection_reason || row.moderation_note || null,
      at: row.reviewed_at || row.updated_at,
    }));
  }
  if (area === 'jobs') {
    const result = await pool.query(
      `
      SELECT aa.account_activity_id, aa.reference_id, aa.metadata, aa.created_at, posting.title, posting.kind
      FROM account_activity aa
      JOIN (
        SELECT job_id::text AS id, title, 'job' AS kind FROM jobs WHERE client_account_id = ANY($1::uuid[])
        UNION ALL
        SELECT gig_id::text, title, 'gig' FROM gigs WHERE freelancer_account_id = ANY($1::uuid[])
      ) posting ON posting.id = aa.reference_id
      WHERE aa.event_code IN ('JOBS_POSTING_STATUS_CHANGED', 'JOBS_POSTING_ARCHIVED')
      ORDER BY aa.created_at DESC
      LIMIT 10
      `,
      [actorIds]
    );
    return result.rows.map((row) => {
      const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
      return {
        id: row.reference_id,
        label: `${row.kind === 'gig' ? 'Gig' : 'Job'}: ${row.title || 'Untitled'}`,
        number: null,
        status: meta.status || null,
        reason: meta.reason || null,
        at: row.created_at,
      };
    });
  }
  if (area === 'forum') {
    const result = await pool.query(
      `
      SELECT aa.account_activity_id, aa.action, aa.event_code, aa.metadata, aa.created_at
      FROM account_activity aa
      WHERE aa.account_id = $1 AND (aa.event_code LIKE 'FORUM%' OR aa.event_code LIKE '%TIMEOUT%')
      ORDER BY aa.created_at DESC
      LIMIT 10
      `,
      [accountId]
    );
    return result.rows.map((row) => {
      const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
      return {
        id: row.account_activity_id,
        label: row.action,
        number: null,
        status: meta.status || null,
        reason: meta.reason || null,
        at: row.created_at,
      };
    });
  }
  return [];
}

async function appealContext(row, form, notes) {
  const accountId = row.account_id;
  const area = AREA_APPEALS[row.type] || null;
  const caseAnswer = answerOf(form, 'case_id');
  // Marketplace and jobs appeals may name the listing, job or gig the action was on.
  const itemAnswer = area === 'marketplace' || area === 'jobs' ? answerOf(form, 'listing') : { value: '', id: null };
  const itemId = itemAnswer.id || uuidIn(itemAnswer.value);
  const { describeAppealTarget } = require('../services/PenaltyAppealServices');
  const actorIds = area ? await requesterActorIds(accountId) : [accountId];
  const [record, appeals, caseRef, actions, reports, target, listing, posting] = await Promise.all([
    section(notes, 'Punishment record', () => punishmentRecord(accountId)),
    section(notes, 'Appeal history', () => appealHistory(accountId, row.ticket_id)),
    section(notes, 'Referenced case', () => referencedCase(caseAnswer.value, accountId)),
    area ? section(notes, 'Area actions', () => areaActions(area, accountId, actorIds)) : Promise.resolve(null),
    section(notes, 'Reports against the member', () => reportsList('r.for_account_id = $1', [accountId], 10)),
    // `row` is `tickets.*`, so the target columns are there once the per-penalty migration ran.
    row.appeal_target_type
      ? section(notes, 'Appealed penalty', () => describeAppealTarget(row))
      : Promise.resolve(null),
    area === 'marketplace' && itemId
      ? section(notes, 'Listing', async () => {
          const listingId = await resolveListingId({ id: itemId, value: '' });
          return listingId ? listingSummary(listingId) : null;
        })
      : Promise.resolve(null),
    area === 'jobs' && itemId ? section(notes, 'Posting', () => postingSummary(itemId)) : Promise.resolve(null),
  ]);
  const itemFailed = notes.some((note) => note === 'Listing could not be loaded.' || note === 'Posting could not be loaded.');
  if (itemId && !listing && !posting && !itemFailed) {
    notes.push('The listing, job or gig named in this appeal was not found.');
  }
  const item = listing || posting;
  const ownerId = listing ? listing.seller.accountId : posting ? posting.owner.accountId : null;
  if (item && ownerId && !actorIds.includes(String(ownerId))) {
    notes.push(`The ${listing ? 'listing' : 'job or gig'} in this appeal belongs to someone else.`);
  }
  const related = item
    ? await section(notes, 'Related tickets', () =>
        ticketsReferencing([itemId, item.id, listing?.marketAssetId], row.ticket_id)
      )
    : null;
  return {
    area: area || 'account',
    // Only "Appeal an account penalty" has the accept / deny flow; area appeals are resolved by acting on the item.
    decidable: row.type === APPEAL_TICKET_TYPE,
    decision: row.appeal_decision || null,
    decidedAt: row.appeal_decided_at || null,
    // The one penalty this appeal is about (null: an account-wide appeal from before the change).
    target,
    // Marketplace appeals: what the member says happened (listing rejected, selling restricted…).
    actionTaken: answerOf(form, 'action_taken').value || null,
    reasonGiven: answerOf(form, 'why_reverse', 'explanation').value || null,
    evidence: answerOf(form, 'evidence').value || null,
    referencedCase: caseRef,
    // The item the member picked (marketplace / jobs appeals only).
    listing: listing || null,
    posting: posting || null,
    relatedTickets: related || null,
    record,
    appeals,
    areaActions: actions,
    reportsAgainst: reports,
  };
}

/* ------------------------------------------------------------------ */
/* Marketplace                                                         */
/* ------------------------------------------------------------------ */

/** Thread entries a case shows, newest last; older ones stay on the listing desk. */
const LISTING_THREAD_PREVIEW = 8;

async function listingSummary(listingId) {
  const { getMarketplaceListingDetail } = require('./MarketplaceModeratorRepositories');
  const listing = await getMarketplaceListingDetail(listingId);
  if (!listing) return null;
  const files = listing.asset?.mediaFiles || listing.asset?.files || [];
  const thread = Array.isArray(listing.thread) ? listing.thread : [];
  return {
    id: listing.id,
    number: listing.number || null,
    title: listing.title,
    category: listing.category || null,
    status: listing.status,
    priceCredits: num(listing.priceCredits),
    assetType: listing.assetType || null,
    marketAssetId: listing.marketAssetId || null,
    rejectionReason: listing.rejectionReason || null,
    // Rejected for good: the seller cannot resubmit it.
    permanentlyRejected: Boolean(listing.permanentlyRejected),
    permanentlyRejectedAt: listing.permanentlyRejectedAt || null,
    moderationNote: listing.moderationNote || null,
    // Go-live time while `scheduled`; when it went live once `approved`.
    publishAt: listing.publishAt || null,
    reviewedBy: listing.reviewedBy?.name || null,
    reviewedAt: listing.reviewedAt || null,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt || null,
    seller: {
      accountId: listing.submittedBy?.accountId || null,
      name: listing.submittedBy?.name || 'Unknown',
      handle: listing.submittedBy?.handle && listing.submittedBy.handle !== '—' ? listing.submittedBy.handle : null,
      status: listing.seller?.status || null,
      merit: listing.seller?.merit ?? null,
      listings: listing.seller?.listings || null,
    },
    // The review conversation between the seller and the marketplace team.
    thread: {
      total: thread.length,
      items: thread.slice(-LISTING_THREAD_PREVIEW).map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        authorType: entry.authorType,
        authorName: entry.authorName || null,
        authorRole: entry.authorRole || null,
        body: entry.body ? String(entry.body).slice(0, 600) : null,
        publishAt: entry.publishAt || null,
        createdAt: entry.createdAt,
      })),
    },
    asset: listing.asset
      ? {
          id: listing.asset.id,
          name: listing.asset.name,
          status: listing.asset.status,
          tags: Array.isArray(listing.asset.tags) ? listing.asset.tags.slice(0, 12) : [],
          stats: listing.asset.stats || null,
          files: (Array.isArray(files) ? files : []).slice(0, 12).map((file) => ({
            name: file.originalName || file.name || 'File',
            type: file.type || file.mimeType || null,
            sizeBytes: file.sizeBytes ?? null,
            processingStatus: file.processingStatus || null,
            processingError: file.processingError || null,
          })),
        }
      : null,
    reports: listing.reports || { open: 0, total: 0, items: [] },
    history: (listing.reviewHistory || []).slice(0, 8),
    duplicateSignals: Array.isArray(listing.duplicates) ? listing.duplicates.length : 0,
  };
}

async function listingIdForAsset(marketAssetId) {
  const result = await pool.query(
    `SELECT listing_id FROM marketplace_listings WHERE market_asset_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [marketAssetId]
  );
  return result.rows[0]?.listing_id || null;
}

/** The buyer's licenses for one asset: what was paid, refunds, and where it is used. */
async function purchaseSummary(accountId, marketAssetId) {
  const result = await pool.query(
    `
    SELECT l.market_asset_license_id, l.status, l.price_credits, l.purchased_at, l.assigned_at,
           p.name AS project_name, ct.status AS transaction_status, ct.credit_transaction_id, ma.name AS asset_name
    FROM market_asset_licenses l
    JOIN users u ON u.user_id = l.buyer_user_id
    JOIN market_assets ma ON ma.market_asset_id = l.market_asset_id
    LEFT JOIN projects p ON p.project_id = l.project_id
    LEFT JOIN credit_transactions ct ON ct.credit_transaction_id = l.credit_transaction_id
    WHERE u.account_id = $1 AND l.market_asset_id = $2 AND l.deleted_at IS NULL
    ORDER BY l.purchased_at DESC
    LIMIT 10
    `,
    [accountId, marketAssetId]
  );
  return {
    assetName: result.rows[0]?.asset_name || null,
    licenses: result.rows.map((row) => ({
      id: row.market_asset_license_id,
      status: row.status,
      priceCredits: num(row.price_credits),
      purchasedAt: row.purchased_at,
      assignedProject: row.project_name || null,
      assignedAt: row.assigned_at || null,
      transactionId: row.credit_transaction_id || null,
      transactionStatus: row.transaction_status || null,
    })),
  };
}

async function buyerStats(accountId) {
  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS purchases,
           COUNT(*) FILTER (WHERE l.status = 'refunded')::int AS refunded,
           COALESCE(SUM(l.price_credits), 0)::int AS spent
    FROM market_asset_licenses l
    JOIN users u ON u.user_id = l.buyer_user_id
    WHERE u.account_id = $1 AND l.deleted_at IS NULL
    `,
    [accountId]
  );
  const row = result.rows[0] || {};
  return { purchases: num(row.purchases), refunded: num(row.refunded), spentCredits: num(row.spent) };
}

/** Listings the requester submitted, as themselves or as a team they own. */
async function sellerListings(actorIds) {
  const result = await pool.query(
    `
    SELECT listing_id, listing_number, title, status, price_credits, rejection_reason, created_at
    FROM marketplace_listings
    WHERE submitted_by_account_id = ANY($1::uuid[])
    ORDER BY created_at DESC
    LIMIT 8
    `,
    [actorIds]
  );
  return result.rows.map((row) => ({
    id: row.listing_id,
    number: row.listing_number || null,
    title: row.title,
    status: row.status,
    priceCredits: num(row.price_credits),
    rejectionReason: row.rejection_reason || null,
    createdAt: row.created_at,
  }));
}

/**
 * Reviews on one asset, newest first, removed ones included (staff judge review reports on them).
 * The named reviewer's review comes first, so a report about it is never cut off the list.
 */
async function assetReviews(marketAssetId, reviewerAccountId = null) {
  const result = await pool.query(
    `
    SELECT r.asset_review_id, r.rating, r.review, r.created_at, r.updated_at, r.deleted_at,
           r.account_id, ${MEMBER_NAME_SQL('a', 'u')} AS author_name, a.handle AS author_handle,
           COUNT(*) FILTER (WHERE r.deleted_at IS NULL) OVER ()::int AS live_count,
           ROUND((AVG(r.rating) FILTER (WHERE r.deleted_at IS NULL) OVER ())::numeric, 1) AS live_average
    FROM asset_reviews r
    LEFT JOIN accounts a ON a.account_id = r.account_id
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE r.market_asset_id = $1
    ORDER BY (r.account_id = $2::uuid) DESC NULLS LAST, r.created_at DESC
    LIMIT 10
    `,
    [marketAssetId, reviewerAccountId]
  );
  const first = result.rows[0];
  return {
    total: num(first?.live_count),
    averageRating: first?.live_average == null ? null : Number(first.live_average),
    reviewerFound: Boolean(reviewerAccountId && result.rows.some((row) => String(row.account_id) === String(reviewerAccountId))),
    items: result.rows.map((row) => ({
      id: row.asset_review_id,
      rating: num(row.rating),
      text: String(row.review || '').slice(0, 1200),
      author: { accountId: row.account_id, name: row.author_name, handle: row.author_handle || null },
      byNamedReviewer: Boolean(reviewerAccountId && String(row.account_id) === String(reviewerAccountId)),
      edited: Boolean(row.updated_at && row.created_at && new Date(row.updated_at) - new Date(row.created_at) > 60000),
      removed: Boolean(row.deleted_at),
      createdAt: row.created_at,
    })),
  };
}

/** A listing id from a form answer: the picker id, a pasted link, or an asset id. */
async function resolveListingId(answer) {
  const id = answer.id || uuidIn(answer.value);
  if (!id) return null;
  const direct = await pool.query(`SELECT listing_id FROM marketplace_listings WHERE listing_id = $1`, [id]);
  if (direct.rows.length) return direct.rows[0].listing_id;
  return listingIdForAsset(id);
}

async function marketplaceContext(row, form, notes) {
  const accountId = row.account_id;
  const orderAnswer = answerOf(form, 'order');
  // `listing` is the listing / asset picker; the other keys are answers from older forms.
  const listingAnswer = answerOf(form, 'listing', 'listing_or_seller', 'review_link');
  const sellerAnswer = answerOf(form, 'seller_username');
  const assetId = orderAnswer.id || uuidIn(orderAnswer.value);

  const listingId = await section(notes, 'Listing', async () => {
    if (assetId) return listingIdForAsset(assetId);
    return resolveListingId(listingAnswer);
  });
  const isReport = row.type === 'Report a listing or seller';
  const isReviewTicket = row.type === 'Asset reviews';
  // The current report form names the seller in its own field; on older forms one field held
  // a listing link or a seller username, so text that matched no listing was read as a seller.
  const currentReportForm = form.some((item) => item.key === 'report_target');
  const reportedText = isReport
    ? currentReportForm
      ? sellerAnswer.value || null
      : !listingId ? listingAnswer.value || null : null
    : null;
  const actorIds = await requesterActorIds(accountId);
  const reviewerText = isReviewTicket ? answerOf(form, 'reviewer_username').value : '';

  const [listing, purchase, reportedByName, reviewerId] = await Promise.all([
    listingId ? section(notes, 'Listing', () => listingSummary(listingId)) : Promise.resolve(null),
    assetId ? section(notes, 'Purchase', () => purchaseSummary(accountId, assetId)) : Promise.resolve(null),
    reportedText ? section(notes, 'Reported seller', () => accountFromText(reportedText)) : Promise.resolve(null),
    reviewerText ? accountIdForHandle(handleIn(reviewerText)).catch(() => null) : Promise.resolve(null),
  ]);
  const sellerIsRequester = Boolean(listing?.seller.accountId && actorIds.includes(String(listing.seller.accountId)));
  // A review ticket from the asset's own seller is about reviews they received.
  const sellerSide = ['Seller verification', 'Listing review', 'Appeal a marketplace action'].includes(row.type)
    || (isReviewTicket && sellerIsRequester);
  const reviewedAssetId = listing?.marketAssetId || listing?.asset?.id || null;

  const checksEligibility = row.type === 'Seller verification' || row.type === 'Listing review';
  const [buyer, ownListings, reportedOwner, reviews, related, eligibility] = await Promise.all([
    sellerSide ? Promise.resolve(null) : section(notes, 'Buyer history', () => buyerStats(accountId)),
    sellerSide ? section(notes, 'Seller listings', () => sellerListings(actorIds)) : Promise.resolve(null),
    // Reporting a listing reports its seller: staff need the seller's standing either way.
    isReport && !reportedByName && listing?.seller.accountId
      ? section(notes, 'Reported seller', () => accountSummary(listing.seller.accountId))
      : Promise.resolve(null),
    isReviewTicket && reviewedAssetId
      ? section(notes, 'Asset reviews', () => assetReviews(reviewedAssetId, reviewerId))
      : Promise.resolve(null),
    // Other tickets may name the same item by its listing id (listing picker) or asset id.
    section(notes, 'Related tickets', () =>
      ticketsReferencing([assetId, listingId, listing?.marketAssetId, listing?.asset?.id], row.ticket_id)
    ),
    checksEligibility ? section(notes, 'Selling eligibility', () => sellingEligibility(accountId)) : Promise.resolve(null),
  ]);

  if (purchase && !purchase.licenses.length) {
    notes.push('The requester has no license for the asset named in this ticket.');
  }
  if (listing && sellerSide && !isReviewTicket && listing.seller.accountId && !sellerIsRequester) {
    notes.push('The listing in this ticket belongs to another seller.');
  }
  if (listing && isReport && sellerIsRequester) {
    notes.push('The requester reported a listing they sell.');
  }
  if (reviewerText && reviews && !reviews.reviewerFound) {
    notes.push(
      reviewerId
        ? `@${handleIn(reviewerText)} has no review on this asset.`
        : `No member matches the reviewer "${reviewerText.slice(0, 60)}".`
    );
  }
  return {
    role: sellerSide ? 'seller' : 'buyer',
    listing,
    purchase,
    buyer,
    sellerListings: ownListings,
    reportedSeller: reportedByName || reportedOwner || null,
    reportedText: reportedText || null,
    reviews: reviews || null,
    sellingEligibility: eligibility || null,
    // False for types that name no listing or purchase ("Seller verification").
    asksListing: typeAsksAny(row.type, ['listing', 'order']),
    relatedTickets: related || [],
  };
}

/** Whether a ticket type's form has any of these questions. */
function typeAsksAny(type, keys) {
  const { fieldsForType } = require('../lib/TicketFormFields');
  return fieldsForType(normalizeTicketType(type, type)).some((field) => keys.includes(field.key));
}

/* ------------------------------------------------------------------ */
/* Jobs & Gigs                                                         */
/* ------------------------------------------------------------------ */

/** `requesterIds`: the requester's own account first, then teams they own. */
async function contractSummary(contractId, requesterIds) {
  const { getContractWithParties } = require('./ContractRepositories');
  const contract = await getContractWithParties(contractId);
  if (!contract) return null;
  const requesterId = requesterIds[0] || null;
  const [extra, milestones, disputes, transactions, parties, gigOrders, ratings] = await Promise.all([
    pool.query(
      `SELECT payment_type, created_at, ended_at, dispute_hold_since FROM contracts WHERE contract_id = $1`,
      [contractId]
    ),
    pool.query(
      `
      SELECT contract_milestone_id, index, name, status, credits, deadline_at, started_at
      FROM contract_milestones
      WHERE contract_id = $1
      ORDER BY index ASC
      `,
      [contractId]
    ),
    pool.query(
      `
      SELECT d.dispute_id, d.dispute_number, d.title, d.status, d.opened_at, d.visibility,
             (d.by_account_id = ANY($2::uuid[])) AS filed_by_requester
      FROM disputes d
      WHERE d.contract_id = $1 AND d.deleted_at IS NULL
      ORDER BY d.opened_at DESC NULLS LAST
      LIMIT 10
      `,
      [contractId, requesterIds]
    ),
    pool.query(
      `
      SELECT ct.credit_transaction_id, ct.type, ct.amount_credits, ct.status, ct.created_at
      FROM credit_transactions ct
      WHERE (ct.reference_table = 'contracts' AND ct.reference_id = $1)
         OR (
           ct.reference_table IN ('contract_milestones', 'contract_milestone_revisions')
           AND ct.reference_id IN (SELECT contract_milestone_id FROM contract_milestones WHERE contract_id = $1)
         )
      ORDER BY ct.created_at DESC
      LIMIT 20
      `,
      [contractId]
    ),
    Promise.all([accountSummary(contract.client_account_id), accountSummary(contract.freelancer_account_id)]),
    gigOrdersForContracts([contractId]).catch((err) => {
      console.warn('Ticket case gig order skipped:', err.message);
      return new Map();
    }),
    // Reviews the two sides left on each other (`ratings.account_id` is the author).
    pool
      .query(
        `
        SELECT r.rating_id, r.stars_out_of_five, r.feedback, r.created_at, r.deleted_at, r.account_id,
               ${MEMBER_NAME_SQL('a', 'u')} AS author_name, a.handle AS author_handle
        FROM ratings r
        LEFT JOIN accounts a ON a.account_id = r.account_id
        LEFT JOIN users u ON u.account_id = a.account_id
        WHERE r.contract_id = $1
        ORDER BY r.created_at ASC
        LIMIT 6
        `,
        [contractId]
      )
      .catch((err) => {
        console.warn('Ticket case contract ratings skipped:', err.message);
        return { rows: [] };
      }),
  ]);
  const milestoneRows = milestones.rows.map((m) => ({
    id: m.contract_milestone_id,
    index: num(m.index),
    name: m.name,
    status: m.status,
    credits: num(m.credits),
    deadlineAt: m.deadline_at || null,
    startedAt: m.started_at || null,
  }));
  // A team the requester owns counts as the requester (they act as it on Jobs & Gigs).
  const isRequester = (id) => id != null && requesterIds.includes(String(id));
  const requesterRole = isRequester(contract.client_account_id)
    ? 'client'
    : isRequester(contract.freelancer_account_id)
      ? 'freelancer'
      : null;
  const requesterViaTeam = Boolean(
    requesterRole
      && String(requesterRole === 'client' ? contract.client_account_id : contract.freelancer_account_id) !== String(requesterId)
  );
  return {
    id: contract.contract_id,
    title: contract.contract_title,
    type: contract.contract_type,
    paymentType: extra.rows[0]?.payment_type || null,
    status: contract.status,
    rateCredits: num(contract.rate_credits),
    startsAt: contract.starts_at || null,
    deadlineAt: contract.deadline_at || null,
    createdAt: extra.rows[0]?.created_at || null,
    endedAt: extra.rows[0]?.ended_at || null,
    // Escrow and deadlines are frozen while a dispute holds the contract.
    disputeHoldSince: extra.rows[0]?.dispute_hold_since || null,
    requesterRole,
    // True when the requester is on this contract through a team they own.
    requesterViaTeam,
    client: parties[0],
    freelancer: parties[1],
    // Gig orders: the package and add-ons the client ordered. Null for job contracts.
    gigOrder: gigOrders.get(String(contract.contract_id)) || null,
    milestones: milestoneRows,
    milestoneTotals: {
      count: milestoneRows.length,
      credits: milestoneRows.reduce((sum, m) => sum + m.credits, 0),
      completed: milestoneRows.filter((m) => /complete|paid|released|approved/i.test(m.status || '')).length,
    },
    disputes: disputes.rows.map((d) => ({
      id: d.dispute_id,
      number: d.dispute_number,
      title: d.title,
      status: d.status,
      public: Boolean(d.visibility),
      // Only public cases have a member page; private ones live on the dispute desk.
      publicPath: d.visibility ? `/disputes/${d.dispute_id}` : null,
      filedByRequester: Boolean(d.filed_by_requester),
      openedAt: d.opened_at,
    })),
    ratings: ratings.rows.map((r) => {
      const author = String(r.account_id);
      return {
        id: r.rating_id,
        stars: num(r.stars_out_of_five),
        feedback: String(r.feedback || '').slice(0, 1200),
        authorRole:
          author === String(contract.client_account_id)
            ? 'client'
            : author === String(contract.freelancer_account_id)
              ? 'freelancer'
              : null,
        author: { accountId: r.account_id, name: r.author_name, handle: r.author_handle || null },
        byRequester: requesterIds.includes(author),
        removed: Boolean(r.deleted_at),
        createdAt: r.created_at,
      };
    }),
    transactions: transactions.rows.map((t) => ({
      id: t.credit_transaction_id,
      type: t.type,
      credits: num(t.amount_credits),
      status: t.status,
      createdAt: t.created_at,
    })),
  };
}

async function postingSummary(postingId) {
  const job = await pool.query(
    `
    SELECT j.job_id AS id, 'job'::text AS kind, j.title::text AS title, j.status::text AS status,
           j.created_at::timestamptz AS created_at, j.deleted_at::timestamptz AS deleted_at,
           j.staff_hold_at::timestamptz AS staff_hold_at,
           j.client_account_id AS owner_id, ${MEMBER_NAME_SQL('a', 'u')} AS owner_name, a.handle AS owner_handle
    FROM jobs j
    LEFT JOIN accounts a ON a.account_id = j.client_account_id
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE j.job_id = $1
    UNION ALL
    SELECT g.gig_id, 'gig', g.title::text, g.status::text, g.created_at::timestamptz, g.deleted_at::timestamptz,
           g.staff_hold_at::timestamptz,
           g.freelancer_account_id, ${MEMBER_NAME_SQL('a', 'u')}, a.handle
    FROM gigs g
    LEFT JOIN accounts a ON a.account_id = g.freelancer_account_id
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE g.gig_id = $1
    LIMIT 1
    `,
    [postingId]
  );
  const row = job.rows[0];
  if (!row) return null;
  const [reports, history] = await Promise.all([
    reportsList('r.target_id = $1', [String(postingId)], 10),
    pool.query(
      `
      SELECT aa.account_activity_id, aa.metadata, aa.created_at, ${STAFF_NAME_SQL('s', 'sa')} AS actor_name
      FROM account_activity aa
      LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
      LEFT JOIN accounts sa ON sa.account_id = s.account_id
      WHERE aa.reference_id = $1 AND aa.event_code IN ('JOBS_POSTING_STATUS_CHANGED', 'JOBS_POSTING_ARCHIVED')
      ORDER BY aa.created_at DESC
      LIMIT 10
      `,
      [String(postingId)]
    ),
  ]);
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    status: row.deleted_at ? 'archived' : row.status,
    createdAt: row.created_at,
    deletedAt: row.deleted_at || null,
    // Staff paused, closed or archived it: the owner cannot reopen it themselves.
    staffHoldAt: row.staff_hold_at || null,
    owner: { accountId: row.owner_id, name: row.owner_name, handle: row.owner_handle || null },
    reports,
    history: history.rows.map((h) => {
      const meta = h.metadata && typeof h.metadata === 'object' ? h.metadata : {};
      return {
        id: h.account_activity_id,
        status: meta.status || null,
        previousStatus: meta.previousStatus || null,
        reason: meta.reason || null,
        actor: h.actor_name,
        createdAt: h.created_at,
      };
    }),
  };
}

/**
 * Proposals on one job, as "Proposals and hiring" needs them: the requester's own proposals when
 * they applied, the job's proposal counts when they posted it, and the proposal they named.
 */
async function jobProposals(jobId, actorIds, namedText, { requesterOwnsJob = false } = {}) {
  const namedId = uuidIn(namedText);
  const [result, counts] = await Promise.all([
    pool.query(
      `
      SELECT p.proposal_id, p.job_id, p.status, p.rate_credits, p.reject_reason, p.created_at, p.updated_at,
             p.deleted_at, p.freelancer_account_id, ${MEMBER_NAME_SQL('a', 'u')} AS freelancer_name,
             a.handle AS freelancer_handle,
             (p.freelancer_account_id = ANY($2::uuid[])) AS mine,
             (p.proposal_id = $3::uuid) AS named
      FROM proposals p
      LEFT JOIN accounts a ON a.account_id = p.freelancer_account_id
      LEFT JOIN users u ON u.account_id = a.account_id
      WHERE (p.job_id = $1 AND ($4::boolean OR p.freelancer_account_id = ANY($2::uuid[])))
         OR p.proposal_id = $3::uuid
      ORDER BY (p.proposal_id = $3::uuid) DESC NULLS LAST, p.created_at DESC
      LIMIT 12
      `,
      [jobId, actorIds, namedId, requesterOwnsJob]
    ),
    pool.query(
      `
      SELECT CASE WHEN deleted_at IS NOT NULL THEN 'withdrawn' ELSE LOWER(COALESCE(status, 'unknown')) END AS status,
             COUNT(*)::int AS count
      FROM proposals
      WHERE job_id = $1
      GROUP BY 1
      `,
      [jobId]
    ),
  ]);
  const mapProposal = (p) => ({
    id: p.proposal_id,
    status: p.deleted_at ? 'withdrawn' : p.status,
    rateCredits: num(p.rate_credits),
    rejectReason: p.reject_reason || null,
    freelancer: { accountId: p.freelancer_account_id, name: p.freelancer_name, handle: p.freelancer_handle || null },
    byRequester: Boolean(p.mine),
    onThisJob: String(p.job_id) === String(jobId),
    createdAt: p.created_at,
    updatedAt: p.updated_at || null,
  });
  const onJob = result.rows.filter((p) => String(p.job_id) === String(jobId) && !p.named);
  const byStatus = Object.fromEntries(counts.rows.map((c) => [c.status, num(c.count)]));
  const named = result.rows.find((p) => p.named);
  return {
    total: counts.rows.reduce((sum, c) => sum + num(c.count), 0),
    byStatus,
    requesterOwnsJob,
    mine: onJob.filter((p) => p.mine).slice(0, 5).map(mapProposal),
    // Other freelancers' proposals only matter when the requester posted the job.
    latest: requesterOwnsJob ? onJob.filter((p) => !p.mine).slice(0, 5).map(mapProposal) : [],
    named: named ? mapProposal(named) : null,
    namedQuery: namedText ? String(namedText).slice(0, 80) : null,
  };
}

async function jobsActivity(accountId) {
  const result = await pool.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM jobs WHERE client_account_id = $1 AND deleted_at IS NULL) AS jobs,
      (SELECT COUNT(*)::int FROM gigs WHERE freelancer_account_id = $1 AND deleted_at IS NULL) AS gigs,
      (SELECT COUNT(DISTINCT c.contract_id)::int
         FROM contracts c
         LEFT JOIN job_contracts jc ON jc.contract_id = c.contract_id
         LEFT JOIN proposals p ON p.proposal_id = jc.proposal_id
         LEFT JOIN jobs j ON j.job_id = p.job_id
         LEFT JOIN gig_contracts gc ON gc.contract_id = c.contract_id
         LEFT JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
         LEFT JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
         LEFT JOIN gigs g ON g.gig_id = gt.gig_id
         WHERE j.client_account_id = $1 OR p.freelancer_account_id = $1
            OR gr.client_account_id = $1 OR g.freelancer_account_id = $1) AS contracts
    `,
    [accountId]
  );
  const row = result.rows[0] || {};
  return { jobs: num(row.jobs), gigs: num(row.gigs), contracts: num(row.contracts) };
}

async function jobsContext(row, form, notes) {
  const accountId = row.account_id;
  const contractAnswer = answerOf(form, 'contract_or_order');
  const contractId = contractAnswer.id || uuidIn(contractAnswer.value);
  // `listing` is the job / gig picker (own postings, or any posting on a report).
  const postingAnswer = answerOf(form, 'listing', 'review_link');
  const postingId = postingAnswer.id || uuidIn(postingAnswer.value);
  // `reported_username` on the current report form; `link_or_username` on older ones.
  const reportedAnswer = answerOf(form, 'reported_username', 'link_or_username');
  const reportedId = uuidIn(reportedAnswer.value);
  const actorIds = await requesterActorIds(accountId);

  const [contract, posting, reportedPosting, reportedMember, activity] = await Promise.all([
    contractId ? section(notes, 'Contract', () => contractSummary(contractId, actorIds)) : Promise.resolve(null),
    postingId ? section(notes, 'Posting', () => postingSummary(postingId)) : Promise.resolve(null),
    reportedId ? section(notes, 'Reported posting', () => postingSummary(reportedId)) : Promise.resolve(null),
    reportedAnswer.value ? section(notes, 'Reported member', () => accountFromText(reportedAnswer.value)) : Promise.resolve(null),
    section(notes, 'Jobs activity', () => jobsActivity(accountId)),
  ]);
  // A typed contract answer may be a pasted job or gig link rather than a contract.
  const typedPosting = contractId && !contract && !contractAnswer.id && !postingId
    ? await section(notes, 'Posting', () => postingSummary(contractId))
    : null;
  const shownPosting = posting || reportedPosting || typedPosting;
  const isReport = row.type === 'Report a listing or user';
  const proposalText = answerOf(form, 'proposal_id').value;
  const wantsProposals = row.type === 'Proposals and hiring' && shownPosting?.kind === 'job';
  const [related, postingOwner, proposals] = await Promise.all([
    section(notes, 'Related tickets', () => ticketsReferencing([contractId, postingId], row.ticket_id)),
    // Reporting a job or gig reports whoever posted it: staff need their standing.
    isReport && shownPosting?.owner.accountId && !(reportedMember && !reportedPosting)
      ? section(notes, 'Reported member', () => accountSummary(shownPosting.owner.accountId))
      : Promise.resolve(null),
    wantsProposals
      ? section(notes, 'Proposals', () =>
          jobProposals(shownPosting.id, actorIds, proposalText, {
            requesterOwnsJob: actorIds.includes(String(shownPosting.owner.accountId)),
          })
        )
      : Promise.resolve(null),
  ]);
  if (contractId && !contract && !typedPosting) notes.push('The contract named in this ticket was not found.');
  if (contract && !contract.requesterRole) notes.push('The requester is not a party to this contract.');
  if (shownPosting && isReport && actorIds.includes(String(shownPosting.owner.accountId))) {
    notes.push('The requester reported a job or gig they posted.');
  }
  if (proposals && proposalText) {
    if (!proposals.named) notes.push(`No proposal matches "${proposalText.slice(0, 60)}".`);
    else if (!proposals.named.onThisJob) notes.push('The proposal named in this ticket is on a different job.');
  }
  return {
    contract,
    posting: shownPosting,
    reportedMember: (reportedPosting ? null : reportedMember) || postingOwner || null,
    proposalId: proposalText || null,
    proposals: proposals || null,
    // False for types that name no contract (listings, proposals, reports).
    asksContract: typeAsksAny(row.type, ['contract_or_order']),
    desiredOutcome: answerOf(form, 'desired_outcome', 'request').value || null,
    activity,
    relatedTickets: related || [],
  };
}

/* ------------------------------------------------------------------ */
/* Forum                                                               */
/* ------------------------------------------------------------------ */

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A group as a case shows it; `requesterAccountId` adds the requester's own membership. */
async function forumGroupSummary(groupId, requesterAccountId = null) {
  const { getModeratorForumGroupDetail } = require('./ForumModeratorRepositories');
  const detail = await getModeratorForumGroupDetail(String(groupId));
  if (!detail) return null;
  const roster = Array.isArray(detail.members) ? detail.members : [];
  const mine = requesterAccountId
    ? roster.find((member) => member.accountId && String(member.accountId) === String(requesterAccountId))
    : null;
  return {
    id: detail.id,
    name: detail.name,
    status: detail.status,
    owner: detail.owner ? detail.owner.name || null : null,
    ownerAccountId: detail.owner?.accountId || null,
    ownerHandle: detail.owner?.handle || null,
    // Banned members stay on the roster; they are counted apart.
    memberCount: roster.filter((member) => !member.isBanned).length,
    bannedMemberCount: num(detail.bannedMemberCount),
    discussionCount: num(detail.discussionCount),
    removedDiscussionCount: num(detail.removedDiscussionCount),
    archivedBy: detail.archivedBy || null,
    archiveReason: detail.archiveReason || null,
    createdAt: detail.createdAt || null,
    deletedAt: detail.deletedAt || null,
    requesterMembership: requesterAccountId
      ? mine
        ? { role: mine.role || 'Member', banned: Boolean(mine.isBanned), bannedAt: mine.bannedAt || null, joinedAt: mine.joinedAt || null }
        : { role: null, banned: false, bannedAt: null, joinedAt: null }
      : null,
  };
}

/** The group a "Forum groups" answer names: a pasted group link (its id) or the group's name. */
async function forumGroupFromText(text, requesterAccountId) {
  const value = String(text || '').trim();
  if (!value) return null;
  const linkedId = objectIdIn(value);
  if (linkedId) {
    const byId = await forumGroupSummary(linkedId, requesterAccountId);
    if (byId) return byId;
  }
  const { getMongoClient } = require('../lib/MongoDb');
  const client = getMongoClient();
  if (!client) return null;
  // Same database the forum moderator repository reads.
  const db = client.db('ensemble');
  const group = await db
    .collection('forum_groups')
    .findOne({ group_name: { $regex: `^${escapeRegex(value.slice(0, 100))}$`, $options: 'i' } });
  return group ? forumGroupSummary(String(group._id), requesterAccountId) : null;
}

async function forumPost(postId) {
  const { getModeratorForumDiscussionDetail } = require('./ForumModeratorRepositories');
  const post = await getModeratorForumDiscussionDetail(postId);
  if (!post) return null;
  const reports = await reportsList('r.target_id = $1', [String(postId)], 10);
  return {
    id: post.id,
    title: post.title,
    status: post.status,
    isLocked: Boolean(post.isLocked),
    isSticky: Boolean(post.isSticky),
    groupId: post.groupId || null,
    groupName: post.groupName || null,
    author: post.author ? post.author.name || post.author.handle || null : null,
    authorAccountId: post.author?.accountId || null,
    authorHandle: post.author?.handle || null,
    // The body as written (kept when the post is removed), so staff can read what is at issue.
    excerpt: post.excerpt || null,
    imageCount: num(post.imageCount),
    commentCount: num(post.commentCount ?? (post.comments || []).length),
    removedComments: (post.comments || []).filter((c) => c.isDeleted).length,
    createdAt: post.createdAt || null,
    removedAt: post.removedAt || null,
    removedBy: post.removedBy || null,
    removalReason: post.removalReason || null,
    reports,
  };
}

async function forumContext(row, form, notes) {
  const accountId = row.account_id;
  const isReport = row.type === 'Report a post or member';
  const postText = answerOf(form, 'post_link', 'link_or_username').value;
  const linkedId = objectIdIn(postText);
  const groupText = answerOf(form, 'group_name').value;
  const memberText = isReport && !linkedId ? postText : null;

  // A link names a discussion, or (on a report) a group: try the post first, then the group.
  const linkedPost = linkedId ? await section(notes, 'Forum post', () => forumPost(linkedId)) : null;
  const linkedGroup = linkedId && !linkedPost && isReport
    ? await section(notes, 'Forum group', () => forumGroupSummary(linkedId))
    : null;
  const post = linkedPost;
  const [namedGroup, member, restrictions] = await Promise.all([
    groupText ? section(notes, 'Forum group', () => forumGroupFromText(groupText, accountId)) : Promise.resolve(null),
    memberText ? section(notes, 'Reported member', () => accountFromText(memberText)) : Promise.resolve(null),
    section(notes, 'Forum restrictions', async () => {
      const result = await pool.query(
        `
        SELECT r.restriction_id, r.type, r.starts_at, r.ends_at,
               (r.starts_at <= NOW() AND (r.ends_at IS NULL OR r.ends_at > NOW())) AS is_active
        FROM restrictions r
        WHERE r.account_id = $1 AND (LOWER(COALESCE(r.module, '')) = 'forum' OR LOWER(r.type) LIKE '%timeout%')
        ORDER BY r.created_at DESC
        LIMIT 10
        `,
        [accountId]
      );
      return result.rows.map((r) => ({
        id: r.restriction_id,
        type: r.type,
        active: Boolean(r.is_active),
        startsAt: r.starts_at,
        endsAt: r.ends_at || null,
      }));
    }),
  ]);
  const group = namedGroup || linkedGroup || null;
  const forumDown = notes.some((note) => /^Forum (post|group) could not/.test(note));
  if (postText && !linkedId && !memberText) notes.push('The post link in this ticket does not contain a post id.');
  if (linkedId && !post && !linkedGroup && !forumDown) {
    notes.push(isReport ? 'No forum post or group matches the link in this ticket.' : 'No forum post matches the link in this ticket.');
  }
  if (groupText && !namedGroup && !forumDown) notes.push(`No forum group matches "${String(groupText).slice(0, 60)}".`);
  if (memberText && !member) notes.push(`No member matches "${String(memberText).slice(0, 60)}".`);
  // Reporting a post or a group reports the person behind it: show their standing.
  const ownerId = isReport && !member ? post?.authorAccountId || linkedGroup?.ownerAccountId || null : null;
  const owner = ownerId ? await section(notes, 'Reported member', () => accountSummary(ownerId)) : null;
  if (ownerId && String(ownerId) === String(accountId)) {
    notes.push('The requester reported their own post or group.');
  }
  return { post, group, reportedMember: member || owner || null, restrictions };
}

/* ------------------------------------------------------------------ */
/* Billing, account, editor, safety                                   */
/* ------------------------------------------------------------------ */

async function walletAndPlan(accountId) {
  const [wallet, plan] = await Promise.all([
    pool.query(
      `
      SELECT w.balance_credits, w.frozen_balance_credits, w.status
      FROM wallets w
      JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
      WHERE aw.account_id = $1 AND w.type = 'account wallets'
      ORDER BY w.created_at DESC
      LIMIT 1
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT pl.name, s.status, s.created_at, s.trial_ends_at, (s.xendit_plan_id IS NOT NULL) AS recurring
      FROM subscriptions s
      JOIN users u ON u.user_id = s.user_id
      LEFT JOIN plans pl ON pl.plan_id = s.plan_id
      WHERE u.account_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1
      `,
      [accountId]
    ),
  ]);
  const w = wallet.rows[0];
  const p = plan.rows[0];
  return {
    wallet: w
      ? { balanceCredits: num(w.balance_credits), frozenCredits: num(w.frozen_balance_credits), status: w.status || null }
      : null,
    subscription: p
      ? {
          plan: p.name || 'Free',
          status: p.status || null,
          since: p.created_at || null,
          trialEndsAt: p.trial_ends_at || null,
          recurring: Boolean(p.recurring),
        }
      : null,
  };
}

/** The payment, credit transaction or cashout a member quoted, if it exists. */
async function referencedTransaction(reference, accountId) {
  const value = String(reference || '').trim();
  if (!value) return null;
  const id = uuidIn(value) || '';
  const result = await pool.query(
    `
    SELECT * FROM (
      -- Cast throughout: credit transaction status and type are native enums.
      SELECT 'payment'::text AS kind, p.id::text AS id, p.reference_id::text AS reference, p.status::text AS status,
             p.payment_type::text AS type, p.amount::numeric AS amount, p.credits::numeric AS credits,
             p.created_at::timestamptz AS created_at, (u.account_id = $3) AS own,
             NULL::text AS failure, NULL::timestamptz AS settled_at
      FROM payments p JOIN users u ON u.user_id = p.user_id
      WHERE p.reference_id::text = $1 OR p.id::text = $1
      UNION ALL
      SELECT 'credit', ct.credit_transaction_id::text, ct.reference_id::text, ct.status::text, ct.type::text,
             NULL::numeric, ct.amount_credits::numeric, ct.created_at::timestamptz,
             EXISTS (
               SELECT 1 FROM account_wallets aw
               WHERE aw.account_id = $3 AND aw.wallet_id IN (ct.source_wallet_id, ct.destination_wallet_id)
             ),
             NULL::text, NULL::timestamptz
      FROM credit_transactions ct
      WHERE ct.credit_transaction_id::text = $2
      UNION ALL
      -- Members quote a payout by its id, its reference, or the provider's disbursement id.
      SELECT 'cashout', c.cashout_id::text, c.reference_id::text, c.status::text, c.xendit_channel_code::text,
             (c.net_amount_php_cents / 100.0)::numeric, c.amount_credits::numeric, c.created_at::timestamptz,
             (u.account_id = $3), c.failure_code::text, c.refunded_at::timestamptz
      FROM cashouts c JOIN users u ON u.user_id = c.user_id
      WHERE c.cashout_id::text = $2 OR c.reference_id = $1 OR c.xendit_disbursement_id = $1
      UNION ALL
      SELECT 'invoice', si.subscription_invoice_id::text, si.xendit_cycle_id::text, si.status::text, 'Subscription'::text,
             (si.amount_php_cents / 100.0)::numeric, NULL::numeric, si.created_at::timestamptz,
             (u.account_id = $3), NULL::text, COALESCE(si.paid_at, si.failed_at)::timestamptz
      FROM subscription_invoices si
      JOIN subscriptions s ON s.subscription_id = si.subscription_id
      JOIN users u ON u.user_id = s.user_id
      WHERE si.subscription_invoice_id::text = $2 OR si.xendit_cycle_id = $1
    ) found
    LIMIT 1
    `,
    [value.slice(0, 120), id, accountId]
  );
  const row = result.rows[0];
  if (!row) return { found: false, query: value.slice(0, 80) };
  return {
    found: true,
    query: value.slice(0, 80),
    kind: row.kind,
    id: row.id,
    reference: row.reference || null,
    status: row.status,
    type: row.type || null,
    amount: row.amount === null ? null : Number(row.amount),
    credits: row.credits === null ? null : Number(row.credits),
    // Cashouts: the provider's failure code, and when the credits went back (refund) or it settled.
    failureCode: row.failure || null,
    settledAt: row.settled_at || null,
    belongsToRequester: Boolean(row.own),
    createdAt: row.created_at,
  };
}

async function billingContext(row, form, notes, role) {
  if (!canViewTicketPayments(role, row.type)) return { restricted: true };
  const reference = answerOf(form, 'transaction_id', 'reference_id', 'payout_reference').value;
  const [money, transaction] = await Promise.all([
    section(notes, 'Wallet and plan', () => walletAndPlan(row.account_id)),
    reference ? section(notes, 'Quoted transaction', () => referencedTransaction(reference, row.account_id)) : Promise.resolve(null),
  ]);
  if (transaction && transaction.found && !transaction.belongsToRequester) {
    notes.push('The quoted transaction does not belong to the requester.');
  }
  return {
    restricted: false,
    wallet: money?.wallet || null,
    subscription: money?.subscription || null,
    referencedTransaction: transaction,
  };
}

async function accountTypeContext(row, form, notes) {
  const accountId = row.account_id;
  const teamAnswer = answerOf(form, 'team_name');
  const affectedText = answerOf(form, 'affected_username').value;
  const [verification, security, team] = await Promise.all([
    section(notes, 'Identity verification', () => identityVerification(accountId)),
    ['Account compromised', 'Sign-in and password', 'Profile and settings'].includes(row.type)
      ? section(notes, 'Recent account changes', async () => {
          const result = await pool.query(
            `
            SELECT aa.account_activity_id, aa.action, aa.event_code, aa.created_at
            FROM account_activity aa
            WHERE aa.account_id = $1
              AND (
                aa.event_code ~ '(LOGIN|SIGN_IN|PASSWORD|EMAIL|2FA|TWO_FACTOR|SESSION|PROFILE|PAYOUT|CASHOUT)'
              )
            ORDER BY aa.created_at DESC
            LIMIT 15
            `,
            [accountId]
          );
          return result.rows.map((a) => ({ id: a.account_activity_id, action: a.action, eventCode: a.event_code, createdAt: a.created_at }));
        })
      : Promise.resolve(null),
    teamAnswer.id ? section(notes, 'Team', () => ticketTeam(teamAnswer.id, accountId, affectedText)) : Promise.resolve(null),
  ]);
  if (team && affectedText && !team.affectedMember) {
    notes.push(`No member matches "${affectedText.slice(0, 60)}".`);
  } else if (team?.affectedMember && !team.affectedMember.membership) {
    notes.push(`@${team.affectedMember.handle || affectedText} has never been on this team.`);
  }
  if (team && !team.requesterMembership) notes.push('The requester has never been on this team.');
  return { verification, recentChanges: security, team };
}

/** Identity check status only. Session links, documents and business data stay on the verification desk. */
async function identityVerification(accountId) {
  const result = await pool.query(
    `
    SELECT v.is_verified, v.verified_at, vs.kyc_status, vs.verification_status, vs.expires_at,
           vs.created_at AS session_created_at, vs.updated_at AS session_updated_at
    FROM verifications v
    LEFT JOIN verification_sessions vs ON vs.verification_session_id = v.verification_session_id
    WHERE v.account_id = $1
    LIMIT 1
    `,
    [accountId]
  );
  const v = result.rows[0];
  return v
    ? {
        verified: Boolean(v.is_verified),
        verifiedAt: v.verified_at || null,
        kycStatus: v.kyc_status || null,
        status: v.verification_status || null,
        expiresAt: v.expires_at || null,
        submittedAt: v.session_created_at || null,
        updatedAt: v.session_updated_at || null,
      }
    : { verified: false, status: 'not_started' };
}

/**
 * Whether the requester may list on the marketplace now: a verified identity, and room under
 * their plan's listing limit (`AssetRepositories.readAssetPostingEligibility`, the same check
 * listing creation runs).
 */
async function sellingEligibility(accountId) {
  const { getAssetPostingEligibilityRepository } = require('./AssetRepositories');
  const [eligibility, identity] = await Promise.all([
    getAssetPostingEligibilityRepository(accountId),
    identityVerification(accountId),
  ]);
  return { ...eligibility, identity };
}

/**
 * The team a Teams ticket names: who leads it, how many are on it, and the membership (role,
 * status, dates) of the requester and of the member the ticket is about.
 */
async function ticketTeam(teamId, requesterAccountId, affectedText) {
  const affectedId = affectedText ? await accountIdForHandle(handleIn(affectedText)) : null;
  const result = await pool.query(
    `
    SELECT t.team_id, t.account_id, t.visibility, t.team_type, t.deleted_at,
           a.display_name AS name, a.handle, a.status, a.created_at,
           (SELECT COUNT(*)::int FROM team_members tm
             WHERE tm.team_id = t.team_id AND tm.status = 'Active' AND tm.deleted_at IS NULL) AS active_members,
           (SELECT COUNT(*)::int FROM team_members tm
             WHERE tm.team_id = t.team_id AND tm.status <> 'Active' AND tm.deleted_at IS NULL) AS other_members,
           owner_row.owner_account_id, owner_row.owner_name, owner_row.owner_handle
    FROM teams t
    JOIN accounts a ON a.account_id = t.account_id
    LEFT JOIN LATERAL (
      SELECT ou.account_id AS owner_account_id, ${MEMBER_NAME_SQL('oa', 'ou')} AS owner_name, oa.handle AS owner_handle
      FROM team_members tm
      JOIN users ou ON ou.user_id = tm.user_id
      JOIN accounts oa ON oa.account_id = ou.account_id
      WHERE tm.team_id = t.team_id AND tm.role = 'Owner' AND tm.deleted_at IS NULL
      ORDER BY tm.joined_at ASC
      LIMIT 1
    ) owner_row ON TRUE
    WHERE t.team_id::text = $1 OR t.account_id::text = $1
    LIMIT 1
    `,
    [teamId]
  );
  const t = result.rows[0];
  if (!t) return null;
  // Removed members keep their row (deleted_at), so "removed" is told apart from "never joined".
  const memberships = await pool.query(
    `
    SELECT u.account_id, tm.role, tm.status, tm.joined_at, tm.invited_at, tm.updated_at, tm.deleted_at
    FROM team_members tm
    JOIN users u ON u.user_id = tm.user_id
    WHERE tm.team_id = $1 AND u.account_id = ANY($2::uuid[])
    ORDER BY tm.deleted_at NULLS FIRST, tm.updated_at DESC
    `,
    [t.team_id, [requesterAccountId, affectedId].filter(Boolean)]
  );
  const membershipOf = (accountId) => {
    const m = accountId ? memberships.rows.find((row) => String(row.account_id) === String(accountId)) : null;
    return m
      ? {
          role: m.role,
          status: m.deleted_at ? 'Removed' : m.status,
          joinedAt: m.joined_at || null,
          invitedAt: m.invited_at || null,
          changedAt: m.deleted_at || m.updated_at || null,
        }
      : null;
  };
  const affectedAccount = affectedId ? await accountSummary(affectedId) : null;
  return {
    id: t.team_id,
    accountId: t.account_id,
    name: t.name || t.handle || 'Team',
    handle: t.handle || null,
    status: t.deleted_at ? 'Deleted' : t.status,
    visibility: t.visibility || null,
    // Contract workspaces are job scaffolding, not teams members run.
    contractWorkspace: String(t.team_type || '') === 'contractual',
    createdAt: t.created_at,
    activeMembers: num(t.active_members),
    otherMembers: num(t.other_members),
    owner: t.owner_account_id ? { accountId: t.owner_account_id, name: t.owner_name, handle: t.owner_handle || null } : null,
    requesterMembership: membershipOf(requesterAccountId),
    affectedMember: affectedAccount
      ? { ...affectedAccount, membership: membershipOf(affectedId) }
      : null,
  };
}

async function editorContext(row, form, notes) {
  const projectAnswer = answerOf(form, 'project');
  const projectId = projectAnswer.id || uuidIn(projectAnswer.value);
  const collaboratorText = answerOf(form, 'collaborator').value;
  const collaboratorHandle = handleIn(collaboratorText);
  const project = projectId
    ? await section(notes, 'Project', async () => {
        const [result, roster] = await Promise.all([
          pool.query(
            `
            SELECT p.project_id, p.name, p.created_at, p.updated_at, p.deleted_at, p.trashed_at, p.frozen_at,
                   (SELECT COUNT(*)::int FROM project_members pm WHERE pm.project_id = p.project_id AND pm.deleted_at IS NULL) AS members,
                   EXISTS (
                     SELECT 1 FROM project_members pm JOIN users u ON u.user_id = pm.user_id
                     WHERE pm.project_id = p.project_id AND pm.deleted_at IS NULL AND u.account_id = $2
                   ) AS requester_is_member
            FROM projects p
            WHERE p.project_id = $1
            `,
            [projectId, row.account_id]
          ),
          // Owners first; removed members stay listed so lost access can be traced.
          pool.query(
            `
            SELECT u.account_id, ${MEMBER_NAME_SQL('a', 'u')} AS name, a.handle, pm.role, pm.joined_at, pm.deleted_at
            FROM project_members pm
            JOIN users u ON u.user_id = pm.user_id
            LEFT JOIN accounts a ON a.account_id = u.account_id
            WHERE pm.project_id = $1
            ORDER BY pm.deleted_at NULLS FIRST,
                     CASE pm.role WHEN 'Owner' THEN 0 WHEN 'Manager' THEN 1 WHEN 'Editor' THEN 2 ELSE 3 END,
                     pm.joined_at ASC
            LIMIT 20
            `,
            [projectId]
          ),
        ]);
        const p = result.rows[0];
        if (!p) return null;
        const members = roster.rows.map((m) => ({
          accountId: m.account_id,
          name: m.name,
          handle: m.handle || null,
          role: m.role,
          joinedAt: m.joined_at || null,
          removedAt: m.deleted_at || null,
          isRequester: String(m.account_id) === String(row.account_id),
        }));
        const collaborator = collaboratorHandle
          ? members.find((m) => m.handle && m.handle.toLowerCase() === collaboratorHandle.toLowerCase()) || null
          : null;
        return {
          id: p.project_id,
          name: p.name,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          deleted: Boolean(p.deleted_at),
          trashedAt: p.trashed_at || null,
          frozenAt: p.frozen_at || null,
          members: num(p.members),
          requesterIsMember: Boolean(p.requester_is_member),
          roster: members,
          collaborator: collaboratorText
            ? { query: collaboratorText.slice(0, 80), onProject: Boolean(collaborator && !collaborator.removedAt), member: collaborator }
            : null,
        };
      })
    : null;
  if (project && !project.requesterIsMember) notes.push('The requester is not a member of this project.');
  if (project?.deleted) notes.push('This project is deleted.');
  else if (project?.trashedAt) notes.push('This project is in its owner’s trash.');
  if (project?.frozenAt) notes.push('Staff froze this project.');
  if (project?.collaborator && !project.collaborator.member) {
    notes.push(`"${project.collaborator.query.slice(0, 60)}" has never been on this project.`);
  }
  const asksProject = typeAsksAny(row.type, ['project']);
  // Upload tickets name a file, not a project: show the uploads the member started lately.
  const recentUploads = row.type === 'Uploads and storage'
    ? await section(notes, 'Recent uploads', () => recentUploadsOf(row.account_id, answerOf(form, 'file_name').value))
    : null;
  return { project, asksProject, recentUploads };
}

/**
 * The member's latest uploads (`upload_intents`): what they tried to upload and whether it
 * finished. A pending upload past its expiry never reached storage.
 */
async function recentUploadsOf(accountId, fileName) {
  const result = await pool.query(
    `
    SELECT upload_intent_id, original_name, expected_mime_type, max_size_bytes, status, expires_at,
           consumed_at, created_at, (file_id IS NOT NULL) AS stored
    FROM upload_intents
    WHERE account_id = $1
    ORDER BY created_at DESC
    LIMIT 10
    `,
    [accountId]
  );
  const wanted = String(fileName || '').trim().toLowerCase();
  return result.rows.map((u) => {
    const pending = String(u.status || '').toLowerCase() === 'pending';
    return {
      id: u.upload_intent_id,
      name: u.original_name,
      mimeType: u.expected_mime_type || null,
      maxSizeBytes: u.max_size_bytes == null ? null : num(u.max_size_bytes),
      status: pending && u.expires_at && new Date(u.expires_at) <= new Date() ? 'expired' : u.status,
      stored: Boolean(u.stored),
      matchesTicket: Boolean(wanted && String(u.original_name || '').trim().toLowerCase() === wanted),
      createdAt: u.created_at,
      finishedAt: u.consumed_at || null,
    };
  });
}

async function safetyContext(row, form, notes) {
  if (row.type === 'Report a user') {
    const reportedText = answerOf(form, 'reported_username').value;
    const member = reportedText ? await section(notes, 'Reported member', () => accountFromText(reportedText)) : null;
    if (reportedText && !member) notes.push(`No member matches "${reportedText.slice(0, 60)}".`);
    const reports = member
      ? await section(notes, 'Reports against the member', () => reportsList('r.for_account_id = $1', [member.accountId], 10))
      : null;
    return { reportedMember: member, reportsAgainst: reports, infringingListings: null };
  }
  // A claim can point anywhere on Ensemble: marketplace listings and assets, jobs and gigs
  // (uuid ids), and forum posts (24-character ids).
  const links = String(answerOf(form, 'infringing_links').value || '');
  const ids = [...new Set((links.match(new RegExp(UUID_RE.source, 'gi')) || []).map((id) => id.toLowerCase()))].slice(0, 5);
  const forumIds = [...new Set((links.match(new RegExp(OBJECT_ID_RE.source, 'gi')) || []).map((id) => id.toLowerCase()))].slice(0, 3);
  const [linked, posts] = await Promise.all([
    section(notes, 'Infringing listings', async () => {
      const listings = [];
      const postings = [];
      for (const id of ids) {
        const listingId = await resolveListingId({ id, value: '' });
        const summary = listingId ? await listingSummary(listingId) : null;
        if (summary) {
          if (!listings.some((l) => l.id === summary.id)) listings.push(summary);
          continue;
        }
        const posting = await postingSummary(id);
        if (posting) postings.push(posting);
      }
      return { listings, postings };
    }),
    forumIds.length
      ? section(notes, 'Infringing forum posts', async () => {
          const found = [];
          for (const id of forumIds) {
            const post = await forumPost(id);
            if (post) found.push(post);
          }
          return found;
        })
      : Promise.resolve([]),
  ]);
  const foundCount = (linked?.listings.length || 0) + (linked?.postings.length || 0) + (posts?.length || 0);
  if ((ids.length || forumIds.length) && linked && !foundCount) {
    notes.push('None of the links in this claim match a listing, job, gig or forum post. Check them by hand.');
  }
  return {
    reportedMember: null,
    reportsAgainst: null,
    infringingListings: linked ? linked.listings : null,
    infringingPostings: linked ? linked.postings : null,
    infringingPosts: posts || null,
  };
}

async function openTicketsOf(accountId, ticketId) {
  const result = await pool.query(
    `
    SELECT ticket_id, ticket_number, type, status, created_at
    FROM tickets
    WHERE account_id = $1 AND deleted_at IS NULL AND ticket_id <> $2 AND status NOT IN ('Closed', 'Resolved')
    ORDER BY created_at DESC
    LIMIT 6
    `,
    [accountId, ticketId]
  );
  return result.rows.map((t) => ({ id: t.ticket_id, number: t.ticket_number, type: t.type, status: t.status, createdAt: t.created_at }));
}

/**
 * @param row the `tickets` row (account_id, type, form_answers, ticket_id, appeal_decision…)
 * @param options.role the viewing staff member's role, for money visibility
 */
async function getTicketCaseContext(row, { role = null } = {}) {
  const notes = [];
  const kind = caseKindForType(row.type);
  const form = parseFormAnswers(row.form_answers);
  const requesterId = row.account_id || null;

  const [requester, otherOpenTickets] = await Promise.all([
    requesterId ? section(notes, 'Requester standing', () => accountSummary(requesterId)) : Promise.resolve(null),
    requesterId ? section(notes, 'Open tickets', () => openTicketsOf(requesterId, row.ticket_id)) : Promise.resolve([]),
  ]);

  const context = { kind, requester, otherOpenTickets: otherOpenTickets || [], notes };
  if (!requesterId) {
    notes.push('This ticket has no member account attached.');
    return context;
  }
  const loaders = {
    appeal: () => appealContext(row, form, notes),
    marketplace: () => marketplaceContext(row, form, notes),
    jobs: () => jobsContext(row, form, notes),
    forum: () => forumContext(row, form, notes),
    billing: () => billingContext(row, form, notes, role),
    account: () => accountTypeContext(row, form, notes),
    editor: () => editorContext(row, form, notes),
    safety: () => safetyContext(row, form, notes),
  };
  // Kind-specific people (reported member, seller, affected team member) load with their kind.
  const namedRows = form.filter((answer) => NAMED_PERSON_KEYS.has(answer.key) && String(answer.value || '').trim());
  const otherIds = KINDS_WITH_OWN_RELATED.has(kind) ? [] : form.map((answer) => answer.id).filter(Boolean);
  const [details, namedPeople, relatedTickets] = await Promise.all([
    loaders[kind] ? section(notes, 'Case details', loaders[kind]) : Promise.resolve(undefined),
    namedRows.length
      ? section(notes, 'People named in the ticket', () =>
          Promise.all(
            namedRows.map(async (answer) => ({
              key: answer.key,
              label: answer.label || answer.key,
              query: String(answer.value).slice(0, 80),
              account: await accountFromText(answer.value),
            }))
          )
        )
      : Promise.resolve(null),
    otherIds.length
      ? section(notes, 'Related tickets', () => ticketsReferencing(otherIds, row.ticket_id))
      : Promise.resolve(null),
  ]);
  if (loaders[kind]) context[kind] = details;
  if (namedPeople) context.namedPeople = namedPeople;
  if (relatedTickets) context.relatedTickets = relatedTickets;
  return context;
}

/** Standing for both sides of a dispute, for the dispute desk. */
async function getDisputePartyStanding(byAccountId, forAccountId) {
  const [initiator, respondent] = await Promise.all([
    accountSummary(byAccountId).catch(() => null),
    accountSummary(forAccountId).catch(() => null),
  ]);
  return { initiator, respondent };
}

/* ------------------------------------------------------------------ */
/* Report cases                                                        */
/* ------------------------------------------------------------------ */

/**
 * What happened on and to the account lately. Report handling rows (filed, claimed, status
 * changes) are left out: the case lists the other reports itself.
 */
async function recentAccountActivity(accountId, limit = 10) {
  const { describeEvent } = require('../lib/ActivityCatalog');
  const result = await pool.query(
    `
    SELECT aa.account_activity_id, aa.action, aa.event_code, aa.created_at, aa.actor_account_id,
           s.staff_id, s.role AS staff_role, ${STAFF_NAME_SQL('s', 'sa')} AS staff_name
    FROM account_activity aa
    LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
    LEFT JOIN accounts sa ON sa.account_id = s.account_id
    WHERE aa.account_id = $1
      AND COALESCE(aa.event_code, '') NOT LIKE '%REPORT%'
    ORDER BY aa.created_at DESC
    LIMIT $2
    `,
    [accountId, Number(limit)]
  );
  return result.rows.map((row) => {
    const event = describeEvent(row.event_code);
    return {
      id: row.account_activity_id,
      action: row.action,
      eventCode: event.eventCode,
      label: event.eventLabel,
      category: event.categoryLabel,
      severity: event.severity,
      actor: row.staff_id
        ? { kind: 'staff', name: row.staff_name, role: row.staff_role || 'Staff' }
        : row.actor_account_id && String(row.actor_account_id) === String(accountId)
          ? { kind: 'self', name: null, role: null }
          : null,
      createdAt: row.created_at,
    };
  });
}

async function forumFootprintForAccount(accountId) {
  const user = await pool.query(`SELECT user_id FROM users WHERE account_id = $1 LIMIT 1`, [accountId]);
  const userId = user.rows[0]?.user_id;
  if (!userId) return null;
  const { getForumMemberFootprint } = require('./ForumModeratorRepositories');
  return getForumMemberFootprint(userId);
}

/**
 * The reported member, as staff need them to decide a report: live standing, the latest
 * warnings and restrictions, recent account activity, the other reports against them and,
 * for forum reports, what they posted lately. Each section loads on its own; a failure
 * leaves it empty and adds a note instead of failing the case.
 */
async function getReportedAccountContext(accountId, { excludeReportId = null, includeForum = false } = {}) {
  if (!accountId || !UUID_RE.test(String(accountId))) return null;
  const notes = [];
  const exclude = excludeReportId && UUID_RE.test(String(excludeReportId)) ? String(excludeReportId) : null;
  const [standing, record, activity, otherReports, forum] = await Promise.all([
    section(notes, 'Account standing', () => accountSummary(accountId)),
    section(notes, 'Warnings and restrictions', () => punishmentRecord(accountId)),
    section(notes, 'Recent activity', () => recentAccountActivity(accountId)),
    section(notes, 'Other reports', () =>
      reportsList('r.for_account_id = $1 AND ($2::uuid IS NULL OR r.report_id <> $2::uuid)', [accountId, exclude], 8)
    ),
    includeForum
      ? section(notes, 'Forum activity', () => forumFootprintForAccount(accountId))
      : Promise.resolve(null),
  ]);
  return {
    standing,
    warnings: (record?.warnings || []).slice(0, 6),
    restrictions: (record?.restrictions || []).slice(0, 6),
    recentActivity: activity || [],
    otherReports: otherReports || [],
    forum,
    notes,
  };
}

module.exports = {
  accountSummary,
  caseKindForType,
  getTicketCaseContext,
  getDisputePartyStanding,
  getReportedAccountContext,
  gigOrdersForContracts,
  ticketsReferencing,
};
