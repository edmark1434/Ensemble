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
    merit: access.merit ?? null,
    warningPoints: num(access.warningPoints),
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
      activeWarnings: num(row.active_warnings),
      totalWarnings: num(row.total_warnings),
      totalDisputes: num(row.total_disputes),
      openDisputesAgainst: num(row.open_disputes_against),
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
async function ticketsReferencing(entityId, excludeTicketId) {
  if (!entityId) return [];
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
        WHERE answer->>'id' = $1
      )
    ORDER BY t.created_at DESC
    LIMIT 10
    `,
    [String(entityId), excludeTicketId || null]
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

/* ------------------------------------------------------------------ */
/* Appeals                                                             */
/* ------------------------------------------------------------------ */

async function punishmentRecord(accountId) {
  const [warnings, restrictions, history] = await Promise.all([
    pool.query(
      `
      SELECT v.violation_id, v.violation_number, v.type, v.reason, v.points, v.status, v.created_at,
             v.expires_at, (${ACTIVE_WARNING_SQL}) AS is_active, ${STAFF_NAME_SQL('s', 'sa')} AS issued_by
      FROM violations v
      LEFT JOIN staff s ON s.staff_id = v.staff_id
      LEFT JOIN accounts sa ON sa.account_id = s.account_id
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

/** Area appeals also show the actions taken in that area. */
async function areaActions(area, accountId) {
  if (area === 'marketplace') {
    const result = await pool.query(
      `
      SELECT l.listing_id, l.listing_number, l.title, l.status, l.rejection_reason, l.moderation_note,
             l.reviewed_at, l.updated_at
      FROM marketplace_listings l
      WHERE l.submitted_by_account_id = $1 AND l.status IN ('rejected', 'delisted', 'pending')
      ORDER BY COALESCE(l.reviewed_at, l.updated_at) DESC
      LIMIT 10
      `,
      [accountId]
    );
    return result.rows.map((row) => ({
      id: row.listing_id,
      label: row.title,
      number: row.listing_number || null,
      status: row.status,
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
        SELECT job_id::text AS id, title, 'job' AS kind FROM jobs WHERE client_account_id = $1
        UNION ALL
        SELECT gig_id::text, title, 'gig' FROM gigs WHERE freelancer_account_id = $1
      ) posting ON posting.id = aa.reference_id
      WHERE aa.event_code IN ('JOBS_POSTING_STATUS_CHANGED', 'JOBS_POSTING_ARCHIVED')
      ORDER BY aa.created_at DESC
      LIMIT 10
      `,
      [accountId]
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
  const { describeAppealTarget } = require('../services/PenaltyAppealServices');
  const [record, appeals, caseRef, actions, reports, target] = await Promise.all([
    section(notes, 'Punishment record', () => punishmentRecord(accountId)),
    section(notes, 'Appeal history', () => appealHistory(accountId, row.ticket_id)),
    section(notes, 'Referenced case', () => referencedCase(caseAnswer.value, accountId)),
    area ? section(notes, 'Area actions', () => areaActions(area, accountId)) : Promise.resolve(null),
    section(notes, 'Reports against the member', () => reportsList('r.for_account_id = $1', [accountId], 10)),
    // `row` is `tickets.*`, so the target columns are there once the per-penalty migration ran.
    row.appeal_target_type
      ? section(notes, 'Appealed penalty', () => describeAppealTarget(row))
      : Promise.resolve(null),
  ]);
  return {
    area: area || 'account',
    // Only "Appeal an account penalty" has the accept / deny flow; area appeals are resolved by acting on the item.
    decidable: row.type === APPEAL_TICKET_TYPE,
    decision: row.appeal_decision || null,
    decidedAt: row.appeal_decided_at || null,
    // The one penalty this appeal is about (null: an account-wide appeal from before the change).
    target,
    reasonGiven: answerOf(form, 'why_reverse', 'explanation').value || null,
    evidence: answerOf(form, 'evidence').value || null,
    referencedCase: caseRef,
    record,
    appeals,
    areaActions: actions,
    reportsAgainst: reports,
  };
}

/* ------------------------------------------------------------------ */
/* Marketplace                                                         */
/* ------------------------------------------------------------------ */

async function listingSummary(listingId) {
  const { getMarketplaceListingDetail } = require('./MarketplaceModeratorRepositories');
  const listing = await getMarketplaceListingDetail(listingId);
  if (!listing) return null;
  const files = listing.asset?.mediaFiles || listing.asset?.files || [];
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
    moderationNote: listing.moderationNote || null,
    reviewedBy: listing.reviewedBy?.name || null,
    reviewedAt: listing.reviewedAt || null,
    createdAt: listing.createdAt,
    seller: {
      accountId: listing.submittedBy?.accountId || null,
      name: listing.submittedBy?.name || 'Unknown',
      handle: listing.submittedBy?.handle && listing.submittedBy.handle !== '—' ? listing.submittedBy.handle : null,
      status: listing.seller?.status || null,
      merit: listing.seller?.merit ?? null,
      listings: listing.seller?.listings || null,
    },
    asset: listing.asset
      ? {
          id: listing.asset.id,
          name: listing.asset.name,
          status: listing.asset.status,
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

async function sellerListings(accountId) {
  const result = await pool.query(
    `
    SELECT listing_id, listing_number, title, status, price_credits, rejection_reason, created_at
    FROM marketplace_listings
    WHERE submitted_by_account_id = $1
    ORDER BY created_at DESC
    LIMIT 8
    `,
    [accountId]
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
  const listingAnswer = answerOf(form, 'listing', 'listing_or_seller', 'review_link');
  const assetId = orderAnswer.id || uuidIn(orderAnswer.value);

  const listingId = await section(notes, 'Listing', async () => {
    if (assetId) return listingIdForAsset(assetId);
    return resolveListingId(listingAnswer);
  });
  const sellerSide = ['Seller verification', 'Listing review', 'Appeal a marketplace action'].includes(row.type);
  const reportedText = row.type === 'Report a listing or seller' && !listingId ? listingAnswer.value : null;

  const [listing, purchase, buyer, ownListings, reported, related] = await Promise.all([
    listingId ? section(notes, 'Listing', () => listingSummary(listingId)) : Promise.resolve(null),
    assetId ? section(notes, 'Purchase', () => purchaseSummary(accountId, assetId)) : Promise.resolve(null),
    sellerSide ? Promise.resolve(null) : section(notes, 'Buyer history', () => buyerStats(accountId)),
    sellerSide ? section(notes, 'Seller listings', () => sellerListings(accountId)) : Promise.resolve(null),
    reportedText ? section(notes, 'Reported seller', () => accountFromText(reportedText)) : Promise.resolve(null),
    section(notes, 'Related tickets', () => ticketsReferencing(assetId || listingId, row.ticket_id)),
  ]);

  if (purchase && !purchase.licenses.length) {
    notes.push('The requester has no license for the asset named in this ticket.');
  }
  if (listing && sellerSide && listing.seller.accountId && String(listing.seller.accountId) !== String(accountId)) {
    notes.push('The listing in this ticket belongs to another seller.');
  }
  return {
    role: sellerSide ? 'seller' : 'buyer',
    listing,
    purchase,
    buyer,
    sellerListings: ownListings,
    reportedSeller: reported,
    reportedText: reportedText || null,
    relatedTickets: related || [],
  };
}

/* ------------------------------------------------------------------ */
/* Jobs & Gigs                                                         */
/* ------------------------------------------------------------------ */

async function contractSummary(contractId, requesterId) {
  const { getContractWithParties } = require('./ContractRepositories');
  const contract = await getContractWithParties(contractId);
  if (!contract) return null;
  const [extra, milestones, disputes, transactions, parties] = await Promise.all([
    pool.query(`SELECT payment_type, created_at FROM contracts WHERE contract_id = $1`, [contractId]),
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
             (d.by_account_id = $2) AS filed_by_requester
      FROM disputes d
      WHERE d.contract_id = $1 AND d.deleted_at IS NULL
      ORDER BY d.opened_at DESC NULLS LAST
      LIMIT 10
      `,
      [contractId, requesterId]
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
  const requesterRole =
    String(contract.client_account_id) === String(requesterId)
      ? 'client'
      : String(contract.freelancer_account_id) === String(requesterId)
        ? 'freelancer'
        : null;
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
    requesterRole,
    client: parties[0],
    freelancer: parties[1],
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
      filedByRequester: Boolean(d.filed_by_requester),
      openedAt: d.opened_at,
    })),
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
           j.client_account_id AS owner_id, ${MEMBER_NAME_SQL('a', 'u')} AS owner_name, a.handle AS owner_handle
    FROM jobs j
    LEFT JOIN accounts a ON a.account_id = j.client_account_id
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE j.job_id = $1
    UNION ALL
    SELECT g.gig_id, 'gig', g.title::text, g.status::text, g.created_at::timestamptz, g.deleted_at::timestamptz,
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
  const postingAnswer = answerOf(form, 'listing', 'review_link');
  const postingId = postingAnswer.id || uuidIn(postingAnswer.value);
  const reportedAnswer = answerOf(form, 'link_or_username');
  const reportedId = uuidIn(reportedAnswer.value);

  const [contract, posting, reportedPosting, reportedMember, activity, related] = await Promise.all([
    contractId ? section(notes, 'Contract', () => contractSummary(contractId, accountId)) : Promise.resolve(null),
    postingId ? section(notes, 'Posting', () => postingSummary(postingId)) : Promise.resolve(null),
    reportedId ? section(notes, 'Reported posting', () => postingSummary(reportedId)) : Promise.resolve(null),
    reportedAnswer.value ? section(notes, 'Reported member', () => accountFromText(reportedAnswer.value)) : Promise.resolve(null),
    section(notes, 'Jobs activity', () => jobsActivity(accountId)),
    section(notes, 'Related tickets', () => ticketsReferencing(contractId || postingId, row.ticket_id)),
  ]);
  if (contractId && !contract) notes.push('The contract named in this ticket was not found.');
  if (contract && !contract.requesterRole) notes.push('The requester is not a party to this contract.');
  return {
    contract,
    posting: posting || reportedPosting,
    reportedMember: reportedPosting ? null : reportedMember,
    proposalId: answerOf(form, 'proposal_id').value || null,
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

async function forumGroupByName(name) {
  const { getMongoClient } = require('../lib/MongoDb');
  const client = getMongoClient();
  if (!client || !name) return null;
  // Same database the forum moderator repository reads.
  const db = client.db('ensemble');
  const group = await db
    .collection('forum_groups')
    .findOne({ group_name: { $regex: `^${escapeRegex(String(name).trim().slice(0, 100))}$`, $options: 'i' } });
  if (!group) return null;
  const { getModeratorForumGroupDetail } = require('./ForumModeratorRepositories');
  const detail = await getModeratorForumGroupDetail(String(group._id));
  if (!detail) return null;
  return {
    id: detail.id,
    name: detail.name,
    status: detail.status,
    owner: detail.owner ? detail.owner.name || null : null,
    memberCount: Array.isArray(detail.members) ? detail.members.length : 0,
    discussionCount: num(detail.discussionCount),
    removedDiscussionCount: num(detail.removedDiscussionCount),
    createdAt: detail.createdAt || null,
    deletedAt: detail.deletedAt || null,
  };
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
    groupName: post.groupName || null,
    author: post.author ? post.author.name || post.author.handle || null : null,
    commentCount: num(post.commentCount ?? (post.comments || []).length),
    removedComments: (post.comments || []).filter((c) => c.isDeleted).length,
    createdAt: post.createdAt || null,
    removedAt: post.removedAt || null,
    reports,
  };
}

async function forumContext(row, form, notes) {
  const accountId = row.account_id;
  const postText = answerOf(form, 'post_link', 'link_or_username').value;
  const postId = objectIdIn(postText);
  const groupName = answerOf(form, 'group_name').value;
  const memberText = row.type === 'Report a post or member' && !postId ? postText : null;

  const [post, group, member, restrictions] = await Promise.all([
    postId ? section(notes, 'Forum post', () => forumPost(postId)) : Promise.resolve(null),
    groupName ? section(notes, 'Forum group', () => forumGroupByName(groupName)) : Promise.resolve(null),
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
  if (postText && !postId && !memberText) notes.push('The post link in this ticket does not contain a post id.');
  if (groupName && !group) notes.push(`No forum group is named "${String(groupName).slice(0, 60)}".`);
  return { post, group, reportedMember: member, restrictions };
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
             p.created_at::timestamptz AS created_at, (u.account_id = $3) AS own
      FROM payments p JOIN users u ON u.user_id = p.user_id
      WHERE p.reference_id::text = $1 OR p.id::text = $1
      UNION ALL
      SELECT 'credit', ct.credit_transaction_id::text, ct.reference_id::text, ct.status::text, ct.type::text,
             NULL::numeric, ct.amount_credits::numeric, ct.created_at::timestamptz,
             EXISTS (
               SELECT 1 FROM account_wallets aw
               WHERE aw.account_id = $3 AND aw.wallet_id IN (ct.source_wallet_id, ct.destination_wallet_id)
             )
      FROM credit_transactions ct
      WHERE ct.credit_transaction_id::text = $2
      UNION ALL
      SELECT 'cashout', c.cashout_id::text, NULL::text, c.status::text, c.xendit_channel_code::text, NULL::numeric,
             c.amount_credits::numeric, c.created_at::timestamptz, (u.account_id = $3)
      FROM cashouts c JOIN users u ON u.user_id = c.user_id
      WHERE c.cashout_id::text = $2
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
  const [verification, security, team] = await Promise.all([
    section(notes, 'Identity verification', async () => {
      // Status only. Session links, documents and business registration data stay on the verification desk.
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
    }),
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
    teamAnswer.id
      ? section(notes, 'Team', async () => {
          const result = await pool.query(
            `
            SELECT t.team_id, a.display_name AS name, a.handle, a.status, a.created_at
            FROM teams t JOIN accounts a ON a.account_id = t.account_id
            WHERE t.team_id::text = $1 OR t.account_id::text = $1
            LIMIT 1
            `,
            [teamAnswer.id]
          );
          const t = result.rows[0];
          return t ? { id: t.team_id, name: t.name || t.handle || 'Team', handle: t.handle || null, status: t.status, createdAt: t.created_at } : null;
        })
      : Promise.resolve(null),
  ]);
  return { verification, recentChanges: security, team };
}

async function editorContext(row, form, notes) {
  const projectAnswer = answerOf(form, 'project');
  const projectId = projectAnswer.id || uuidIn(projectAnswer.value);
  const project = projectId
    ? await section(notes, 'Project', async () => {
        const result = await pool.query(
          `
          SELECT p.project_id, p.name, p.created_at, p.updated_at, p.deleted_at,
                 (SELECT COUNT(*)::int FROM project_members pm WHERE pm.project_id = p.project_id AND pm.deleted_at IS NULL) AS members,
                 EXISTS (
                   SELECT 1 FROM project_members pm JOIN users u ON u.user_id = pm.user_id
                   WHERE pm.project_id = p.project_id AND pm.deleted_at IS NULL AND u.account_id = $2
                 ) AS requester_is_member
          FROM projects p
          WHERE p.project_id = $1
          `,
          [projectId, row.account_id]
        );
        const p = result.rows[0];
        return p
          ? {
              id: p.project_id,
              name: p.name,
              createdAt: p.created_at,
              updatedAt: p.updated_at,
              deleted: Boolean(p.deleted_at),
              members: num(p.members),
              requesterIsMember: Boolean(p.requester_is_member),
            }
          : null;
      })
    : null;
  if (project && !project.requesterIsMember) notes.push('The requester is not a member of this project.');
  if (project?.deleted) notes.push('This project is deleted.');
  return { project };
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
  const links = answerOf(form, 'infringing_links').value;
  const ids = [...new Set((String(links).match(new RegExp(UUID_RE.source, 'gi')) || []).map((id) => id.toLowerCase()))].slice(0, 3);
  const listings = await section(notes, 'Infringing listings', async () => {
    const found = [];
    for (const id of ids) {
      const listingId = await resolveListingId({ id, value: '' });
      if (listingId) {
        const summary = await listingSummary(listingId);
        if (summary) found.push(summary);
      }
    }
    return found;
  });
  return { reportedMember: null, reportsAgainst: null, infringingListings: listings };
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
  if (loaders[kind]) {
    context[kind] = await section(notes, 'Case details', loaders[kind]);
  }
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

module.exports = {
  caseKindForType,
  getTicketCaseContext,
  getDisputePartyStanding,
  ticketsReferencing,
};
