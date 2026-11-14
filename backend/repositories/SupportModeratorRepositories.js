const { pool } = require('../lib/Database');
const {
  normalizeTicketType,
  normalizeTicketStatus,
  normalizeTicketPriority,
  SUPPORT_TYPES,
  SUPPORT_GROUPS,
} = require('../lib/TicketEnums');
const { SUPPORT_REPORT_TYPES } = require('../lib/ReportEnums');
const {
  fetchScopedReports,
  scopedReportCounts,
  scopedDisputeCounts,
  toCategoryChart,
  ticketStatusChart,
  displayLabel,
  mapTicketRow,
  mapDisputeRow,
} = require('./ModeratorSharedRepositories');

const SUPPORT_QUEUE_ROLE = 'support moderator';

function sqlStringList(values) {
  return values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ');
}

/** Tickets owned by Admin (assignee role or escalated-to Admin) are hidden from Support. */
const EXCLUDE_ADMIN_TICKETS_SQL = `
  LOWER(COALESCE(t.escalated_to_role, '')) NOT IN ('admin', 'administrator')
  AND (
    t.handled_by_staff_id IS NULL
    OR t.handled_by_staff_id NOT IN (
      SELECT s.staff_id FROM staff s WHERE LOWER(s.role::text) IN ('admin', 'administrator')
    )
  )
`;

/**
 * The Support queue: support-catalog ticket types, plus anything another desk explicitly
 * escalated to Support Moderator. Forum, marketplace and jobs types belong to their own desks —
 * a misfiled ticket leaves this queue the moment it is moved.
 */
const SUPPORT_SCOPE_SQL = `
  (
    t.type IN (${sqlStringList(SUPPORT_TYPES)})
    OR LOWER(COALESCE(t.escalated_to_role, '')) = '${SUPPORT_QUEUE_ROLE}'
  )
`;

const SUPPORT_TICKET_WHERE = `
  t.deleted_at IS NULL
  AND ${SUPPORT_SCOPE_SQL}
  AND ${EXCLUDE_ADMIN_TICKETS_SQL}
`;

const OPEN_TICKET_SQL = `t.status NOT IN ('Resolved', 'Closed')`;

function isAdminTicketPayload(ticket) {
  if (!ticket) return false;
  const escalated = String(ticket.escalatedToRole || '').toLowerCase();
  if (escalated === 'admin' || escalated === 'administrator') return true;
  const role = String(ticket.assignee?.role || '').toLowerCase();
  return role === 'admin' || role === 'administrator';
}

/** Mirrors SUPPORT_SCOPE_SQL for a mapped ticket payload, so detail routes enforce the queue too. */
function isSupportScopedTicket(ticket) {
  if (!ticket) return false;
  if (String(ticket.escalatedToRole || '').toLowerCase() === SUPPORT_QUEUE_ROLE) return true;
  const type = normalizeTicketType(ticket.type || ticket.category, null);
  return Boolean(type) && SUPPORT_TYPES.includes(type);
}

function hoursFromSeconds(value) {
  if (value === null || value === undefined) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return null;
  return Math.round((seconds / 3600) * 10) / 10;
}

async function getSupportTickets({ status, search, type, category, priority } = {}) {
  const where = [SUPPORT_TICKET_WHERE];
  const params = [];

  if (status && status !== 'all') {
    params.push(normalizeTicketStatus(status));
    where.push(`t.status = $${params.length}`);
  }
  const typeFilter = type || category;
  if (typeFilter && typeFilter !== 'all') {
    params.push(normalizeTicketType(typeFilter));
    where.push(`t.type = $${params.length}`);
  }
  if (priority && priority !== 'all') {
    params.push(normalizeTicketPriority(priority));
    where.push(`t.priority = $${params.length}`);
  }
  if (search) {
    params.push(`%${String(search).toLowerCase()}%`);
    where.push(`(
      LOWER(t.reason) LIKE $${params.length}
      OR LOWER(COALESCE(t.ticket_number, '')) LIKE $${params.length}
      OR LOWER(COALESCE(t.type, '')) LIKE $${params.length}
      OR LOWER(COALESCE(ra.handle, '')) LIKE $${params.length}
      OR LOWER(COALESCE(ra.display_name, '')) LIKE $${params.length}
      OR LOWER(COALESCE(ru.email_address, '')) LIKE $${params.length}
      OR LOWER(COALESCE(ru.user_id::text, '')) LIKE $${params.length}
      OR LOWER(COALESCE(t.account_id::text, '')) LIKE $${params.length}
      OR LOWER(COALESCE(sa.display_name, '')) LIKE $${params.length}
      OR LOWER(COALESCE(ea.display_name, '')) LIKE $${params.length}
      OR t.ticket_id::text LIKE $${params.length}
    )`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const result = await pool.query(
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
    ${whereSql}
    ORDER BY
      CASE t.priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END,
      t.updated_at DESC
    LIMIT 200
    `,
    params
  );
  return result.rows.map(mapTicketRow);
}

async function getSupportTicketCounts() {
  const result = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE t.status = 'Open')::int AS open_count,
      COUNT(*) FILTER (WHERE t.status = 'In Progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE t.status = 'Escalated to Dev')::int AS escalated_dev,
      COUNT(*) FILTER (WHERE t.status IN ('Resolved', 'Closed'))::int AS resolved,
      COUNT(*) FILTER (
        WHERE t.priority = 'High'
          AND t.status NOT IN ('Resolved', 'Closed')
      )::int AS high_priority,
      COUNT(*) FILTER (
        WHERE t.handled_by_staff_id IS NULL
          AND t.status NOT IN ('Resolved', 'Closed')
      )::int AS unassigned,
      COUNT(*) FILTER (
        WHERE t.status NOT IN ('Resolved', 'Closed')
          AND LOWER(COALESCE(t.last_message_author_type, '')) = 'user'
      )::int AS awaiting_reply,
      COUNT(*) FILTER (
        WHERE t.status NOT IN ('Resolved', 'Closed')
          AND (t.escalated_to_role IS NOT NULL OR t.escalated_by_staff_id IS NOT NULL)
      )::int AS escalated
    FROM tickets t
    WHERE ${SUPPORT_TICKET_WHERE}
  `);
  return result.rows[0];
}

async function getSupportTicketCategoryBreakdown() {
  const result = await pool.query(`
    SELECT t.type AS category, t.type, COUNT(*)::int AS count
    FROM tickets t
    WHERE ${SUPPORT_TICKET_WHERE}
    GROUP BY t.type
    ORDER BY count DESC
  `);
  return result.rows;
}

/** Open load per support catalog group (Account, Billing, Video Editing Platform, …). */
async function getSupportGroupBreakdown() {
  const result = await pool.query(`
    SELECT
      t.type,
      COUNT(*) FILTER (WHERE ${OPEN_TICKET_SQL})::int AS open_count,
      COUNT(*)::int AS total
    FROM tickets t
    WHERE ${SUPPORT_TICKET_WHERE}
    GROUP BY t.type
  `);

  const byType = new Map(
    result.rows.map((row) => [
      String(row.type || ''),
      { open: Number(row.open_count || 0), total: Number(row.total || 0) },
    ])
  );

  const groups = SUPPORT_GROUPS.map((group) => {
    const types = group.types.map(([label]) => label);
    return types.reduce(
      (acc, label) => {
        const row = byType.get(label);
        if (row) {
          acc.open += row.open;
          acc.total += row.total;
        }
        return acc;
      },
      { label: group.label, open: 0, total: 0, types }
    );
  });

  // Anything escalated into Support that still carries another desk's type.
  const inScopeTypes = new Set(SUPPORT_TYPES);
  const foreign = [...byType.entries()]
    .filter(([label]) => label && !inScopeTypes.has(label))
    .reduce(
      (acc, [, row]) => {
        acc.open += row.open;
        acc.total += row.total;
        return acc;
      },
      { label: 'Escalated to Support', open: 0, total: 0, types: [] }
    );
  if (foreign.total > 0) groups.push(foreign);

  return groups;
}

function reportScopeTargets(scope) {
  return scope === 'all' ? null : [...SUPPORT_REPORT_TYPES];
}

async function getSupportReports({ status, scope = 'support' } = {}) {
  const targetTypesIn = reportScopeTargets(scope);
  return fetchScopedReports({ status, ...(targetTypesIn ? { targetTypesIn } : {}) });
}

// Support desk sees the full dispute queue.
async function getSupportDisputes({ status, search, entityType } = {}) {
  const where = ['d.deleted_at IS NULL'];
  const params = [];

  if (status && status !== 'all') {
    params.push(String(status).toLowerCase());
    where.push(`LOWER(d.status::text) = $${params.length}`);
  }
  if (entityType && entityType !== 'all') {
    params.push(String(entityType).toLowerCase());
    where.push(`LOWER(d.type::text) = $${params.length}`);
  }
  if (search) {
    params.push(`%${String(search).toLowerCase()}%`);
    where.push(`(
      LOWER(COALESCE(d.title, '')) LIKE $${params.length}
      OR LOWER(COALESCE(d.dispute_number, '')) LIKE $${params.length}
      OR LOWER(COALESCE(d.description, '')) LIKE $${params.length}
      OR LOWER(COALESCE(ia.handle, '')) LIKE $${params.length}
      OR LOWER(COALESCE(ra.handle, '')) LIKE $${params.length}
      OR d.dispute_id::text LIKE $${params.length}
    )`);
  }

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
    WHERE ${where.join(' AND ')}
    ORDER BY
      CASE LOWER(d.priority::text) WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      COALESCE(d.opened_at, d.created_at) DESC
    LIMIT 200
    `,
    params
  );
  return result.rows.map(mapDisputeRow);
}

// Chronological ticket log: ticket updates + last-message activity + disputes.
async function getTicketLog() {
  const result = await pool.query(
    `
    (
      SELECT
        'ticket' AS type,
        t.ticket_number AS ref,
        t.reason AS label,
        t.status::text AS status,
        t.updated_at AS at
      FROM tickets t
      WHERE ${SUPPORT_TICKET_WHERE}
      ORDER BY t.updated_at DESC
      LIMIT 14
    )
    UNION ALL
    (
      SELECT
        'message' AS type,
        t.ticket_number AS ref,
        'Ticket activity on ' || t.ticket_number AS label,
        t.status::text AS status,
        t.last_message_at AS at
      FROM tickets t
      WHERE t.last_message_at IS NOT NULL
        AND ${SUPPORT_TICKET_WHERE}
      ORDER BY t.last_message_at DESC
      LIMIT 10
    )
    UNION ALL
    (
      SELECT
        'dispute' AS type,
        d.dispute_number AS ref,
        d.title AS label,
        d.status::text AS status,
        d.updated_at AS at
      FROM disputes d
      WHERE d.deleted_at IS NULL
      ORDER BY d.updated_at DESC
      LIMIT 8
    )
    ORDER BY at DESC
    LIMIT 20
    `
  );
  return result.rows.map((r, i) => ({
    id: `log-${i}`,
    type: displayLabel(r.type),
    ref: r.ref,
    label: r.label,
    status: displayLabel(r.status),
    at: r.at,
  }));
}

/**
 * The Support desk's own handlers. Only they (and Admin, who is excluded from this console)
 * can hold a support-scoped ticket, so this doubles as the assignee picker for the desk.
 */
async function getSupportStaffWorkload() {
  const result = await pool.query(`
    SELECT
      s.staff_id,
      s.role,
      COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name,
      (SELECT COUNT(*)::int FROM tickets t
        WHERE t.handled_by_staff_id = s.staff_id
          AND ${OPEN_TICKET_SQL}
          AND ${SUPPORT_TICKET_WHERE}) AS open_tickets,
      (SELECT COUNT(*)::int FROM reports r
        WHERE r.assigned_staff_id = s.staff_id
          AND LOWER(r.status) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned')
          AND r.deleted_at IS NULL) AS open_reports,
      (SELECT COUNT(*)::int FROM disputes d
        WHERE d.handled_by_staff_id = s.staff_id
          AND d.deleted_at IS NULL
          AND LOWER(d.status::text) NOT IN ('resolved', 'closed', 'sanctioned', 'dismissed', 'withdrawn')) AS open_disputes
    FROM staff s
    INNER JOIN accounts a ON a.account_id = s.account_id
    WHERE LOWER(s.role::text) = '${SUPPORT_QUEUE_ROLE}'
      AND a.deleted_at IS NULL
    ORDER BY open_tickets DESC, open_disputes DESC
  `);
  return result.rows.map((r) => ({
    staffId: r.staff_id,
    name: r.name,
    role: r.role,
    openTickets: Number(r.open_tickets),
    openReports: Number(r.open_reports),
    openDisputes: Number(r.open_disputes),
    totalOpen: Number(r.open_tickets) + Number(r.open_reports) + Number(r.open_disputes),
  }));
}

/**
 * Response health for the desk header: backlog age, first-reply breaches and throughput.
 * "Breached" matches the overdue rule the ticket rows use (no staff reply in 24h, or 72h old).
 */
async function getSupportQueueHealth() {
  const result = await pool.query(`
    SELECT
      MIN(t.created_at) FILTER (WHERE ${OPEN_TICKET_SQL}) AS oldest_open_at,
      MIN(t.created_at) FILTER (
        WHERE ${OPEN_TICKET_SQL} AND t.handled_by_staff_id IS NULL
      ) AS oldest_unassigned_at,
      COUNT(*) FILTER (
        WHERE ${OPEN_TICKET_SQL} AND t.first_staff_reply_at IS NULL
      )::int AS awaiting_first_reply,
      COUNT(*) FILTER (
        WHERE ${OPEN_TICKET_SQL}
          AND t.first_staff_reply_at IS NULL
          AND t.created_at < NOW() - INTERVAL '24 hours'
      )::int AS first_reply_breached,
      COUNT(*) FILTER (
        WHERE ${OPEN_TICKET_SQL} AND t.created_at < NOW() - INTERVAL '72 hours'
      )::int AS open_over_72h,
      COUNT(*) FILTER (
        WHERE ${OPEN_TICKET_SQL} AND t.created_at < NOW() - INTERVAL '7 days'
      )::int AS open_over_7d,
      COUNT(*) FILTER (WHERE t.resolved_at >= NOW() - INTERVAL '24 hours')::int AS closed_last_24h,
      COUNT(*) FILTER (WHERE t.resolved_at >= NOW() - INTERVAL '7 days')::int AS closed_last_7d,
      AVG(EXTRACT(EPOCH FROM (t.first_staff_reply_at - t.created_at))) FILTER (
        WHERE t.first_staff_reply_at IS NOT NULL
          AND t.created_at >= NOW() - INTERVAL '30 days'
      ) AS avg_first_reply_seconds,
      AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))) FILTER (
        WHERE t.resolved_at >= NOW() - INTERVAL '30 days'
      ) AS avg_resolution_seconds,
      AVG(t.satisfaction_score) FILTER (WHERE t.satisfaction_score IS NOT NULL) AS avg_satisfaction,
      COUNT(*) FILTER (WHERE t.satisfaction_score IS NOT NULL)::int AS rated_tickets
    FROM tickets t
    WHERE ${SUPPORT_TICKET_WHERE}
  `);

  const row = result.rows[0] || {};
  const satisfaction = row.avg_satisfaction === null ? null : Number(row.avg_satisfaction);
  return {
    oldestOpenAt: row.oldest_open_at || null,
    oldestUnassignedAt: row.oldest_unassigned_at || null,
    awaitingFirstReply: Number(row.awaiting_first_reply || 0),
    firstReplyBreached: Number(row.first_reply_breached || 0),
    openOver72h: Number(row.open_over_72h || 0),
    openOver7d: Number(row.open_over_7d || 0),
    closedLast24h: Number(row.closed_last_24h || 0),
    closedLast7d: Number(row.closed_last_7d || 0),
    avgFirstReplyHours: hoursFromSeconds(row.avg_first_reply_seconds),
    avgResolutionHours: hoursFromSeconds(row.avg_resolution_seconds),
    avgSatisfaction:
      satisfaction === null || Number.isNaN(satisfaction)
        ? null
        : Math.round(satisfaction * 10) / 10,
    ratedTickets: Number(row.rated_tickets || 0),
  };
}

/** Report counters + target breakdown for the dashboard, inside or outside the support scope. */
async function getSupportReportBreakdown(targetTypesIn) {
  const scoped = Array.isArray(targetTypesIn) && targetTypesIn.length > 0;
  const scopeSql = scoped ? `AND LOWER(COALESCE(target_type, type)) = ANY($1)` : '';
  const params = scoped ? [targetTypesIn] : [];

  const [counts, byTarget] = await Promise.all([
    pool.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('open', 'pending'))::int AS open_status,
        COUNT(*) FILTER (
          WHERE LOWER(status) IN ('in_review', 'in review', 'in_progress', 'in progress')
        )::int AS in_review,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('resolved', 'closed', 'sanctioned'))::int AS resolved,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('dismissed', 'denied', 'archived'))::int AS dismissed,
        COUNT(*) FILTER (
          WHERE LOWER(status) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned')
            AND assigned_staff_id IS NULL
        )::int AS unassigned,
        COUNT(*) FILTER (
          WHERE LOWER(priority) = 'high'
            AND LOWER(status) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned')
        )::int AS high_priority,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS filed_last_7d
      FROM reports
      WHERE deleted_at IS NULL
        ${scopeSql}
      `,
      params
    ),
    pool.query(
      `
      SELECT LOWER(COALESCE(target_type, type)) AS target_type, COUNT(*)::int AS count
      FROM reports
      WHERE deleted_at IS NULL
        ${scopeSql}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 10
      `,
      params
    ),
  ]);

  const c = counts.rows[0] || {};
  return {
    counts: {
      total: Number(c.total || 0),
      openStatus: Number(c.open_status || 0),
      inReview: Number(c.in_review || 0),
      resolved: Number(c.resolved || 0),
      dismissed: Number(c.dismissed || 0),
      unassigned: Number(c.unassigned || 0),
      highPriority: Number(c.high_priority || 0),
      filedLast7d: Number(c.filed_last_7d || 0),
      openCount: Number(c.open_status || 0) + Number(c.in_review || 0),
    },
    byTarget: byTarget.rows.map((row) => ({
      label: displayLabel(row.target_type || 'other'),
      value: Number(row.count),
    })),
  };
}

/** Dispute pressure. Support owns the whole dispute queue, so this is not type-scoped. */
async function getSupportDisputeHealth() {
  const result = await pool.query(`
    SELECT
      MIN(COALESCE(d.opened_at, d.created_at)) FILTER (
        WHERE LOWER(d.status::text) IN ('open', 'under_review')
      ) AS oldest_open_at,
      COUNT(*) FILTER (
        WHERE LOWER(d.status::text) IN ('open', 'under_review')
          AND d.handled_by_staff_id IS NULL
      )::int AS unassigned,
      COUNT(*) FILTER (
        WHERE LOWER(d.status::text) IN ('open', 'under_review')
          AND LOWER(d.priority::text) = 'high'
      )::int AS high_priority,
      COUNT(*) FILTER (WHERE d.resolved_at >= NOW() - INTERVAL '7 days')::int AS resolved_last_7d
    FROM disputes d
    WHERE d.deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    oldestOpenAt: row.oldest_open_at || null,
    unassigned: Number(row.unassigned || 0),
    highPriority: Number(row.high_priority || 0),
    resolvedLast7d: Number(row.resolved_last_7d || 0),
  };
}

/** What the signed-in moderator is personally holding, across all three queues. */
async function getSupportMyQueue(staffId) {
  if (staffId == null || staffId === '') return null;
  const result = await pool.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM tickets t
        WHERE t.handled_by_staff_id::text = $1
          AND ${OPEN_TICKET_SQL}
          AND ${SUPPORT_TICKET_WHERE}) AS open_tickets,
      (SELECT COUNT(*)::int FROM tickets t
        WHERE t.handled_by_staff_id::text = $1
          AND ${OPEN_TICKET_SQL}
          AND LOWER(COALESCE(t.last_message_author_type, '')) = 'user'
          AND ${SUPPORT_TICKET_WHERE}) AS awaiting_reply,
      (SELECT COUNT(*)::int FROM tickets t
        WHERE t.handled_by_staff_id::text = $1
          AND ${OPEN_TICKET_SQL}
          AND t.priority = 'High'
          AND ${SUPPORT_TICKET_WHERE}) AS high_priority,
      (SELECT COUNT(*)::int FROM tickets t
        WHERE t.handled_by_staff_id::text = $1
          AND t.resolved_at >= NOW() - INTERVAL '7 days'
          AND ${SUPPORT_TICKET_WHERE}) AS closed_last_7d,
      (SELECT COUNT(*)::int FROM disputes d
        WHERE d.handled_by_staff_id::text = $1
          AND d.deleted_at IS NULL
          AND LOWER(d.status::text) NOT IN ('resolved', 'closed', 'sanctioned', 'dismissed', 'withdrawn')) AS open_disputes,
      (SELECT COUNT(*)::int FROM reports r
        WHERE r.assigned_staff_id::text = $1
          AND r.deleted_at IS NULL
          AND LOWER(r.status) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned')) AS open_reports
    `,
    [String(staffId)]
  );
  const row = result.rows[0] || {};
  return {
    openTickets: Number(row.open_tickets || 0),
    awaitingReply: Number(row.awaiting_reply || 0),
    highPriority: Number(row.high_priority || 0),
    closedLast7d: Number(row.closed_last_7d || 0),
    openDisputes: Number(row.open_disputes || 0),
    openReports: Number(row.open_reports || 0),
  };
}

function buildAlerts(tc, rc, dc, health = {}) {
  const alerts = [];
  const openTickets = Number(tc.open_count) + Number(tc.in_progress) + Number(tc.escalated_dev);

  if (Number(health.firstReplyBreached) > 0) {
    alerts.push({
      id: 'first-reply-breached',
      message: `${health.firstReplyBreached} ticket(s) have waited over 24h with no staff reply.`,
      severity: 'error',
      action: { tab: 'ticket-management', ticketFilters: { flag: 'overdue' } },
    });
  }
  if (Number(tc.unassigned) > 0) {
    alerts.push({
      id: 'unassigned',
      message: `${tc.unassigned} support ticket(s) have no assignee.`,
      severity: 'warning',
      action: { tab: 'ticket-management', ticketFilters: { assignee: 'unassigned', flag: 'open_only' } },
    });
  }
  if (Number(tc.high_priority) > 0) {
    alerts.push({
      id: 'high-priority',
      message: `${tc.high_priority} high-priority ticket(s) need attention.`,
      severity: 'error',
      action: { tab: 'ticket-management', ticketFilters: { priority: 'High', flag: 'open_only' } },
    });
  }
  if (Number(tc.awaiting_reply) > 0) {
    alerts.push({
      id: 'awaiting-reply',
      message: `${tc.awaiting_reply} ticket(s) awaiting a staff reply.`,
      severity: 'warning',
      action: { tab: 'ticket-management', ticketFilters: { flag: 'awaiting' } },
    });
  }
  if (Number(tc.escalated) > 0) {
    alerts.push({
      id: 'escalated',
      message: `${tc.escalated} escalated ticket(s) need a queue handoff.`,
      severity: 'error',
      action: { tab: 'ticket-management', ticketFilters: { flag: 'escalated' } },
    });
  }
  if (Number(dc.open_count) > 0) {
    alerts.push({
      id: 'open-disputes',
      message: `${dc.open_count} dispute(s) open — ${Number(dc.credits_at_risk).toLocaleString()} credits at risk.`,
      severity: 'error',
      action: { tab: 'disputes' },
    });
  }
  if (Number(rc.open_count) > 0) {
    alerts.push({
      id: 'open-reports',
      message: `${rc.open_count} member report(s) awaiting triage.`,
      severity: 'info',
      action: { tab: 'reports' },
    });
  }
  if (
    openTickets > 0 &&
    !alerts.some((a) => a.id === 'high-priority' || a.id === 'unassigned' || a.id === 'awaiting-reply')
  ) {
    alerts.push({
      id: 'open-tickets',
      message: `${openTickets} support ticket(s) still open.`,
      severity: 'info',
      action: { tab: 'ticket-management', ticketFilters: { flag: 'open_only' } },
    });
  }
  if (!alerts.length) {
    alerts.push({ id: 'clear', message: 'Support desk is clear — no urgent queues.', severity: 'success' });
  }
  return alerts;
}

async function resolveCurrentStaffId(session) {
  if (!session) return null;
  const direct = session.staff_id ?? session.staffId ?? null;
  if (direct != null && direct !== '') {
    const existing = await pool.query(
      `SELECT staff_id FROM staff WHERE staff_id::text = $1 LIMIT 1`,
      [String(direct)]
    );
    if (existing.rows[0]) return existing.rows[0].staff_id;
  }
  const accountId = session.account_id ?? session.accountId ?? null;
  if (accountId != null && accountId !== '') {
    const byAccount = await pool.query(
      `SELECT staff_id FROM staff WHERE account_id::text = $1 LIMIT 1`,
      [String(accountId)]
    );
    if (byAccount.rows[0]) return byAccount.rows[0].staff_id;
  }
  return null;
}

async function getSupportOverview(session = null) {
  const supportReportTargets = [...SUPPORT_REPORT_TYPES];
  const [
    ticketCounts,
    categoryRows,
    groupBreakdown,
    queueHealth,
    reportCounts,
    scopedReportTotals,
    reportBreakdown,
    disputeCounts,
    disputeHealth,
    tickets,
    disputes,
    reports,
    staffWorkload,
    ticketLog,
    extraStats,
    priorityMix,
    disputeMix,
    ticketTrend,
    currentStaff,
  ] = await Promise.all([
    getSupportTicketCounts(),
    getSupportTicketCategoryBreakdown(),
    getSupportGroupBreakdown(),
    getSupportQueueHealth(),
    scopedReportCounts({}),
    scopedReportCounts({ targetTypesIn: supportReportTargets }),
    getSupportReportBreakdown(supportReportTargets),
    scopedDisputeCounts({}),
    getSupportDisputeHealth(),
    getSupportTickets(),
    getSupportDisputes(),
    getSupportReports(),
    getSupportStaffWorkload(),
    getTicketLog(),
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM tickets t
          WHERE ${SUPPORT_TICKET_WHERE}
            AND t.created_at >= NOW() - INTERVAL '7 days') AS tickets_this_week,
        (SELECT COALESCE(SUM(t.message_count), 0)::int FROM tickets t
          WHERE ${SUPPORT_TICKET_WHERE}
            AND t.last_message_at >= NOW() - INTERVAL '7 days') AS messages_this_week,
        (SELECT COALESCE(SUM(t.message_count), 0)::int FROM tickets t
          WHERE ${SUPPORT_TICKET_WHERE}) AS total_messages,
        (SELECT COUNT(*)::int FROM violations v
          WHERE v.deleted_at IS NULL
            AND LOWER(v.status) = 'active'
            AND (v.expires_at IS NULL OR v.expires_at > NOW())) AS active_violations,
        (SELECT COUNT(*)::int FROM restrictions r
          WHERE r.ends_at IS NULL OR r.ends_at > NOW()) AS active_restrictions
    `),
    pool.query(`
      SELECT t.priority, COUNT(*)::int AS count
      FROM tickets t
      WHERE ${SUPPORT_TICKET_WHERE}
        AND ${OPEN_TICKET_SQL}
      GROUP BY t.priority
      ORDER BY count DESC
    `),
    pool.query(`
      SELECT LOWER(status::text) AS status, COUNT(*)::int AS count
      FROM disputes
      WHERE deleted_at IS NULL
      GROUP BY LOWER(status::text)
      ORDER BY count DESC
    `),
    pool.query(`
      SELECT day::date AS day,
        (SELECT COUNT(*)::int FROM tickets t
          WHERE ${SUPPORT_TICKET_WHERE}
            AND t.created_at::date = day::date) AS tickets,
        (SELECT COUNT(*)::int FROM tickets t
          WHERE ${SUPPORT_TICKET_WHERE}
            AND t.resolved_at::date = day::date) AS closed,
        (SELECT COALESCE(SUM(t.message_count), 0)::int FROM tickets t
          WHERE ${SUPPORT_TICKET_WHERE}
            AND t.last_message_at::date = day::date) AS messages
      FROM generate_series(NOW() - INTERVAL '13 days', NOW(), INTERVAL '1 day') day
      ORDER BY day
    `),
    resolveCurrentStaffId(session),
  ]);

  const myQueue = await getSupportMyQueue(currentStaff);

  const tc = ticketCounts;
  const rc = reportCounts;
  const dc = disputeCounts;
  const es = extraStats.rows[0];
  const rb = reportBreakdown.counts;

  const priorityColors = { High: '#f87171', Medium: '#fbbf24', Low: '#60a5fa' };
  const disputeColors = {
    open: '#f87171',
    under_review: '#fbbf24',
    resolved: '#34d399',
    closed: '#a78bfa',
  };

  const priorityChart = priorityMix.rows.map((r) => ({
    label: r.priority || 'Medium',
    value: Number(r.count),
    color: priorityColors[r.priority] || '#71717a',
  }));

  const reportStatusMix = [
    { label: 'Open', value: rb.openStatus, color: '#f87171' },
    { label: 'In review', value: rb.inReview, color: '#fbbf24' },
    { label: 'Resolved', value: rb.resolved, color: '#34d399' },
    { label: 'Dismissed', value: rb.dismissed, color: '#a1a1aa' },
  ].filter((segment) => segment.value > 0);

  return {
    lastUpdated: new Date().toISOString(),
    scope: {
      queue: 'support',
      label: 'Support',
      ticketTypes: [...SUPPORT_TYPES],
      reportTargets: supportReportTargets,
    },
    summary: {
      openTickets: Number(tc.open_count) + Number(tc.in_progress) + Number(tc.escalated_dev),
      totalTickets: Number(tc.total),
      unassignedTickets: Number(tc.unassigned),
      highPriorityTickets: Number(tc.high_priority),
      inProgressTickets: Number(tc.in_progress),
      escalatedTickets: Number(tc.escalated),
      resolvedTickets: Number(tc.resolved),
      openReports: Number(rc.open_count),
      totalReports: Number(rc.total),
      openScopedReports: Number(scopedReportTotals.open_count),
      totalScopedReports: Number(scopedReportTotals.total),
      unassignedReports: rb.unassigned,
      highPriorityReports: rb.highPriority,
      resolvedReports: rb.resolved,
      reportsThisWeek: rb.filedLast7d,
      openDisputes: Number(dc.open_count),
      totalDisputes: Number(dc.total),
      creditsAtRisk: Number(dc.credits_at_risk),
      awaitingReplyTickets: Number(tc.awaiting_reply),
      slaCompliancePercent: tc.total > 0 ? Math.round((Number(tc.resolved) / Number(tc.total)) * 100) : 100,
      ticketsThisWeek: Number(es.tickets_this_week),
      messagesThisWeek: Number(es.messages_this_week),
      totalMessages: Number(es.total_messages),
      activeViolations: Number(es.active_violations),
      activeRestrictions: Number(es.active_restrictions),
    },
    queueHealth,
    disputeHealth,
    myQueue,
    groupLoad: groupBreakdown,
    charts: {
      ticketStatusMix: ticketStatusChart(tc),
      ticketCategories: toCategoryChart(categoryRows),
      ticketTypes: toCategoryChart(categoryRows),
      priorityMix: priorityChart,
      openByPriority: priorityChart,
      supportGroups: groupBreakdown.map((group, i) => ({
        label: group.label,
        value: group.open,
        color: ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6'][i % 7],
      })),
      reportStatusMix,
      reportTargets: reportBreakdown.byTarget,
      disputeStatusMix: disputeMix.rows.map((r) => ({
        label: displayLabel(String(r.status || 'open')),
        value: Number(r.count),
        color: disputeColors[String(r.status || '').toLowerCase()] || '#71717a',
      })),
      activityTrend: ticketTrend.rows.map((r) => ({
        day: r.day,
        tickets: Number(r.tickets),
        closed: Number(r.closed),
        messages: Number(r.messages),
      })),
    },
    tickets,
    recentTickets: tickets.slice(0, 8),
    recentDisputes: disputes.slice(0, 6),
    recentReports: reports.slice(0, 6),
    ticketLog,
    recentActivity: ticketLog,
    staffWorkload,
    currentStaffId: currentStaff,
    alerts: buildAlerts(tc, rc, dc, queueHealth),
    dataSources: {
      tables: [
        'tickets',
        'ticket_chats',
        'inbox/messages (mongo — ticket threads)',
        'disputes',
        'dispute_chats → mongo ObjectId',
        'reports',
        'violations',
        'restrictions',
      ],
      persisted: true,
    },
  };
}

module.exports = {
  getSupportOverview,
  getSupportTickets,
  getSupportReports,
  getSupportDisputes,
  getSupportQueueHealth,
  getTicketLog,
  isAdminTicketPayload,
  isSupportScopedTicket,
  SUPPORT_REPORT_TYPES,
};
