const { pool } = require('../lib/Database');
const { randomUUID } = require('crypto');
const { ObjectId } = require('mongodb');
const { getMongoClient } = require('../lib/MongoDb');
const {
  createInboxRepositories,
  createMessageRepositories,
  getMessageByIdRepositories,
  getConversationByConvoId,
} = require('./InboxRepositories');
const { createNotificationServices } = require('../services/NotificationServices');
const {
  isMongoReady,
  getDisputeChatId,
  ensureDisputeChat,
  listDisputeMessages,
  createDisputeMessage,
  updateDisputeMessageAudience,
} = require('./DisputeChatRepositories');
const {
  ROLE_TO_TICKET_TYPES,
  TICKET_TYPES,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  FORUM_TYPES,
  MARKETPLACE_TYPES,
  JOBS_TYPES,
  SUPPORT_TYPES,
  normalizeTicketType,
  normalizeTicketStatus,
  normalizeTicketPriority,
  isClosedStatus,
} = require('../lib/TicketEnums');
const {
  normalizeDisputeType,
  normalizeDisputePriority,
  normalizeDisputeVisibility,
} = require('../lib/DisputeEnums');
const { mapTicketRow } = require('./ModeratorSharedRepositories');
const {
  FORUM_REPORT_TYPES,
  MARKETPLACE_REPORT_TYPES,
  JOBS_REPORT_TYPES,
  isReportTypeInScope,
} = require('../lib/ReportEnums');

/** Staff roles that may appear in assignee pickers, keyed by desk / queue. */
const ASSIGNABLE_ROLES_BY_QUEUE = Object.freeze({
  jobs: ['Jobs N Gigs Moderator', 'Jobs Moderator', 'Jobs & Gigs Moderator'],
  marketplace: ['Marketplace Moderator'],
  forum: ['Forum Moderator', 'Forums Moderator'],
  forums: ['Forum Moderator', 'Forums Moderator'],
  support: ['Support Moderator'],
  disputes: ['Support Moderator', 'Admin', 'Administrator'],
  admin: [
    'Admin',
    'Administrator',
    'Support Moderator',
    'Forum Moderator',
    'Forums Moderator',
    'Marketplace Moderator',
    'Jobs N Gigs Moderator',
    'Jobs Moderator',
    'Jobs & Gigs Moderator',
  ],
});

function normalizeQueueKey(queueKey) {
  const q = String(queueKey || '')
    .trim()
    .toLowerCase();
  if (q === 'forums') return 'forum';
  if (q === 'jobs' || q === 'jobs-gigs' || q === 'job') return 'jobs';
  if (q === 'marketplace' || q === 'market') return 'marketplace';
  if (q === 'forum') return 'forum';
  if (q === 'support') return 'support';
  if (q === 'disputes' || q === 'dispute') return 'disputes';
  if (q === 'admin' || q === 'administrator') return 'admin';
  return q || 'admin';
}

function assignableRolesForQueue(queueKey) {
  const key = normalizeQueueKey(queueKey);
  return ASSIGNABLE_ROLES_BY_QUEUE[key] || ASSIGNABLE_ROLES_BY_QUEUE.admin;
}

function inferTicketAssignableQueue(ticketType) {
  const type = normalizeTicketType(ticketType) || String(ticketType || '').trim();
  if (FORUM_TYPES.includes(type)) return 'forum';
  if (MARKETPLACE_TYPES.includes(type)) return 'marketplace';
  if (JOBS_TYPES.includes(type)) return 'jobs';
  if (SUPPORT_TYPES.includes(type)) return 'support';
  return 'admin';
}

function inferReportAssignableQueue(targetType) {
  if (isReportTypeInScope(targetType, FORUM_REPORT_TYPES)) return 'forum';
  if (isReportTypeInScope(targetType, MARKETPLACE_REPORT_TYPES)) return 'marketplace';
  if (isReportTypeInScope(targetType, JOBS_REPORT_TYPES)) return 'jobs';
  return 'support';
}

function roleAllowedForQueue(role, queueKey) {
  const allowed = assignableRolesForQueue(queueKey).map((r) => r.toLowerCase());
  return allowed.includes(String(role || '').toLowerCase());
}

async function fetchAssignableStaffForQueue(queueKey, { includeStaffId = null } = {}) {
  const roles = assignableRolesForQueue(queueKey);
  const roleList = roles.map((r) => r.toLowerCase());
  const params = [roleList];
  let includeSql = '';
  if (includeStaffId != null && includeStaffId !== '') {
    params.push(String(includeStaffId));
    includeSql = ` OR s.staff_id::text = $${params.length}`;
  }

  const result = await pool.query(
    `
    SELECT s.staff_id, s.role, COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name
    FROM staff s
    INNER JOIN accounts a ON a.account_id = s.account_id
    WHERE a.deleted_at IS NULL
      AND (
        LOWER(s.role) = ANY($1)
        ${includeSql}
      )
    ORDER BY s.role, name
    `,
    params
  );
  return result.rows.map((s) => ({
    staffId: s.staff_id,
    name: s.name,
    role: s.role,
  }));
}

async function assertStaffAssignableToQueue(staffId, queueKey) {
  const result = await pool.query(`SELECT role FROM staff WHERE staff_id = $1`, [staffId]);
  if (!result.rows.length) {
    throw new Error('Staff member not found.');
  }
  if (!roleAllowedForQueue(result.rows[0].role, queueKey)) {
    const label = normalizeQueueKey(queueKey);
    throw new Error(
      `That staff member is not part of the ${label} moderator queue for this case.`
    );
  }
}

function getTicketCatalog() {
  return {
    types: [...TICKET_TYPES],
    typeDetails: TICKET_TYPES.map((label) => ({
      label,
      queueRole:
        Object.entries(ROLE_TO_TICKET_TYPES).find(([, list]) => list.includes(label))?.[0] ||
        'Support Moderator',
      description: null,
    })),
    statuses: [...TICKET_STATUSES],
    priorities: [...TICKET_PRIORITIES],
    escalateByRole: { ...ROLE_TO_TICKET_TYPES },
    escalateRoles: [
      'Support Moderator',
      'Marketplace Moderator',
      'Forum Moderator',
      'Jobs N Gigs Moderator',
      'Admin',
    ],
  };
}

function mongoDb() {
  const client = getMongoClient();
  return client ? client.db('ensemble') : null;
}

/** Session stores snake_case account_id; some older code used camelCase. */
function sessionAccountId(session) {
  const id = session?.account_id ?? session?.accountId ?? null;
  return id != null ? String(id) : null;
}

function sessionDisplayName(session) {
  return session?.displayName || session?.display_name || session?.username || 'User';
}

function isStaffSession(session) {
  const type = String(session?.type || '').toLowerCase();
  return type === 'staff' || type === 'admin' || Boolean(session?.staff_id || session?.staffId);
}

function sessionStaffId(session) {
  const id = session?.staff_id ?? session?.staffId ?? null;
  return id != null ? String(id) : null;
}

function normalizeStaffId(id) {
  if (id == null || id === '') return null;
  return String(id).trim().toLowerCase();
}

function normalizeStatus(status) {
  if (!status) return 'open';
  const s = String(status).toLowerCase();
  if (s === 'open') return 'open';
  if (s.includes('progress')) return 'in_progress';
  if (s === 'resolved') return 'resolved';
  if (s === 'closed') return 'closed';
  if (s.includes('review')) return 'under_review';
  if (s === 'escalated') return 'escalated';
  return status;
}

async function nextTicketNumber() {
  const result = await pool.query(`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER)),
      50000
    ) + 1 AS next_num
    FROM tickets
    WHERE ticket_number ~ '^TKT-[0-9]+$'
  `);
  return `TKT-${result.rows[0].next_num}`;
}

async function nextDisputeNumber() {
  const result = await pool.query(`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(dispute_number FROM 5) AS INTEGER)),
      50000
    ) + 1 AS next_num
    FROM disputes
    WHERE dispute_number ~ '^DIS-[0-9]+$'
  `);
  return `DIS-${result.rows[0].next_num}`;
}

/**
 * Create a support ticket in Postgres. Optional first message goes to Mongo chat.
 * @returns {Promise<{ticket, messages, chatId, chatAvailable, assignableStaff}>}
 */
async function createSupportTicket(input, session = null) {
  const reason = String(input?.reason || input?.subject || '').trim();
  if (!reason) throw new Error('Subject is required');

  const type = normalizeTicketType(input?.type || input?.category || 'Other');
  const priority = normalizeTicketPriority(input?.priority || 'Medium');
  const status = normalizeTicketStatus(input?.status || 'Open');
  const channel = String(input?.channel || 'web').trim().toLowerCase() || 'web';
  const requesterAccountId = input?.requesterAccountId || sessionAccountId(session);
  if (!requesterAccountId) throw new Error('Requester account is required');

  const description = input?.description ? String(input.description).trim() : '';
  const ticketNumber = await nextTicketNumber();
  const handledBy =
    input?.handledByStaffId ?? input?.assignedStaffId ?? null;

  const insert = await pool.query(
    `
    INSERT INTO tickets (
      ticket_number, reason, type, priority, status, channel,
      account_id, handled_by_staff_id,
      related_dispute_id,
      message_count, last_message_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8,
      $9,
      0, NULL
    )
    RETURNING ticket_id
    `,
    [
      ticketNumber,
      reason,
      type,
      priority,
      status,
      channel,
      requesterAccountId,
      handledBy,
      input?.relatedDisputeId || null,
    ]
  );

  const ticketId = insert.rows[0].ticket_id;

  if (description) {
    const authorSession = session || {
      account_id: requesterAccountId,
      type: 'User',
      username: sessionDisplayName(session),
    };
    try {
      await addTicketMessage(ticketId, description, authorSession, false);
    } catch (err) {
      // Ticket metadata still exists; chat can be started later when Mongo is up.
      if (!err?.message?.includes('MongoDB')) throw err;
      console.warn('Ticket created without initial chat message:', err.message);
    }
  }

  return getTicketDetail(ticketId);
}

function mapDisputeRow(row) {
  const closedStatuses = ['closed'];
  return {
    id: row.dispute_id,
    number: row.dispute_number,
    title: row.title,
    reason: row.reason,
    type: normalizeDisputeType(row.type),
    // Status stays snake_case; priority is Title Case in DB, lowercased for desk filters.
    status: String(row.status || 'open').toLowerCase(),
    priority: String(normalizeDisputePriority(row.priority || 'Medium')).toLowerCase(),
    visibility: Boolean(row.visibility),
    initiator: {
      accountId: row.by_account_id,
      name: row.initiator_name || 'Unknown',
      username: row.initiator_handle || '—',
    },
    respondent: {
      accountId: row.for_account_id,
      name: row.respondent_name || 'Unknown',
      username: row.respondent_handle || '—',
    },
    assignee: row.handled_by_staff_id
      ? { staffId: row.handled_by_staff_id, name: row.assignee_name || 'Unassigned', role: row.assignee_role }
      : null,
    creditAmount: Number(row.credit_amount_involved || 0),
    sanctionType: row.sanction_type || null,
    relatedCreditTransactionId: row.related_credit_transaction_id || null,
    creditHold: row.hold_status
      ? {
          transactionId: row.related_credit_transaction_id,
          status: row.hold_status,
          amount: Number(row.hold_amount ?? row.credit_amount_involved ?? 0),
          type: row.hold_type || 'Escrow Hold',
        }
      : null,
    openedAt: row.opened_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    resolutionNotes: row.resolution_notes,
    isClosed: closedStatuses.includes(String(row.status || '').toLowerCase()),
  };
}

function displayLabel(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function mapReportRow(row) {
  return {
    id: row.report_id,
    number: row.report_number,
    reporter: {
      accountId: row.reporter_account_id || row.by_account_id,
      name: row.reporter_name || 'Anonymous',
      username: row.reporter_handle || '—',
    },
    targetType: displayLabel(row.target_type || row.type),
    targetId: row.target_id || row.reference_id,
    targetLabel: row.target_label,
    reason: row.reason,
    description: row.description,
    // Keep status/priority as DB snake_case for filters/forms; format in UI.
    status: String(row.status || 'open').toLowerCase(),
    priority: String(row.priority || 'medium').toLowerCase(),
    assignee: row.assigned_staff_id
      ? { staffId: row.assigned_staff_id, name: row.assignee_name || 'Unassigned' }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    resolvedAt: row.resolved_at,
  };
}

async function getTicketsOverview(staffSession = null) {
  const [
    ticketCounts,
    disputeCounts,
    reportCounts,
    tickets,
    disputes,
    reports,
    staffWorkload,
    recentActivity,
    typeBreakdown,
    priorityBreakdown,
  ] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Open')::int AS open_count,
        COUNT(*) FILTER (WHERE status = 'In Progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed'))::int AS resolved,
        COUNT(*) FILTER (
          WHERE priority = 'High'
            AND status NOT IN ('Resolved', 'Closed')
        )::int AS high_priority,
        COUNT(*) FILTER (
          WHERE handled_by_staff_id IS NULL
            AND status NOT IN ('Resolved', 'Closed')
        )::int AS unassigned,
        COUNT(*) FILTER (
          WHERE status NOT IN ('Resolved', 'Closed')
            AND LOWER(COALESCE(last_message_author_type, '')) = 'user'
        )::int AS awaiting_reply,
        COUNT(*) FILTER (
          WHERE status NOT IN ('Resolved', 'Closed')
            AND (escalated_to_role IS NOT NULL OR escalated_by_staff_id IS NOT NULL)
        )::int AS escalated
      FROM tickets
      WHERE deleted_at IS NULL
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(status) = 'pending_review')::int AS pending_review,
        COUNT(*) FILTER (WHERE LOWER(status) = 'open')::int AS open_only,
        COUNT(*) FILTER (WHERE LOWER(status) = 'awaiting_response')::int AS awaiting_response,
        COUNT(*) FILTER (WHERE LOWER(status) = 'under_review')::int AS under_review,
        COUNT(*) FILTER (WHERE LOWER(status) = 'closed')::int AS closed,
        COUNT(*) FILTER (
          WHERE LOWER(status) IN ('pending_review', 'open', 'awaiting_response', 'under_review')
        )::int AS open_count,
        COALESCE(
          SUM(credit_amount_involved) FILTER (
            WHERE LOWER(status) IN ('pending_review', 'open', 'awaiting_response', 'under_review')
          ),
          0
        )::int AS credits_at_risk
      FROM disputes
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(status) = 'open')::int AS open_count,
        COUNT(*) FILTER (WHERE LOWER(status) = 'in_review')::int AS in_review,
        COUNT(*) FILTER (WHERE LOWER(status) = 'resolved')::int AS resolved,
        COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('resolved', 'closed'))::int AS awaiting_triage
      FROM reports
      WHERE deleted_at IS NULL
    `),
    fetchTicketsList(),
    fetchDisputesList(),
    fetchReportsList(),
    fetchStaffWorkload(),
    fetchRecentActivity(),
    pool.query(`
      SELECT type, COUNT(*)::int AS count
      FROM tickets
      WHERE deleted_at IS NULL
      GROUP BY type
      ORDER BY count DESC
    `),
    pool.query(`
      SELECT priority, COUNT(*)::int AS count
      FROM tickets
      WHERE deleted_at IS NULL
        AND status NOT IN ('Resolved', 'Closed')
      GROUP BY priority
      ORDER BY count DESC
    `),
  ]);

  const tc = ticketCounts.rows[0];
  const dc = disputeCounts.rows[0];
  const rc = reportCounts.rows[0];

  const statusChart = [
    { label: 'Open', value: Number(tc.open_count), color: '#f87171' },
    { label: 'In Progress', value: Number(tc.in_progress), color: '#fbbf24' },
    { label: 'Resolved', value: Number(tc.resolved), color: '#34d399' },
  ].filter((x) => x.value > 0);

  const catalog = await getTicketCatalog();
  const typeCountMap = Object.fromEntries(
    typeBreakdown.rows.map((r) => [String(r.type || '').trim(), Number(r.count || 0)])
  );
  const typeLabels = catalog.types.length
    ? catalog.types
    : Object.keys(typeCountMap).sort((a, b) => a.localeCompare(b));
  const typeChart = typeLabels
    .map((label, i) => ({
      label,
      value: typeCountMap[label] || 0,
      color: ['#fb7185', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#38bdf8'][i % 7],
    }))
    .filter((x) => x.value > 0);

  const priorityOrder = { High: 0, Medium: 1, Low: 2 };
  const priorityChart = (catalog.priorities.length ? catalog.priorities : ['High', 'Medium', 'Low'])
    .map((label) => {
      const row = priorityBreakdown.rows.find(
        (r) => String(r.priority || '').toLowerCase() === label.toLowerCase()
      );
      return { label, value: Number(row?.count || 0) };
    })
    .filter((x) => x.value > 0)
    .sort((a, b) => (priorityOrder[a.label] ?? 9) - (priorityOrder[b.label] ?? 9));

  const types = catalog.types.length ? catalog.types : typeLabels;

  const staff = staffSession ? await resolveDisputeStaffId(staffSession) : null;
  const currentStaffId = staff?.staff_id != null ? String(staff.staff_id) : sessionStaffId(staffSession);

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      openTickets: Number(tc.open_count) + Number(tc.in_progress),
      totalTickets: Number(tc.total),
      unassignedTickets: Number(tc.unassigned),
      highPriorityTickets: Number(tc.high_priority),
      awaitingReplyTickets: Number(tc.awaiting_reply),
      escalatedTickets: Number(tc.escalated),
      openDisputes: Number(dc.open_count) + Number(dc.under_review),
      totalDisputes: Number(dc.total),
      creditsAtRisk: Number(dc.credits_at_risk),
      openReports: Number(rc.open_count) + Number(rc.in_review),
      totalReports: Number(rc.total),
      avgResolutionHours: 18,
      slaCompliancePercent: tc.total > 0 ? Math.round(((Number(tc.resolved) / Number(tc.total)) * 100)) : 100,
    },
    charts: {
      ticketStatusMix: statusChart,
      ticketCategories: typeChart,
      ticketTypes: typeChart,
      openByPriority: priorityChart,
      disputeStatusMix: [
        { label: 'Pending Review', value: Number(dc.pending_review || 0), color: '#fb7185' },
        { label: 'Open', value: Number(dc.open_only || 0), color: '#f87171' },
        { label: 'Awaiting Response', value: Number(dc.awaiting_response || 0), color: '#f59e0b' },
        { label: 'Under Review', value: Number(dc.under_review), color: '#fbbf24' },
        { label: 'Closed', value: Number(dc.closed || 0), color: '#94a3b8' },
      ].filter((x) => x.value > 0),
    },
    types,
    typeDetails: catalog.typeDetails,
    escalateByRole: catalog.escalateByRole,
    escalateRoles: catalog.escalateRoles,
    statuses: catalog.statuses,
    priorities: catalog.priorities,
    tickets,
    disputes,
    reports,
    staffWorkload,
    recentActivity,
    currentStaffId,
    alerts: buildTicketAlerts(tc, dc, rc),
    dataSources: {
      tables: [
        'tickets',
        'ticket_chats',
        'inbox/messages (mongo)',
        'disputes',
        'reports',
      ],
      persisted: true,
    },
  };
}

function buildTicketAlerts(tc, dc, rc) {
  const alerts = [];
  const openDisputes = Number(dc.open_count) + Number(dc.under_review);
  const openReports = Number(rc.awaiting_triage ?? Number(rc.open_count) + Number(rc.in_review || 0));

  if (Number(tc.unassigned) > 0) {
    alerts.push({
      id: 'unassigned',
      message: `${tc.unassigned} ticket(s) have no assignee.`,
      severity: 'warning',
      action: { tab: 'tickets', ticketFilters: { assignee: 'unassigned', flag: 'open_only' } },
    });
  }
  if (Number(tc.high_priority) > 0) {
    alerts.push({
      id: 'high-priority',
      message: `${tc.high_priority} high-priority ticket(s) need attention.`,
      severity: 'error',
      action: { tab: 'tickets', ticketFilters: { priority: 'High', flag: 'open_only' } },
    });
  }
  if (Number(tc.awaiting_reply) > 0) {
    alerts.push({
      id: 'awaiting-reply',
      message: `${tc.awaiting_reply} ticket(s) awaiting a staff reply.`,
      severity: 'warning',
      action: { tab: 'tickets', ticketFilters: { flag: 'awaiting' } },
    });
  }
  if (Number(tc.escalated) > 0) {
    alerts.push({
      id: 'escalated',
      message: `${tc.escalated} escalated ticket(s) need a queue handoff.`,
      severity: 'error',
      action: { tab: 'tickets', ticketFilters: { flag: 'escalated' } },
    });
  }
  if (openDisputes > 0) {
    alerts.push({
      id: 'open-disputes',
      message: `${openDisputes} open dispute(s) — ${Number(dc.credits_at_risk).toLocaleString()} credits at risk. Open Moderation → Disputes.`,
      severity: 'warning',
      action: null,
    });
  }
  if (openReports > 0) {
    alerts.push({
      id: 'open-reports',
      message: `${openReports} user report(s) awaiting triage — open Moderation → Reports.`,
      severity: 'info',
      action: null,
    });
  }
  if (!alerts.length) {
    alerts.push({
      id: 'clear',
      message: 'Ticket desk is clear — no urgent queues.',
      severity: 'success',
    });
  }
  return alerts;
}

async function fetchTicketsList() {
  const result = await pool.query(`
    SELECT
      t.*,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS requester_name,
      ra.handle AS requester_handle,
      ru.email_address AS requester_email,
      ru.user_id AS requester_user_id,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role,
      COALESCE(ea.display_name, es.first_name || ' ' || es.last_name) AS escalated_by_name,
      es.role AS escalated_by_role,
      COALESCE(t.message_count, 0) AS message_count,
      t.last_message_at
    FROM tickets t
    LEFT JOIN accounts ra ON ra.account_id = t.account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = t.handled_by_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    LEFT JOIN staff es ON es.staff_id = t.escalated_by_staff_id
    LEFT JOIN accounts ea ON ea.account_id = es.account_id
    WHERE t.deleted_at IS NULL
    ORDER BY
      CASE t.priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END,
      t.updated_at DESC
    LIMIT 200
  `);
  return result.rows.map(mapTicketRow);
}

async function fetchDisputesList() {
  const result = await pool.query(`
    SELECT
      d.*,
      COALESCE(ia.display_name, iu.first_name || ' ' || iu.last_name) AS initiator_name,
      ia.handle AS initiator_handle,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS respondent_name,
      ra.handle AS respondent_handle,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role,
      ct.status AS hold_status,
      ct.amount_credits AS hold_amount,
      ct.type AS hold_type
    FROM disputes d
    LEFT JOIN accounts ia ON ia.account_id = d.by_account_id
    LEFT JOIN users iu ON iu.account_id = ia.account_id
    LEFT JOIN accounts ra ON ra.account_id = d.for_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = d.handled_by_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    LEFT JOIN credit_transactions ct ON ct.credit_transaction_id = d.related_credit_transaction_id
    ORDER BY d.opened_at DESC
    LIMIT 80
  `);
  return result.rows.map(mapDisputeRow);
}

async function fetchReportsList() {
  const result = await pool.query(`
    SELECT
      r.*,
      r.by_account_id AS reporter_account_id,
      COALESCE(repa.display_name, repu.first_name || ' ' || repu.last_name) AS reporter_name,
      repa.handle AS reporter_handle,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name
    FROM reports r
    LEFT JOIN accounts repa ON repa.account_id = r.by_account_id
    LEFT JOIN users repu ON repu.account_id = repa.account_id
    LEFT JOIN staff st ON st.staff_id = r.assigned_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    WHERE r.deleted_at IS NULL
    ORDER BY r.created_at DESC
    LIMIT 80
  `);
  return result.rows.map(mapReportRow);
}

async function fetchStaffWorkload() {
  const result = await pool.query(`
    SELECT
      s.staff_id,
      s.role,
      COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name,
      (SELECT COUNT(*)::int FROM tickets t
        WHERE t.handled_by_staff_id = s.staff_id
          AND t.deleted_at IS NULL
          AND t.status NOT IN ('Resolved', 'Closed')) AS open_tickets,
      (SELECT COUNT(*)::int FROM disputes d
        WHERE d.handled_by_staff_id = s.staff_id
          AND LOWER(d.status) <> 'closed') AS open_disputes,
      (SELECT COUNT(*)::int FROM reports r
        WHERE r.assigned_staff_id = s.staff_id AND LOWER(r.status) = 'open' AND r.deleted_at IS NULL) AS open_reports
    FROM staff s
    INNER JOIN accounts a ON a.account_id = s.account_id
    ORDER BY open_tickets DESC, open_disputes DESC
  `);
  return result.rows.map((r) => ({
    staffId: r.staff_id,
    name: r.name,
    role: r.role,
    openTickets: Number(r.open_tickets),
    openDisputes: Number(r.open_disputes),
    openReports: Number(r.open_reports),
    totalOpen: Number(r.open_tickets) + Number(r.open_disputes) + Number(r.open_reports),
  }));
}

async function fetchRecentActivity() {
  const result = await pool.query(`
    (
      SELECT 'ticket' AS type, ticket_number AS ref, reason AS label, status, updated_at AS at
      FROM tickets
      WHERE deleted_at IS NULL
      ORDER BY updated_at DESC LIMIT 8
    )
    UNION ALL
    (
      SELECT 'dispute' AS type, dispute_number AS ref, title AS label, status, updated_at AS at
      FROM disputes ORDER BY updated_at DESC LIMIT 6
    )
    UNION ALL
    (
      SELECT 'report' AS type, report_number AS ref, COALESCE(reason, type) AS label, status, COALESCE(updated_at, created_at) AS at
      FROM reports WHERE deleted_at IS NULL ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 6
    )
    ORDER BY at DESC
    LIMIT 20
  `);
  return result.rows.map((r, i) => ({
    id: `act-${i}`,
    type: displayLabel(r.type),
    ref: r.ref,
    label: r.label,
    status: displayLabel(r.status),
    at: r.at,
  }));
}

async function getTicketChatId(ticketId) {
  const result = await pool.query(
    `SELECT chat_id FROM ticket_chats WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  return result.rows[0]?.chat_id || null;
}

/** Create (or reuse) the Mongo inbox for a support ticket and link it via ticket_chats. */
async function ensureTicketChat(ticketId, ticketRow) {
  const existing = await getTicketChatId(ticketId);
  const ticketDetails = {
    ticket_number: ticketRow.ticket_number || null,
    subject: ticketRow.reason || null,
    type: ticketRow.type || null,
    priority: ticketRow.priority || null,
    status: ticketRow.status || null,
  };

  if (existing) {
    const db = mongoDb();
    if (db && ObjectId.isValid(existing)) {
      await db.collection('inbox').updateOne(
        { _id: new ObjectId(existing) },
        {
          $set: {
            conversation_type: 'ticket',
            ticket_id: String(ticketId),
            support_ticket_id: String(ticketId),
            ticket_details: ticketDetails,
          },
        }
      );
    }
    return existing;
  }

  if (!getMongoClient()) {
    throw new Error('MongoDB is not connected — ticket chats require MONGODB_URI');
  }

  const members = [];
  const seen = new Set();
  const addMember = (accountId, role) => {
    if (!accountId || seen.has(String(accountId))) return;
    seen.add(String(accountId));
    members.push({ account_id: String(accountId), role, joined_at: new Date() });
  };

  addMember(ticketRow.account_id, 'member');

  const insertResult = await createInboxRepositories({
    conversation_name: ticketRow.ticket_number
      ? `Ticket ${ticketRow.ticket_number}`
      : `Ticket ${ticketId}`,
    conversation_type: 'ticket',
    ticket_id: String(ticketId),
    support_ticket_id: String(ticketId),
    ticket_details: ticketDetails,
    members,
    pinned_messages: [],
    created_at: new Date(),
    updated_at: new Date(),
  });

  const chatId = String(insertResult.insertedId);
  await pool.query(
    `INSERT INTO ticket_chats (ticket_id, chat_id)
     VALUES ($1, $2)
     ON CONFLICT (ticket_id) DO UPDATE
       SET chat_id = EXCLUDED.chat_id, deleted_at = NULL, created_at = CURRENT_TIMESTAMP`,
    [ticketId, chatId]
  );
  return chatId;
}

function mapMongoTicketMessage(m, senderNames = new Map()) {
  return {
    id: String(m._id),
    senderId: m.sender_id ? String(m.sender_id) : null,
    authorType: m.author_type || (m.is_internal ? 'staff' : 'user'),
    authorName: m.author_name || senderNames.get(String(m.sender_id)) || 'Unknown',
    body: m.message_content || m.body || '',
    isInternal: Boolean(m.is_internal),
    createdAt: m.created_at || m.createdAt || null,
  };
}

async function getTicketDetail(ticketId, staffSession = null, options = {}) {
  const ticketResult = await pool.query(
    `
    SELECT
      t.*,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS requester_name,
      ra.handle AS requester_handle,
      ru.email_address AS requester_email,
      ru.user_id AS requester_user_id,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role,
      COALESCE(ea.display_name, es.first_name || ' ' || es.last_name) AS escalated_by_name,
      es.role AS escalated_by_role
    FROM tickets t
    LEFT JOIN accounts ra ON ra.account_id = t.account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = t.handled_by_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    LEFT JOIN staff es ON es.staff_id = t.escalated_by_staff_id
    LEFT JOIN accounts ea ON ea.account_id = es.account_id
    WHERE t.ticket_id = $1 AND t.deleted_at IS NULL
    `,
    [ticketId]
  );
  if (!ticketResult.rows.length) return null;

  const row = ticketResult.rows[0];
  const queueKey = options.assignableQueue || inferTicketAssignableQueue(row.type);
  const assignableStaff = await fetchAssignableStaffForQueue(queueKey, {
    includeStaffId: row.handled_by_staff_id,
  });

  let messages = [];
  let chatId = null;
  let chatAvailable = Boolean(getMongoClient());
  const staff = staffSession ? await resolveDisputeStaffId(staffSession) : null;

  try {
    chatId = await getTicketChatId(ticketId);
    if (chatId && chatAvailable) {
      // This method receives staffSession only from authenticated admin/moderator
      // ticket endpoints. Room membership must use that authenticated account
      // directly; it must not depend on a second staff-profile lookup succeeding.
      const staffAccountId = staffSession ? sessionAccountId(staffSession) : null;
      const db = mongoDb();
      if (staffAccountId && db && ObjectId.isValid(chatId)) {
        await db.collection('inbox').updateOne(
          { _id: new ObjectId(chatId), 'members.account_id': { $ne: String(staffAccountId) } },
          {
            $push: {
              members: {
                account_id: String(staffAccountId),
                role: 'admin',
                status: 'active',
                joined_at: new Date(),
              },
            },
            $set: { updated_at: new Date() },
          }
        );
      }
      const { Messages } = await getConversationByConvoId(chatId);
      const activeMessages = (Messages || []).filter(
        (message) => !message.is_deleted && !message.deleted_at
      );
      const senderIds = [
        ...new Set(
          activeMessages
            .map((message) => String(message.sender_id || ''))
            .filter((senderId) =>
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(senderId)
            )
        ),
      ];
      const senderNames = new Map();
      if (senderIds.length) {
        const senderResult = await pool.query(
          `SELECT
             a.account_id,
             COALESCE(a.display_name, NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), a.handle, 'Unknown') AS sender_name
           FROM accounts a
           LEFT JOIN users u ON u.account_id = a.account_id
           WHERE a.account_id = ANY($1::uuid[])`,
          [senderIds]
        );
        senderResult.rows.forEach((sender) => {
          senderNames.set(String(sender.account_id), sender.sender_name);
        });
      }
      messages = activeMessages
        .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
        .map((message) => mapMongoTicketMessage(message, senderNames));
    }
  } catch (err) {
    console.error('Error loading ticket chat from MongoDB:', err.message);
    chatAvailable = false;
  }

  const catalog = await getTicketCatalog();
  const { buildTicketPermissions } = require('./TicketAssignmentHelpers');

  const lastPublic = [...messages].reverse().find((m) => !m.isInternal);
  const derivedAuthor =
    lastPublic?.authorType === 'staff' || lastPublic?.authorType === 'user'
      ? lastPublic.authorType
      : row.last_message_author_type;

  return {
    ticket: mapTicketRow({
      ...row,
      message_count: messages.length || Number(row.message_count || 0),
      last_message_at: messages.length
        ? messages[messages.length - 1].createdAt
        : row.last_message_at,
      last_message_author_type: derivedAuthor,
    }),
    messages,
    chatId,
    chatAvailable,
    types: catalog.types,
    statuses: catalog.statuses,
    priorities: catalog.priorities,
    typeDetails: catalog.typeDetails,
    escalateByRole: catalog.escalateByRole,
    escalateRoles: catalog.escalateRoles,
    permissions: buildTicketPermissions(row, staff, sessionStaffId(staffSession)),
    assignableQueue: normalizeQueueKey(queueKey),
    assignableStaff,
  };
}

async function applyTicketAssignmentAction(ticketId, patch, staffSession) {
  const { buildTicketPermissions } = require('./TicketAssignmentHelpers');
  const action = String(patch.action || '').trim();
  if (!action) return null;

  const staff = await resolveDisputeStaffId(staffSession);
  if (!staff) throw new Error('Could not match your login to a staff profile.');

  const fresh = await pool.query(
    `SELECT handled_by_staff_id FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!fresh.rows.length) return null;
  const row = fresh.rows[0];
  const perms = buildTicketPermissions(row, staff, sessionStaffId(staffSession));

  if (action === 'self_assign') {
    if (!perms.canAssignMyself && !perms.canSelfAssign) {
      throw new Error('You cannot assign this ticket to yourself.');
    }
    if (row.handled_by_staff_id && !perms.isAdmin) {
      throw new Error('This ticket already has a handler. They must release the case first.');
    }
    await pool.query(
      `UPDATE tickets SET handled_by_staff_id = $1, updated_at = NOW()
       WHERE ticket_id = $2 AND deleted_at IS NULL`,
      [staff.staff_id, ticketId]
    );
    return getTicketDetail(ticketId, staffSession);
  }

  if (action === 'release' || action === 'self_unassign') {
    if (!perms.canRelease && !perms.isAssignee) {
      throw new Error('Only the current handler can release this case.');
    }
    if (perms.isAdmin && !perms.isAssignee) {
      await pool.query(
        `UPDATE tickets SET handled_by_staff_id = NULL, updated_at = NOW()
         WHERE ticket_id = $1 AND deleted_at IS NULL`,
        [ticketId]
      );
    } else {
      await pool.query(
        `UPDATE tickets SET handled_by_staff_id = NULL, updated_at = NOW()
         WHERE ticket_id = $1 AND deleted_at IS NULL AND handled_by_staff_id = $2`,
        [ticketId, staff.staff_id]
      );
    }
    return getTicketDetail(ticketId, staffSession);
  }

  throw new Error(`Unknown ticket action: ${action}`);
}

async function updateTicket(ticketId, patch, staffSession) {
  if (patch?.action) {
    return applyTicketAssignmentAction(ticketId, patch, staffSession);
  }

  const sets = [];
  const values = [];
  let idx = 1;

  // Normalize aliases onto the tickets schema.
  if (patch.assigned_staff_id !== undefined && patch.handled_by_staff_id === undefined) {
    patch.handled_by_staff_id = patch.assigned_staff_id;
  }
  if (patch.category !== undefined && patch.type === undefined) {
    patch.type = patch.category;
  }

  const currentRow = await pool.query(
    `SELECT handled_by_staff_id FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!currentRow.rows.length) return null;
  const currentAssignee = currentRow.rows[0].handled_by_staff_id;
  const { buildTicketPermissions } = require('./TicketAssignmentHelpers');
  const staff = await resolveDisputeStaffId(staffSession);
  const ticketPerms = buildTicketPermissions(
    currentRow.rows[0],
    staff,
    sessionStaffId(staffSession)
  );

  if (patch.assigned_role) {
    const catalog = await getTicketCatalog();
    const allowed =
      catalog.escalateByRole?.[patch.assigned_role] ||
      ROLE_TO_TICKET_TYPES[patch.assigned_role] ||
      [];
    if (!allowed.length) {
      throw new Error(`Unknown escalate role: ${patch.assigned_role}`);
    }
    if (patch.type === undefined || patch.type === null || String(patch.type).trim() === '') {
      throw new Error(
        `A ticket type is required when escalating to ${patch.assigned_role}. Allowed: ${allowed.join(', ')}`
      );
    }
    const normalized = normalizeTicketType(patch.type);
    if (!allowed.includes(normalized)) {
      throw new Error(
        `Ticket type "${normalized}" is not valid for ${patch.assigned_role}. Allowed: ${allowed.join(', ')}`
      );
    }
    patch.type = normalized;

    // Escalating clears the handler — only the assigned moderator (or Admin override).
    if (!ticketPerms.canEscalate) {
      throw new Error(
        ticketPerms.isAdmin
          ? 'You cannot escalate this ticket.'
          : 'Only the assigned moderator can escalate this ticket. Assign yourself first.'
      );
    }

    sets.push(`escalated_to_role = $${idx}`);
    values.push(patch.assigned_role);
    idx += 1;

    const escalatedBy = sessionStaffId(staffSession);
    if (escalatedBy) {
      sets.push(`escalated_by_staff_id = $${idx}`);
      values.push(escalatedBy);
      idx += 1;
    }

    if (patch.handled_by_staff_id === undefined) {
      patch.handled_by_staff_id = null;
    }
  }

  if (patch.status !== undefined) {
    sets.push(`status = $${idx}`);
    values.push(normalizeTicketStatus(patch.status));
    idx += 1;
  }
  if (patch.priority !== undefined) {
    sets.push(`priority = $${idx}`);
    values.push(normalizeTicketPriority(patch.priority));
    idx += 1;
  }
  if (patch.type !== undefined) {
    if (!patch.assigned_role) {
      throw new Error('Ticket type can only be changed when escalating to a moderator queue');
    }
    sets.push(`type = $${idx}`);
    values.push(normalizeTicketType(patch.type));
    idx += 1;
  }
  if (patch.handled_by_staff_id !== undefined) {
    const nextAssignee =
      patch.handled_by_staff_id === null || patch.handled_by_staff_id === ''
        ? null
        : patch.handled_by_staff_id;
    const nextNorm = normalizeStaffId(nextAssignee);
    const curNorm = normalizeStaffId(currentAssignee);

    if (curNorm && nextNorm !== curNorm) {
      // Locked while assigned — handler must Release case (or escalate). Admin may override.
      if (!patch.assigned_role && !ticketPerms.isAdmin && !ticketPerms.canAssignOthers) {
        throw new Error(
          'This ticket already has a handler. They must release the case before it can be reassigned.'
        );
      }
    }

    if (!curNorm && nextNorm && !ticketPerms.canAssignOthers && !ticketPerms.canAssignMyself) {
      // Claiming should use Assign myself; Admin may still pick someone when open.
      if (!ticketPerms.isAdmin) {
        throw new Error('Use Assign myself to claim an unassigned ticket.');
      }
    }

    if (nextNorm && !patch.assigned_role) {
      const typeRow = await pool.query(
        `SELECT type FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
        [ticketId]
      );
      const queueKey = inferTicketAssignableQueue(typeRow.rows[0]?.type);
      await assertStaffAssignableToQueue(nextAssignee, queueKey);
    }

    sets.push(`handled_by_staff_id = $${idx}`);
    values.push(nextAssignee);
    idx += 1;
  }

  if (!sets.length && !patch.note) return getTicketDetail(ticketId, staffSession);

  if (sets.length) {
    if (patch.status && isClosedStatus(patch.status)) {
      sets.push(`resolved_at = NOW()`);
    }

    sets.push(`updated_at = NOW()`);
    values.push(ticketId);

    await pool.query(
      `UPDATE tickets SET ${sets.join(', ')} WHERE ticket_id = $${idx} AND deleted_at IS NULL`,
      values
    );
  }

  if (patch.note) {
    await addTicketMessage(ticketId, patch.note, staffSession, Boolean(patch.internalNote));
    return getTicketDetail(ticketId, staffSession);
  }

  return getTicketDetail(ticketId, staffSession);
}

async function addTicketMessage(ticketId, body, staffSession, isInternal = false) {
  if (!getMongoClient()) {
    throw new Error('MongoDB is not connected — cannot send ticket chat messages');
  }

  const ticketResult = await pool.query(
    `SELECT * FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!ticketResult.rows.length) return null;

  const chatId = await ensureTicketChat(ticketId, ticketResult.rows[0]);
  const now = new Date();
  const accountId = sessionAccountId(staffSession);
  const staff = isStaffSession(staffSession);
  const memberRole = staff ? 'admin' : 'member';

  if (accountId && ObjectId.isValid(chatId)) {
    const db = mongoDb();
    if (db) {
      await db.collection('inbox').updateOne(
        { _id: new ObjectId(chatId), 'members.account_id': { $ne: accountId } },
        {
          $push: { members: { account_id: accountId, role: memberRole, joined_at: now } },
          $set: { updated_at: now },
        }
      );
    }
  }

  const insertedMessageId = await createMessageRepositories({
    conversation_id: String(chatId),
    sender_id: accountId,
    message_type: 'text',
    message_content: body,
    message_id_reply: null,
    attachments: [],
    links: [],
    message_react: [],
    read_by: accountId ? [{ account_id: accountId, read_at: now }] : [],
    is_edited: false,
    is_deleted: false,
    is_internal: staff ? Boolean(isInternal) : false,
    author_type: staff ? 'staff' : 'user',
    author_name: sessionDisplayName(staffSession) || (staff ? 'Staff' : 'User'),
    created_at: now,
    updated_at: now,
  });
  const createdMessage = await getMessageByIdRepositories(insertedMessageId);

  await pool.query(
    `UPDATE tickets
     SET updated_at = NOW(),
         message_count = COALESCE(message_count, 0) + 1,
         last_message_at = NOW(),
         last_message_author_type = $2
     WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId, staff ? 'staff' : 'user']
  );

  if (ObjectId.isValid(chatId)) {
    const db = mongoDb();
    if (db) {
      await db.collection('inbox').updateOne(
        { _id: new ObjectId(chatId) },
        { $set: { updated_at: now, last_message: body, last_message_time: now } }
      );

      const inbox = await db.collection('inbox').findOne({ _id: new ObjectId(chatId) });
      const recipients = (inbox?.members || []).filter(
        (member) =>
          String(member.account_id) !== String(accountId) &&
          !['left', 'removed'].includes(member.status || 'active') &&
          (!isInternal || ['admin', 'staff', 'moderator'].includes(String(member.role).toLowerCase()))
      );
      const { getIo } = require('../lib/WebSocket');
      let io = null;
      try {
        io = getIo();
      } catch (error) {
        console.error('Ticket message saved without realtime delivery:', error.message);
      }

      if (io && isInternal) {
        recipients.forEach((member) => {
          io.to(String(member.account_id)).emit('ticketInternalMessage', createdMessage);
        });
      } else if (io) {
        io.to(String(chatId)).emit('newMessage', createdMessage);
      }

      await Promise.all(
        recipients.map(async (member) => {
          try {
            const notification = await createNotificationServices({
              account_id: String(member.account_id),
              message: `${sessionDisplayName(staffSession) || (staff ? 'Staff' : 'A user')} replied to ticket ${ticketResult.rows[0].ticket_number}.`,
              is_read: false,
              reference_table: 'inbox',
              reference_prefix: isInternal ? 'TICKET_INTERNAL_REPLY' : 'TICKET_REPLY',
              reference_path: `/inbox/direct?conversation=${chatId}`,
              reference_id: randomUUID(),
            });
            if (io) {
              io.to(String(member.account_id)).emit('notification', notification);
            }
          } catch (error) {
            console.error('Error creating ticket reply notification:', error.message);
          }
        })
      );
    }
  }

  return getTicketDetail(ticketId, staffSession);
}

async function resolveDisputeStaffId(session) {
  const direct = sessionStaffId(session);
  if (direct) {
    const existing = await pool.query(`SELECT staff_id, role FROM staff WHERE staff_id::text = $1 LIMIT 1`, [
      String(direct),
    ]);
    if (existing.rows.length) return existing.rows[0];
  }
  const accountId = sessionAccountId(session);
  if (accountId) {
    const byAccount = await pool.query(
      `SELECT staff_id, role FROM staff WHERE account_id::text = $1 LIMIT 1`,
      [String(accountId)]
    );
    if (byAccount.rows.length) return byAccount.rows[0];
  }
  const email = session?.email || session?.email_address || null;
  if (email) {
    const byEmail = await pool.query(
      `SELECT staff_id, role FROM staff WHERE LOWER(email_address) = LOWER($1) LIMIT 1`,
      [String(email).trim()]
    );
    if (byEmail.rows.length) return byEmail.rows[0];
  }
  const handle = session?.username || session?.handle || null;
  if (handle) {
    const byHandle = await pool.query(
      `SELECT s.staff_id, s.role
       FROM staff s
       INNER JOIN accounts a ON a.account_id = s.account_id
       WHERE LOWER(a.handle) = LOWER($1)
       LIMIT 1`,
      [String(handle).trim()]
    );
    if (byHandle.rows.length) return byHandle.rows[0];
  }
  // Session fallback so Admin/Support can still claim when Redis payload has staffId/role
  if (direct && session?.role) {
    return { staff_id: direct, role: session.role };
  }
  return null;
}

function isAdminRole(role) {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'administrator';
}

function isSupportRole(role) {
  return String(role || '').toLowerCase() === 'support moderator';
}

/** Dispute handlers only — Support Moderators + Admin. */
function isDesignatedHandlerRole(role) {
  return isAdminRole(role) || isSupportRole(role);
}

/** Ticket/report claim roles — any specialist console + Support + Admin. */
function isQueueHandlerRole(role) {
  const r = String(role || '').toLowerCase();
  return (
    isDesignatedHandlerRole(role) ||
    r.includes('forum') ||
    r.includes('marketplace') ||
    r.includes('jobs')
  );
}

const DISPUTE_WORKFLOW = ['pending_review', 'open', 'awaiting_response', 'under_review', 'closed'];
const DISPUTE_LEGACY_CLOSED_STATUS = ['resolved', 'sanctioned', 'dismissed', 'withdrawn'];

function normalizeDisputeStatusPatch(patch) {
  const next = { ...patch };
  if (next.status != null) {
    let status = String(next.status).toLowerCase().trim();
    if (DISPUTE_LEGACY_CLOSED_STATUS.includes(status)) {
      status = 'closed';
    }
    if (!DISPUTE_WORKFLOW.includes(status)) {
      throw new Error(
        `Invalid dispute status "${next.status}". Use: ${DISPUTE_WORKFLOW.join(', ')}.`
      );
    }
    next.status = status;
  }
  if (next.priority != null) {
    next.priority = normalizeDisputePriority(next.priority);
  }
  if (next.type != null) {
    next.type = normalizeDisputeType(next.type);
  }
  if (next.visibility !== undefined) {
    next.visibility = normalizeDisputeVisibility(next.visibility);
  }
  return next;
}

async function loadDisputeRow(disputeId) {
  const result = await pool.query(
    `
    SELECT
      d.*,
      COALESCE(ia.display_name, iu.first_name || ' ' || iu.last_name) AS initiator_name,
      ia.handle AS initiator_handle,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS respondent_name,
      ra.handle AS respondent_handle,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role,
      ct.status AS hold_status,
      ct.amount_credits AS hold_amount,
      ct.type AS hold_type
    FROM disputes d
    LEFT JOIN accounts ia ON ia.account_id = d.by_account_id
    LEFT JOIN users iu ON iu.account_id = ia.account_id
    LEFT JOIN accounts ra ON ra.account_id = d.for_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = d.handled_by_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    LEFT JOIN credit_transactions ct ON ct.credit_transaction_id = d.related_credit_transaction_id
    WHERE d.dispute_id = $1
    `,
    [disputeId]
  );
  return result.rows[0] || null;
}

function buildDisputePermissions(row, staff, session = null) {
  const staffId =
    normalizeStaffId(staff?.staff_id) || normalizeStaffId(sessionStaffId(session));
  const role = staff?.role || session?.role || null;
  const assigneeId = normalizeStaffId(row?.handled_by_staff_id);
  const isAssignee = Boolean(staffId && assigneeId && staffId === assigneeId);
  const isAdmin = isAdminRole(role);
  const unassigned = !assigneeId;
  const designated = isDesignatedHandlerRole(role);
  const hasStaffSession = Boolean(staffId || staff?.staff_id || sessionStaffId(session));

  return {
    staffId: staff?.staff_id != null ? String(staff.staff_id) : sessionStaffId(session),
    role,
    isAssignee,
    isAdmin,
    canView: true,
    /** Any staff may post staff-only replies; only Support/Admin handle the case */
    canReply: hasStaffSession,
    /** Approve / status / publish — assignee, or Admin override */
    canAct: Boolean(isAdmin || (isAssignee && designated)),
    /** Admin may pick / reassign Support handlers at any time */
    canAssignOthers: Boolean(isAdmin),
    /** Claim (Support/Admin); Admin may take over an assigned dispute */
    canSelfAssign: Boolean(staffId && designated && !isAssignee && (unassigned || isAdmin)),
    canAssignMyself: Boolean(staffId && designated && !isAssignee && (unassigned || isAdmin)),
    /** Current handler or Admin may release */
    canRelease: Boolean((isAssignee && designated) || (isAdmin && Boolean(assigneeId))),
  };
}

async function updateDispute(disputeId, patch, staffSession) {
  const staff = await resolveDisputeStaffId(staffSession);
  if (!staff) {
    throw new Error('Could not match your login to a staff profile.');
  }

  const row = await loadDisputeRow(disputeId);
  if (!row) return null;

  // Accept legacy assigned_staff_id alias from older clients.
  if (patch.handled_by_staff_id === undefined && patch.assigned_staff_id !== undefined) {
    patch.handled_by_staff_id = patch.assigned_staff_id;
  }

  const perms = buildDisputePermissions(row, staff, staffSession);
  const action = String(patch.action || '').toLowerCase().trim();

  // --- Assignment actions (allowed without canAct) ---
  if (action === 'self_assign') {
    if (!perms.canSelfAssign && !perms.canAssignMyself) {
      throw new Error('Only Support Moderators or Admin can claim disputes.');
    }
    if (row.handled_by_staff_id && !perms.isAdmin) {
      throw new Error('This dispute already has a handler. They must release the case first.');
    }
    await pool.query(
      `UPDATE disputes
       SET handled_by_staff_id = $1,
           updated_at = NOW()
       WHERE dispute_id = $2`,
      [staff.staff_id, disputeId]
    );
    return getDisputeDetail(disputeId, staffSession);
  }

  if (action === 'release' || action === 'self_unassign') {
    if (!perms.canRelease && !perms.isAssignee) {
      throw new Error('Only the current handler can release this case.');
    }
    if (perms.isAdmin && !perms.isAssignee) {
      await pool.query(
        `UPDATE disputes
         SET handled_by_staff_id = NULL,
             updated_at = NOW()
         WHERE dispute_id = $1`,
        [disputeId]
      );
    } else {
      await pool.query(
        `UPDATE disputes
         SET handled_by_staff_id = NULL,
             updated_at = NOW()
         WHERE dispute_id = $1 AND handled_by_staff_id = $2`,
        [disputeId, staff.staff_id]
      );
    }
    return getDisputeDetail(disputeId, staffSession);
  }

  // Admin may designate / reassign Support handlers (override lock)
  if (patch.handled_by_staff_id !== undefined && !action) {
    const nextAssignee =
      patch.handled_by_staff_id === null || patch.handled_by_staff_id === ''
        ? null
        : patch.handled_by_staff_id;
    const nextNorm = normalizeStaffId(nextAssignee);
    const curNorm = normalizeStaffId(row.handled_by_staff_id);

    if (curNorm && nextNorm !== curNorm && !perms.canAssignOthers) {
      throw new Error(
        'This dispute already has a handler. They must release the case before it can be reassigned.'
      );
    }

    if (nextNorm !== curNorm) {
      if (!perms.canAssignOthers && !(perms.canAssignMyself && !curNorm && nextNorm === normalizeStaffId(staff.staff_id))) {
        throw new Error(
          'Use Assign myself to claim an unassigned dispute, or ask Admin to designate a handler.'
        );
      }
      if (nextNorm) {
        const target = await pool.query(`SELECT staff_id, role FROM staff WHERE staff_id::text = $1`, [
          String(nextAssignee),
        ]);
        if (!target.rows.length) throw new Error('Assignee staff not found.');
        if (!isDesignatedHandlerRole(target.rows[0].role)) {
          throw new Error('Disputes can only be assigned to Support Moderators or Admin.');
        }
      }
      await pool.query(
        `UPDATE disputes
         SET handled_by_staff_id = $1,
             updated_at = NOW()
         WHERE dispute_id = $2`,
        [nextAssignee, disputeId]
      );
    }

    const otherKeys = Object.keys(patch).filter(
      (k) => !['handled_by_staff_id', 'assigned_staff_id', 'action'].includes(k)
    );
    if (!otherKeys.length) {
      return getDisputeDetail(disputeId, staffSession);
    }
  }

  // --- Handling actions require being the assigned staff ---
  const refreshed = await loadDisputeRow(disputeId);
  const actPerms = buildDisputePermissions(refreshed, staff, staffSession);

  if (action === 'approve') {
    if (!actPerms.canAct) throw new Error('Assign yourself to this dispute before approving.');
    await pool.query(
      `UPDATE disputes
       SET status = 'open',
           visibility = TRUE,
           updated_at = NOW()
       WHERE dispute_id = $1`,
      [disputeId]
    );
    return getDisputeDetail(disputeId, staffSession);
  }

  if (action === 'dismiss') {
    if (!actPerms.canAct) throw new Error('Assign yourself to this dispute before dismissing.');
    await pool.query(
      `UPDATE disputes
       SET status = 'closed',
           visibility = TRUE,
           resolution_notes = COALESCE($1, resolution_notes),
           resolved_at = NOW(),
           updated_at = NOW()
       WHERE dispute_id = $2`,
      [patch.resolution_notes || null, disputeId]
    );
    return getDisputeDetail(disputeId, staffSession);
  }

  // Generic field updates
  if (!actPerms.canAct) {
    throw new Error('View only — assign yourself to this dispute to make changes.');
  }

  const normalized = normalizeDisputeStatusPatch(patch);
  const allowed = [
    'status',
    'priority',
    'resolution_notes',
    'sanction_type',
    'visibility',
  ];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (normalized[key] !== undefined) {
      sets.push(`${key} = $${idx}`);
      values.push(normalized[key]);
      idx += 1;
    }
  }

  // Reopening clears sanctions
  if (normalized.status && normalized.status !== 'closed') {
    if (normalized.sanction_type === undefined) {
      sets.push(`sanction_type = NULL`);
    }
    sets.push(`resolved_at = NULL`);
  }

  if (normalized.handled_by_staff_id !== undefined && (actPerms.canAct || actPerms.canAssignOthers)) {
    // Non-admin assignment changes while locked go through Release case — ignore here.
    const nextNorm = normalizeStaffId(normalized.handled_by_staff_id);
    const curNorm = normalizeStaffId(refreshed.handled_by_staff_id);
    if (curNorm && nextNorm !== curNorm && !actPerms.canAssignOthers) {
      throw new Error(
        'This dispute already has a handler. They must release the case before it can be reassigned.'
      );
    }
  }

  if (normalized.status) {
    const status = String(normalized.status).toLowerCase();
    if (status === 'open' && !Boolean(refreshed.visibility)) {
      sets.push(`visibility = TRUE`);
    }
    if (status === 'closed') {
      sets.push(`resolved_at = NOW()`);
    }
  }

  if (!sets.length) {
    return getDisputeDetail(disputeId, staffSession);
  }

  sets.push(`updated_at = NOW()`);
  values.push(disputeId);
  await pool.query(`UPDATE disputes SET ${sets.join(', ')} WHERE dispute_id = $${idx}`, values);
  return getDisputeDetail(disputeId, staffSession);
}

async function getDisputeDetail(disputeId, staffSession = null) {
  const row = await loadDisputeRow(disputeId);
  if (!row) return null;

  const staff = staffSession ? await resolveDisputeStaffId(staffSession) : null;
  const permissions = buildDisputePermissions(row, staff, staffSession);
  const assignableStaff = await fetchAssignableStaffForQueue('disputes', {
    includeStaffId: row.handled_by_staff_id,
  });

  let messages = [];
  let chatId = null;
  let chatAvailable = isMongoReady();

  try {
    chatId = await getDisputeChatId(disputeId);
    if (chatId && chatAvailable) {
      messages = await listDisputeMessages(chatId);
    }
  } catch (err) {
    console.error('Error loading dispute chat from MongoDB:', err.message);
    chatAvailable = false;
  }

  return {
    dispute: mapDisputeRow(row),
    messages,
    chatId,
    chatAvailable,
    permissions,
    assignableQueue: 'disputes',
    assignableStaff,
  };
}

async function addDisputeMessage(disputeId, body, staffSession, options = {}) {
  if (typeof options === 'boolean') {
    options = { isInternal: options };
  }
  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — cannot send dispute chat messages');
  }

  const staff = await resolveDisputeStaffId(staffSession);
  if (!staff) throw new Error('Could not match your login to a staff profile.');

  const row = await loadDisputeRow(disputeId);
  if (!row) return null;

  const perms = buildDisputePermissions(row, staff, staffSession);
  if (!perms.canReply && !perms.canAct) {
    throw new Error('You do not have permission to reply on this dispute.');
  }

  // Non-handlers may only post staff-visible replies; designated handler publishes.
  const mayPublish = Boolean(perms.canAct);
  let isInternal = Boolean(options.isInternal);
  let audience =
    options.audience ||
    (isInternal
      ? 'staff'
      : options.visibleToPublic
        ? 'public'
        : options.visibleToParties
          ? 'parties'
          : 'staff');

  if (!mayPublish) {
    audience = 'staff';
    isInternal = true;
  }

  const chatId = await ensureDisputeChat(disputeId, row);
  const audiences = mayPublish && Array.isArray(options.audiences)
    ? options.audiences.map((a) => String(a).toLowerCase())
    : ['staff'];
  await createDisputeMessage({
    chatId,
    body,
    senderId: sessionAccountId(staffSession),
    authorName: sessionDisplayName(staffSession) || 'Staff',
    authorType: 'staff',
    authorRole: 'staff',
    audience,
    audiences,
    isInternal,
  });

  await pool.query(`UPDATE disputes SET updated_at = NOW() WHERE dispute_id = $1`, [disputeId]);
  return getDisputeDetail(disputeId, staffSession);
}

async function setDisputeMessageAudience(disputeId, messageId, audience, staffSession) {
  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — cannot update dispute messages');
  }

  const staff = await resolveDisputeStaffId(staffSession);
  if (!staff) throw new Error('Could not match your login to a staff profile.');

  const row = await loadDisputeRow(disputeId);
  if (!row) return null;

  const perms = buildDisputePermissions(row, staff, staffSession);
  if (!perms.canAct) {
    throw new Error('Assign yourself to this dispute before publishing messages.');
  }

  const chatId = await getDisputeChatId(disputeId);
  if (!chatId) throw new Error('Dispute chat not found.');

  await updateDisputeMessageAudience(chatId, messageId, audience);
  await pool.query(`UPDATE disputes SET updated_at = NOW() WHERE dispute_id = $1`, [disputeId]);
  return getDisputeDetail(disputeId, staffSession);
}

async function updateReport(reportId, patch, staffSession = null) {
  const action = String(patch?.action || '').toLowerCase().trim();
  if (action === 'self_assign') {
    const staff = await resolveDisputeStaffId(staffSession);
    if (!staff) throw new Error('Could not match your login to a staff profile.');

    const fresh = await pool.query(
      `SELECT assigned_staff_id FROM reports WHERE report_id = $1 AND deleted_at IS NULL`,
      [reportId]
    );
    if (!fresh.rows.length) return null;
    const perms = buildReportPermissions(fresh.rows[0], staff, staffSession);
    if (!perms.canAssignMyself && !perms.canSelfAssign) {
      throw new Error('You cannot assign this report to yourself.');
    }
    if (fresh.rows[0].assigned_staff_id && !perms.isAdmin) {
      throw new Error('This report already has a handler. They must release the case first.');
    }

    await pool.query(
      `UPDATE reports
       SET assigned_staff_id = $1, updated_at = NOW()
       WHERE report_id = $2 AND deleted_at IS NULL`,
      [staff.staff_id, reportId]
    );
    return getReportDetail(reportId, staffSession);
  }

  if (action === 'release' || action === 'self_unassign') {
    const staff = await resolveDisputeStaffId(staffSession);
    if (!staff) throw new Error('Could not match your login to a staff profile.');

    const fresh = await pool.query(
      `SELECT assigned_staff_id FROM reports WHERE report_id = $1 AND deleted_at IS NULL`,
      [reportId]
    );
    if (!fresh.rows.length) return null;
    const perms = buildReportPermissions(fresh.rows[0], staff, staffSession);
    if (!perms.canRelease && !perms.isAssignee) {
      throw new Error('Only the current handler can release this case.');
    }

    if (perms.isAdmin && !perms.isAssignee) {
      await pool.query(
        `UPDATE reports
         SET assigned_staff_id = NULL, updated_at = NOW()
         WHERE report_id = $1 AND deleted_at IS NULL`,
        [reportId]
      );
    } else {
      await pool.query(
        `UPDATE reports
         SET assigned_staff_id = NULL, updated_at = NOW()
         WHERE report_id = $1 AND deleted_at IS NULL AND assigned_staff_id = $2`,
        [reportId, staff.staff_id]
      );
    }
    return getReportDetail(reportId, staffSession);
  }

  const fresh = await pool.query(
    `SELECT assigned_staff_id FROM reports WHERE report_id = $1 AND deleted_at IS NULL`,
    [reportId]
  );
  if (!fresh.rows.length) return null;
  const currentAssignee = fresh.rows[0].assigned_staff_id;
  const staffForAssign = staffSession ? await resolveDisputeStaffId(staffSession) : null;
  const reportPerms = buildReportPermissions(fresh.rows[0], staffForAssign, staffSession);

  if (patch.assigned_staff_id !== undefined) {
    const nextNorm = normalizeStaffId(
      patch.assigned_staff_id === null || patch.assigned_staff_id === ''
        ? null
        : patch.assigned_staff_id
    );
    const curNorm = normalizeStaffId(currentAssignee);
    if (curNorm && nextNorm !== curNorm && !reportPerms.canAssignOthers) {
      throw new Error(
        'This report already has a handler. They must release the case before it can be reassigned.'
      );
    }
    if (nextNorm && (!curNorm || reportPerms.canAssignOthers)) {
      const typeRow = await pool.query(
        `SELECT target_type FROM reports WHERE report_id = $1 AND deleted_at IS NULL`,
        [reportId]
      );
      const queueKey = inferReportAssignableQueue(typeRow.rows[0]?.target_type);
      await assertStaffAssignableToQueue(patch.assigned_staff_id, queueKey);
    }
  }

  const allowed = ['status', 'priority', 'assigned_staff_id'];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (patch[key] !== undefined) {
      // Skip no-op assignee writes when locked
      if (key === 'assigned_staff_id' && currentAssignee) {
        const nextNorm = normalizeStaffId(
          patch.assigned_staff_id === null || patch.assigned_staff_id === ''
            ? null
            : patch.assigned_staff_id
        );
        if (nextNorm === normalizeStaffId(currentAssignee)) continue;
      }
      sets.push(`${key} = $${idx}`);
      values.push(patch[key]);
      idx += 1;
    }
  }

  if (!sets.length) return getReportDetail(reportId, staffSession);

  if (patch.status === 'resolved') sets.push(`resolved_at = NOW()`);
  sets.push(`updated_at = NOW()`);
  values.push(reportId);

  await pool.query(`UPDATE reports SET ${sets.join(', ')} WHERE report_id = $${idx}`, values);

  return getReportDetail(reportId, staffSession);
}

function buildReportPermissions(row, staff, session = null) {
  const staffId =
    normalizeStaffId(staff?.staff_id) || normalizeStaffId(sessionStaffId(session));
  const role = staff?.role || session?.role || null;
  const assigneeId = normalizeStaffId(row?.assigned_staff_id);
  const isAssignee = Boolean(staffId && assigneeId && staffId === assigneeId);
  const isAdmin = isAdminRole(role);
  const unassigned = !assigneeId;
  const designated = isQueueHandlerRole(role);

  return {
    staffId: staff?.staff_id != null ? String(staff.staff_id) : sessionStaffId(session),
    role,
    isAssignee,
    isAdmin,
    canView: true,
    canAct: Boolean(isAdmin || isAssignee || (unassigned && designated)),
    canAssignOthers: Boolean(isAdmin),
    canSelfAssign: Boolean(staffId && designated && !isAssignee && (unassigned || isAdmin)),
    canAssignMyself: Boolean(staffId && designated && !isAssignee && (unassigned || isAdmin)),
    canRelease: Boolean(isAssignee || (isAdmin && Boolean(assigneeId))),
  };
}

async function getReportDetail(reportId, staffSession = null, options = {}) {
  const reportResult = await pool.query(
    `
    SELECT
      r.*,
      COALESCE(fa.display_name, fu.first_name || ' ' || fu.last_name, r.target_label) AS target_name,
      fa.handle AS target_handle,
      COALESCE(repa.display_name, repu.first_name || ' ' || repu.last_name) AS reporter_name,
      repa.handle AS reporter_handle,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role
    FROM reports r
    LEFT JOIN accounts fa ON fa.account_id = r.for_account_id
    LEFT JOIN users fu ON fu.account_id = fa.account_id
    LEFT JOIN accounts repa ON repa.account_id = r.by_account_id
    LEFT JOIN users repu ON repu.account_id = repa.account_id
    LEFT JOIN staff st ON st.staff_id = r.assigned_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    WHERE r.report_id = $1 AND r.deleted_at IS NULL
    `,
    [reportId]
  );
  if (!reportResult.rows.length) return null;

  const row = reportResult.rows[0];
  const staff = staffSession ? await resolveDisputeStaffId(staffSession) : null;
  const queueKey = options.assignableQueue || inferReportAssignableQueue(row.target_type);
  const assignableStaff = await fetchAssignableStaffForQueue(queueKey, {
    includeStaffId: row.assigned_staff_id,
  });

  return {
    report: mapReportRow({
      ...row,
      reporter_name: row.reporter_name,
      reporter_handle: row.reporter_handle,
      assignee_name: row.assignee_name,
    }),
    permissions: buildReportPermissions(row, staff, staffSession),
    assignableQueue: normalizeQueueKey(queueKey),
    assignableStaff,
  };
}

module.exports = {
  getTicketsOverview,
  getTicketDetail,
  getTicketCatalog,
  createSupportTicket,
  nextTicketNumber,
  nextDisputeNumber,
  updateTicket,
  addTicketMessage,
  updateDispute,
  getDisputeDetail,
  addDisputeMessage,
  setDisputeMessageAudience,
  fetchDisputesList,
  fetchReportsList,
  updateReport,
  getReportDetail,
  fetchStaffWorkload,
};
