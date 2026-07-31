const { pool } = require('../lib/database');
const { ObjectId } = require('mongodb');
const { getMongoClient } = require('../lib/mongodb');
const {
  createInboxRepositories,
  createMessageRepositories,
  getConversationByConvoId,
} = require('./InboxRepositories');
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
  normalizeTicketType,
  normalizeTicketStatus,
  normalizeTicketPriority,
  isClosedStatus,
} = require('../lib/ticketEnums');
const { mapTicketRow } = require('./ModeratorSharedRepositories');

/** Prefer DB catalog (migration 109); fall back to ticketEnums.js */
async function getTicketCatalog() {
  try {
    const [types, statuses, priorities] = await Promise.all([
      pool.query(`
        SELECT type_label, queue_role, sort_order, description
        FROM ticket_type_catalog
        WHERE is_active = TRUE
        ORDER BY sort_order, type_label
      `),
      pool.query(`
        SELECT status_label, sort_order, is_closed
        FROM ticket_status_catalog
        WHERE is_active = TRUE
        ORDER BY sort_order, status_label
      `),
      pool.query(`
        SELECT priority_label, sort_order
        FROM ticket_priority_catalog
        WHERE is_active = TRUE
        ORDER BY sort_order, priority_label
      `),
    ]);

    const typeRows = types.rows;
    const escalateByRole = {};
    for (const row of typeRows) {
      const role = row.queue_role;
      if (!escalateByRole[role]) escalateByRole[role] = [];
      escalateByRole[role].push(row.type_label);
    }
    // Admin can escalate to any type
    escalateByRole.Admin = typeRows.map((r) => r.type_label);
    escalateByRole.Administrator = escalateByRole.Admin;

    return {
      types: typeRows.map((r) => r.type_label),
      typeDetails: typeRows.map((r) => ({
        label: r.type_label,
        queueRole: r.queue_role,
        description: r.description || null,
      })),
      statuses: statuses.rows.map((r) => r.status_label),
      priorities: priorities.rows.map((r) => r.priority_label),
      escalateByRole,
      escalateRoles: [
        'Support Moderator',
        'Marketplace Moderator',
        'Forum Moderator',
        'Jobs N Gigs Moderator',
        'Admin',
      ],
    };
  } catch (err) {
    console.warn('ticket catalog unavailable, using enums:', err.message);
    return {
      types: [...TICKET_TYPES],
      typeDetails: TICKET_TYPES.map((label) => ({
        label,
        queueRole: Object.entries(ROLE_TO_TICKET_TYPES).find(([, list]) => list.includes(label))?.[0] || 'Support Moderator',
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
      related_report_id, related_dispute_id,
      message_count, last_message_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8,
      $9, $10,
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
      input?.relatedReportId || null,
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
  const closedStatuses = ['resolved', 'closed', 'sanctioned', 'dismissed', 'withdrawn'];
  return {
    id: row.dispute_id,
    number: row.dispute_number,
    title: row.title,
    reason: row.reason,
    // Keep status/priority as DB snake_case for filters/forms; format in UI.
    status: String(row.status || 'open').toLowerCase(),
    priority: String(row.priority || 'medium').toLowerCase(),
    visibility: String(row.visibility || 'pending').toLowerCase(),
    initiator: {
      accountId: row.initiator_account_id,
      name: row.initiator_name || 'Unknown',
      username: row.initiator_handle || '—',
    },
    respondent: {
      accountId: row.respondent_account_id,
      name: row.respondent_name || 'Unknown',
      username: row.respondent_handle || '—',
    },
    relatedEntityType: row.related_entity_type ? displayLabel(row.related_entity_type) : null,
    relatedEntityId: row.related_entity_id,
    assignee: row.assigned_staff_id
      ? { staffId: row.assigned_staff_id, name: row.assignee_name || 'Unassigned', role: row.assignee_role }
      : null,
    creditAmount: Number(row.credit_amount_involved || 0),
    approvedAt: row.approved_at || null,
    approvedByStaffId: row.approved_by_staff_id || null,
    outcome: row.outcome || null,
    sanctionType: row.sanction_type || null,
    sanctionNotes: row.sanction_notes || null,
    relatedCreditTransactionId: row.related_credit_transaction_id || null,
    creditHold: row.hold_status
      ? {
          transactionId: row.related_credit_transaction_id,
          status: row.hold_status,
          amount: Number(row.hold_amount ?? row.credit_amount_involved ?? 0),
          type: row.hold_type || 'Dispute Hold',
        }
      : null,
    takeoverRequestedByStaffId: row.takeover_requested_by_staff_id || null,
    takeoverRequestedAt: row.takeover_requested_at || null,
    takeoverRequestNote: row.takeover_request_note || null,
    takeoverRequester: row.takeover_requester_staff_id
      ? {
          staffId: row.takeover_requester_staff_id,
          name: row.takeover_requester_name || 'Staff',
          role: row.takeover_requester_role || null,
        }
      : row.takeover_requested_by_staff_id
        ? { staffId: row.takeover_requested_by_staff_id, name: 'Staff', role: null }
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

async function getTicketsOverview() {
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
        COUNT(*) FILTER (WHERE LOWER(status) = 'sanctioned')::int AS sanctioned,
        COUNT(*) FILTER (WHERE LOWER(status) = 'dismissed')::int AS dismissed,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('resolved', 'closed', 'withdrawn'))::int AS resolved,
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
        { label: 'Open', value: Number(dc.open_count) - Number(dc.pending_review || 0) - Number(dc.awaiting_response || 0), color: '#f87171' },
        { label: 'Awaiting Response', value: Number(dc.awaiting_response || 0), color: '#f59e0b' },
        { label: 'Under Review', value: Number(dc.under_review), color: '#fbbf24' },
        { label: 'Sanctioned', value: Number(dc.sanctioned || 0), color: '#a78bfa' },
        { label: 'Dismissed', value: Number(dc.dismissed || 0), color: '#94a3b8' },
        { label: 'Resolved', value: Number(dc.resolved) - Number(dc.sanctioned || 0) - Number(dc.dismissed || 0), color: '#34d399' },
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
    alerts: buildTicketAlerts(tc, dc, rc),
    dataSources: {
      tables: [
        'tickets',
        'ticket_chats',
        'ticket_type_catalog',
        'ticket_status_catalog',
        'ticket_priority_catalog',
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
      ct.type AS hold_type,
      tr.staff_id AS takeover_requester_staff_id,
      COALESCE(tra.display_name, tr.first_name || ' ' || tr.last_name) AS takeover_requester_name,
      tr.role AS takeover_requester_role
    FROM disputes d
    LEFT JOIN accounts ia ON ia.account_id = d.initiator_account_id
    LEFT JOIN users iu ON iu.account_id = ia.account_id
    LEFT JOIN accounts ra ON ra.account_id = d.respondent_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = d.assigned_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    LEFT JOIN credit_transactions ct ON ct.credit_transaction_id = d.related_credit_transaction_id
    LEFT JOIN staff tr ON tr.staff_id = d.takeover_requested_by_staff_id
    LEFT JOIN accounts tra ON tra.account_id = tr.account_id
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
        WHERE d.assigned_staff_id = s.staff_id
          AND LOWER(d.status) NOT IN ('resolved', 'closed', 'sanctioned', 'dismissed', 'withdrawn')) AS open_disputes,
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
  if (existing) return existing;

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
    conversation_type: 'group',
    ticket_id: String(ticketId),
    support_ticket_id: String(ticketId),
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

function mapMongoTicketMessage(m) {
  return {
    id: String(m._id),
    authorType: m.author_type || (m.is_internal ? 'staff' : 'user'),
    authorName: m.author_name || 'Unknown',
    body: m.message_content || m.body || '',
    isInternal: Boolean(m.is_internal),
    createdAt: m.created_at || m.createdAt || null,
  };
}

async function getTicketDetail(ticketId) {
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

  const staffResult = await pool.query(`
    SELECT s.staff_id, s.role, COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name
    FROM staff s INNER JOIN accounts a ON a.account_id = s.account_id
    ORDER BY s.role
  `);

  let messages = [];
  let chatId = null;
  let chatAvailable = Boolean(getMongoClient());

  try {
    chatId = await getTicketChatId(ticketId);
    if (chatId && chatAvailable) {
      const { Messages } = await getConversationByConvoId(chatId);
      messages = (Messages || [])
        .filter((m) => !m.is_deleted && !m.deleted_at)
        .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
        .map(mapMongoTicketMessage);
    }
  } catch (err) {
    console.error('Error loading ticket chat from MongoDB:', err.message);
    chatAvailable = false;
  }

  const row = ticketResult.rows[0];
  const catalog = await getTicketCatalog();

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
    assignableStaff: staffResult.rows.map((s) => ({
      staffId: s.staff_id,
      name: s.name,
      role: s.role,
    })),
  };
}

async function updateTicket(ticketId, patch, staffSession) {
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

    sets.push(`escalated_to_role = $${idx}`);
    values.push(patch.assigned_role);
    idx += 1;

    const escalatedBy = sessionStaffId(staffSession);
    if (escalatedBy) {
      sets.push(`escalated_by_staff_id = $${idx}`);
      values.push(escalatedBy);
      idx += 1;
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
    sets.push(`handled_by_staff_id = $${idx}`);
    values.push(patch.handled_by_staff_id === null || patch.handled_by_staff_id === ''
      ? null
      : patch.handled_by_staff_id);
    idx += 1;
  }

  if (!sets.length && !patch.note) return getTicketDetail(ticketId);

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
    return getTicketDetail(ticketId);
  }

  return getTicketDetail(ticketId);
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

  await createMessageRepositories({
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
    }
  }

  return getTicketDetail(ticketId);
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

function isDesignatedHandlerRole(role) {
  return isAdminRole(role) || isSupportRole(role);
}

const DISPUTE_CLOSED = ['resolved', 'closed', 'sanctioned', 'dismissed', 'withdrawn'];

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
      ct.type AS hold_type,
      tr.staff_id AS takeover_requester_staff_id,
      COALESCE(tra.display_name, tr.first_name || ' ' || tr.last_name) AS takeover_requester_name,
      tr.role AS takeover_requester_role
    FROM disputes d
    LEFT JOIN accounts ia ON ia.account_id = d.initiator_account_id
    LEFT JOIN users iu ON iu.account_id = ia.account_id
    LEFT JOIN accounts ra ON ra.account_id = d.respondent_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = d.assigned_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    LEFT JOIN credit_transactions ct ON ct.credit_transaction_id = d.related_credit_transaction_id
    LEFT JOIN staff tr ON tr.staff_id = d.takeover_requested_by_staff_id
    LEFT JOIN accounts tra ON tra.account_id = tr.account_id
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
  const assigneeId = normalizeStaffId(row?.assigned_staff_id);
  const requesterId = normalizeStaffId(row?.takeover_requested_by_staff_id);
  const isAssignee = Boolean(staffId && assigneeId && staffId === assigneeId);
  const isAdmin = isAdminRole(role);
  const unassigned = !assigneeId;
  const designated = isDesignatedHandlerRole(role);

  return {
    staffId: staff?.staff_id != null ? String(staff.staff_id) : sessionStaffId(session),
    role,
    isAssignee,
    isAdmin,
    canView: true,
    /** Handle approve / status / outcome / messages / publish */
    canAct: isAssignee,
    /** Admin may assign Support Moderators without being the handler */
    canAssignOthers: isAdmin,
    /** Claim an unassigned dispute */
    canSelfAssign: Boolean(staffId && unassigned && designated),
    /**
     * Assign myself: claim if unassigned, or Admin force-takeover if someone else owns it.
     */
    canAssignMyself: Boolean(
      staffId && designated && !isAssignee && (unassigned || isAdmin)
    ),
    /** Ask to take over when someone else owns it */
    canRequestTakeover: Boolean(staffId && assigneeId && !isAssignee && designated),
    /** Admin force-claim when someone else owns it */
    canForceTakeover: Boolean(staffId && isAdmin && assigneeId && !isAssignee),
    /** Current assignee (or admin) can grant a pending takeover request */
    canAcceptTakeover: Boolean(
      staffId &&
        requesterId &&
        ((isAssignee && requesterId !== staffId) || (isAdmin && requesterId !== assigneeId))
    ),
    canCancelTakeoverRequest: Boolean(staffId && requesterId && staffId === requesterId),
  };
}

async function updateDispute(disputeId, patch, staffSession) {
  const staff = await resolveDisputeStaffId(staffSession);
  if (!staff) {
    throw new Error('Could not match your login to a staff profile.');
  }

  const row = await loadDisputeRow(disputeId);
  if (!row) return null;

  const perms = buildDisputePermissions(row, staff, staffSession);
  const action = String(patch.action || '').toLowerCase().trim();

  // --- Assignment / takeover actions (allowed without canAct) ---
  if (action === 'self_assign') {
    if (!perms.canSelfAssign && !(perms.canAssignMyself && perms.canForceTakeover)) {
      throw new Error('You can only claim an unassigned dispute as Admin or Support Moderator.');
    }
    // Admin "Assign myself" on an already-assigned dispute = force takeover
    if (!perms.canSelfAssign && perms.canForceTakeover) {
      await pool.query(
        `UPDATE disputes
         SET assigned_staff_id = $1,
             handled_by_staff_id = COALESCE(handled_by_staff_id, $1),
             takeover_requested_by_staff_id = NULL,
             takeover_requested_at = NULL,
             takeover_request_note = NULL,
             updated_at = NOW()
         WHERE dispute_id = $2`,
        [staff.staff_id, disputeId]
      );
      return getDisputeDetail(disputeId, staffSession);
    }
    await pool.query(
      `UPDATE disputes
       SET assigned_staff_id = $1,
           takeover_requested_by_staff_id = NULL,
           takeover_requested_at = NULL,
           takeover_request_note = NULL,
           updated_at = NOW()
       WHERE dispute_id = $2`,
      [staff.staff_id, disputeId]
    );
    return getDisputeDetail(disputeId, staffSession);
  }

  if (action === 'request_takeover') {
    if (!perms.canRequestTakeover) {
      throw new Error('You cannot request takeover for this dispute.');
    }
    await pool.query(
      `UPDATE disputes
       SET takeover_requested_by_staff_id = $1,
           takeover_requested_at = NOW(),
           takeover_request_note = $2,
           updated_at = NOW()
       WHERE dispute_id = $3`,
      [staff.staff_id, patch.takeover_request_note || patch.note || null, disputeId]
    );
    return getDisputeDetail(disputeId, staffSession);
  }

  if (action === 'cancel_takeover_request') {
    if (!perms.canCancelTakeoverRequest) {
      throw new Error('Only the requester can cancel this takeover request.');
    }
    await pool.query(
      `UPDATE disputes
       SET takeover_requested_by_staff_id = NULL,
           takeover_requested_at = NULL,
           takeover_request_note = NULL,
           updated_at = NOW()
       WHERE dispute_id = $1`,
      [disputeId]
    );
    return getDisputeDetail(disputeId, staffSession);
  }

  if (action === 'takeover') {
    // Admin force-takeover onto self
    if (!perms.canForceTakeover && !(perms.isAdmin && !row.assigned_staff_id)) {
      if (perms.canSelfAssign) {
        // fall through handled above; if assigned to other, must be admin
      }
      if (!perms.isAdmin) {
        throw new Error('Only Admin can force-takeover a dispute. Request takeover instead.');
      }
      if (perms.isAssignee) {
        throw new Error('You already own this dispute.');
      }
    }
    await pool.query(
      `UPDATE disputes
       SET assigned_staff_id = $1,
           handled_by_staff_id = COALESCE(handled_by_staff_id, $1),
           takeover_requested_by_staff_id = NULL,
           takeover_requested_at = NULL,
           takeover_request_note = NULL,
           updated_at = NOW()
       WHERE dispute_id = $2`,
      [staff.staff_id, disputeId]
    );
    return getDisputeDetail(disputeId, staffSession);
  }

  if (action === 'accept_takeover') {
    if (!perms.canAcceptTakeover) {
      throw new Error('You cannot accept this takeover request.');
    }
    const toStaffId = row.takeover_requested_by_staff_id;
    await pool.query(
      `UPDATE disputes
       SET assigned_staff_id = $1,
           handled_by_staff_id = COALESCE(handled_by_staff_id, $1),
           takeover_requested_by_staff_id = NULL,
           takeover_requested_at = NULL,
           takeover_request_note = NULL,
           updated_at = NOW()
       WHERE dispute_id = $2`,
      [toStaffId, disputeId]
    );
    return getDisputeDetail(disputeId, staffSession);
  }

  // Admin assigns a Support Moderator (allowed without being assignee)
  if (patch.assigned_staff_id !== undefined && !action) {
    if (!perms.canAssignOthers && !perms.canAct) {
      throw new Error('Only Admin can assign disputes to Support Moderators, or the assignee can update assignment.');
    }
    const nextAssignee = patch.assigned_staff_id;
    if (nextAssignee) {
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
       SET assigned_staff_id = $1,
           takeover_requested_by_staff_id = NULL,
           takeover_requested_at = NULL,
           takeover_request_note = NULL,
           updated_at = NOW()
       WHERE dispute_id = $2`,
      [nextAssignee || null, disputeId]
    );
    // If only assigning, return early unless other fields present
    const otherKeys = Object.keys(patch).filter(
      (k) => !['assigned_staff_id', 'action'].includes(k)
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
           visibility = 'public',
           approved_at = COALESCE(approved_at, NOW()),
           approved_by_staff_id = COALESCE(approved_by_staff_id, $1),
           updated_at = NOW()
       WHERE dispute_id = $2`,
      [staff.staff_id, disputeId]
    );
    return getDisputeDetail(disputeId, staffSession);
  }

  if (action === 'dismiss') {
    if (!actPerms.canAct) throw new Error('Assign yourself to this dispute before dismissing.');
    await pool.query(
      `UPDATE disputes
       SET status = 'dismissed',
           outcome = 'dismissed',
           visibility = COALESCE(NULLIF(visibility, 'pending'), 'public'),
           approved_at = COALESCE(approved_at, NOW()),
           approved_by_staff_id = COALESCE(approved_by_staff_id, $1),
           resolution_notes = COALESCE($2, resolution_notes),
           resolved_at = NOW(),
           updated_at = NOW()
       WHERE dispute_id = $3`,
      [staff.staff_id, patch.resolution_notes || null, disputeId]
    );
    return getDisputeDetail(disputeId, staffSession);
  }

  // Generic field updates
  if (!actPerms.canAct) {
    throw new Error('View only — assign yourself to this dispute to make changes.');
  }

  const allowed = [
    'status',
    'priority',
    'resolution_notes',
    'outcome',
    'sanction_type',
    'sanction_notes',
    'visibility',
  ];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (patch[key] !== undefined) {
      sets.push(`${key} = $${idx}`);
      values.push(patch[key]);
      idx += 1;
    }
  }

  if (patch.assigned_staff_id !== undefined && actPerms.canAct) {
    // Assignee can leave unassigned only if admin; otherwise keep
    if (actPerms.isAdmin || patch.assigned_staff_id) {
      sets.push(`assigned_staff_id = $${idx}`);
      values.push(patch.assigned_staff_id || null);
      idx += 1;
    }
  }

  if (patch.status) {
    const status = String(patch.status).toLowerCase();
    if (status === 'open' && String(refreshed.visibility || '') === 'pending') {
      sets.push(`visibility = 'public'`);
      sets.push(`approved_at = COALESCE(approved_at, NOW())`);
      sets.push(`approved_by_staff_id = COALESCE(approved_by_staff_id, $${idx})`);
      values.push(staff.staff_id);
      idx += 1;
    }
    if (DISPUTE_CLOSED.includes(status)) {
      sets.push(`resolved_at = NOW()`);
      if (patch.outcome === undefined && !refreshed.outcome) {
        sets.push(`outcome = $${idx}`);
        values.push(status === 'closed' ? 'resolved' : status);
        idx += 1;
      }
    }
  }

  if (patch.outcome) {
    const outcome = String(patch.outcome).toLowerCase();
    if (DISPUTE_CLOSED.includes(outcome) && patch.status === undefined) {
      sets.push(`status = $${idx}`);
      values.push(outcome);
      idx += 1;
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

  const staffResult = await pool.query(`
    SELECT s.staff_id, s.role, COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name
    FROM staff s INNER JOIN accounts a ON a.account_id = s.account_id
    WHERE LOWER(s.role) IN ('support moderator', 'admin', 'administrator')
    ORDER BY s.role, name
  `);

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
    assignableStaff: staffResult.rows.map((s) => ({
      staffId: s.staff_id,
      name: s.name,
      role: s.role,
    })),
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
  if (!perms.canAct) {
    throw new Error('Assign yourself to this dispute before posting messages.');
  }

  const isInternal = Boolean(options.isInternal);
  const audience =
    options.audience ||
    (isInternal
      ? 'staff'
      : options.visibleToPublic
        ? 'public'
        : options.visibleToParties
          ? 'parties'
          : 'staff');

  const chatId = await ensureDisputeChat(disputeId, row);
  const audiences = Array.isArray(options.audiences)
    ? options.audiences.map((a) => String(a).toLowerCase())
    : null;
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

async function updateReport(reportId, patch) {
  const allowed = ['status', 'priority', 'assigned_staff_id'];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (patch[key] !== undefined) {
      sets.push(`${key} = $${idx}`);
      values.push(patch[key]);
      idx += 1;
    }
  }

  if (!sets.length) return null;

  if (patch.status === 'resolved') sets.push(`resolved_at = NOW()`);
  sets.push(`updated_at = NOW()`);
  values.push(reportId);

  await pool.query(`UPDATE reports SET ${sets.join(', ')} WHERE report_id = $${idx}`, values);

  const list = await fetchReportsList();
  return list.find((r) => String(r.id) === String(reportId)) || null;
}

async function getReportDetail(reportId) {
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

  const staffResult = await pool.query(`
    SELECT s.staff_id, s.role, COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name
    FROM staff s INNER JOIN accounts a ON a.account_id = s.account_id
    WHERE a.deleted_at IS NULL
    ORDER BY s.role
  `);

  return {
    report: mapReportRow({
      ...reportResult.rows[0],
      reporter_name: reportResult.rows[0].reporter_name,
      reporter_handle: reportResult.rows[0].reporter_handle,
      assignee_name: reportResult.rows[0].assignee_name,
    }),
    assignableStaff: staffResult.rows.map((s) => ({
      staffId: s.staff_id,
      name: s.name,
      role: s.role,
    })),
  };
}

module.exports = {
  getTicketsOverview,
  getTicketDetail,
  getTicketCatalog,
  createSupportTicket,
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
};
