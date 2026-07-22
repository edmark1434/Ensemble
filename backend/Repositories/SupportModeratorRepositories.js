const { pool } = require('../lib/database');
const {
  fetchScopedReports,
  scopedTicketCounts,
  scopedTicketCategoryBreakdown,
  scopedReportCounts,
  scopedDisputeCounts,
  toCategoryChart,
  ticketStatusChart,
  normalizeStatus,
  mapTicketRow,
  mapDisputeRow,
} = require('./ModeratorSharedRepositories');

// Support desk owns general support: everything not routed to a specialist queue.
const SPECIALIST_CATEGORIES = ['marketplace', 'community', 'forum', 'jobs', 'gigs', 'job', 'gig'];
const SUPPORT_SCOPE = { categoriesNotIn: SPECIALIST_CATEGORIES };

async function getSupportTickets({ status, search, category, priority } = {}) {
  const where = [];
  const params = [];

  // Support desk owns general support: everything not routed to a specialist queue.
  params.push(SPECIALIST_CATEGORIES);
  where.push(`NOT (LOWER(t.category) = ANY($${params.length}))`);

  if (status && status !== 'all') {
    params.push(String(status).toLowerCase());
    where.push(`LOWER(t.status) = $${params.length}`);
  }
  if (category && category !== 'all') {
    params.push(String(category).toLowerCase());
    where.push(`LOWER(t.category) = $${params.length}`);
  }
  if (priority && priority !== 'all') {
    params.push(String(priority).toLowerCase());
    where.push(`LOWER(t.priority) = $${params.length}`);
  }
  if (search) {
    params.push(`%${String(search).toLowerCase()}%`);
    where.push(`(
      LOWER(t.subject) LIKE $${params.length}
      OR LOWER(t.ticket_number) LIKE $${params.length}
      OR LOWER(COALESCE(ra.handle, '')) LIKE $${params.length}
      OR LOWER(COALESCE(ra.display_name, '')) LIKE $${params.length}
      OR t.ticket_id::text LIKE $${params.length}
    )`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await pool.query(
    `
    SELECT
      t.*,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS requester_name,
      ra.handle AS requester_handle,
      ru.email_address AS requester_email,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role,
      (SELECT COUNT(*)::int FROM ticket_messages tm WHERE tm.ticket_id = t.ticket_id) AS message_count,
      (SELECT MAX(tm.created_at) FROM ticket_messages tm WHERE tm.ticket_id = t.ticket_id) AS last_message_at
    FROM support_tickets t
    LEFT JOIN accounts ra ON ra.account_id = t.requester_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = t.assigned_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    ${whereSql}
    ORDER BY
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      t.updated_at DESC
    LIMIT 100
    `,
    params
  );
  return result.rows.map(mapTicketRow);
}

async function getSupportReports({ status } = {}) {
  return fetchScopedReports({ status });
}

// Support desk sees the full dispute queue.
async function getSupportDisputes({ status, search, entityType } = {}) {
  const where = ['d.deleted_at IS NULL'];
  const params = [];

  if (status && status !== 'all') {
    params.push(String(status).toLowerCase());
    where.push(`LOWER(d.status) = $${params.length}`);
  }
  if (entityType && entityType !== 'all') {
    params.push(String(entityType).toLowerCase());
    where.push(`LOWER(COALESCE(d.related_entity_type, '')) = $${params.length}`);
  }
  if (search) {
    params.push(`%${String(search).toLowerCase()}%`);
    where.push(`(
      LOWER(COALESCE(d.title, '')) LIKE $${params.length}
      OR LOWER(COALESCE(d.dispute_number, '')) LIKE $${params.length}
      OR LOWER(COALESCE(d.reason, '')) LIKE $${params.length}
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
      st.role AS assignee_role
    FROM disputes d
    LEFT JOIN accounts ia ON ia.account_id = d.initiator_account_id
    LEFT JOIN users iu ON iu.account_id = ia.account_id
    LEFT JOIN accounts ra ON ra.account_id = d.respondent_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = d.assigned_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    WHERE ${where.join(' AND ')}
    ORDER BY
      CASE LOWER(d.priority) WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      COALESCE(d.opened_at, d.created_at) DESC
    LIMIT 100
    `,
    params
  );
  return result.rows.map(mapDisputeRow);
}

// Chronological ticket log: status changes surface via updated_at, plus every message.
async function getTicketLog() {
  const result = await pool.query(`
    (
      SELECT
        'ticket' AS type,
        t.ticket_number AS ref,
        t.subject AS label,
        t.status,
        t.updated_at AS at
      FROM support_tickets t
      ORDER BY t.updated_at DESC
      LIMIT 14
    )
    UNION ALL
    (
      SELECT
        'message' AS type,
        t.ticket_number AS ref,
        COALESCE(tm.author_name, 'Someone') || ' replied on ' || t.ticket_number AS label,
        t.status,
        tm.created_at AS at
      FROM ticket_messages tm
      INNER JOIN support_tickets t ON t.ticket_id = tm.ticket_id
      ORDER BY tm.created_at DESC
      LIMIT 10
    )
    UNION ALL
    (
      SELECT
        'dispute' AS type,
        d.dispute_number AS ref,
        d.title AS label,
        d.status,
        d.updated_at AS at
      FROM disputes d
      ORDER BY d.updated_at DESC
      LIMIT 8
    )
    ORDER BY at DESC
    LIMIT 20
  `);
  return result.rows.map((r, i) => ({
    id: `log-${i}`,
    type: r.type,
    ref: r.ref,
    label: r.label,
    status: normalizeStatus(r.status),
    at: r.at,
  }));
}

async function getChatQueue() {
  // Live chat channel tickets (channel != 'web') sit in the chat queue.
  const result = await pool.query(
    `
    SELECT
      t.*,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS requester_name,
      ra.handle AS requester_handle,
      ru.email_address AS requester_email,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role,
      (SELECT COUNT(*)::int FROM ticket_messages tm WHERE tm.ticket_id = t.ticket_id) AS message_count,
      (SELECT MAX(tm.created_at) FROM ticket_messages tm WHERE tm.ticket_id = t.ticket_id) AS last_message_at
    FROM support_tickets t
    LEFT JOIN accounts ra ON ra.account_id = t.requester_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = t.assigned_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    WHERE LOWER(t.channel) IN ('chat', 'live', 'messenger')
    ORDER BY t.updated_at DESC
    LIMIT 50
    `
  );
  return result.rows.map(mapTicketRow);
}

async function getSupportStaffWorkload() {
  const result = await pool.query(`
    SELECT
      s.staff_id,
      s.role,
      COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name,
      (SELECT COUNT(*)::int FROM support_tickets t
        WHERE t.assigned_staff_id = s.staff_id AND LOWER(t.status) NOT IN ('resolved', 'closed')) AS open_tickets,
      (SELECT COUNT(*)::int FROM reports r
        WHERE r.assigned_staff_id = s.staff_id AND LOWER(r.status) NOT IN ('resolved', 'closed') AND r.deleted_at IS NULL) AS open_reports
    FROM staff s
    INNER JOIN accounts a ON a.account_id = s.account_id
    WHERE s.role IN ('Support Moderator', 'Admin')
    ORDER BY open_tickets DESC
  `);
  return result.rows.map((r) => ({
    staffId: r.staff_id,
    name: r.name,
    role: r.role,
    openTickets: Number(r.open_tickets),
    openReports: Number(r.open_reports),
    totalOpen: Number(r.open_tickets) + Number(r.open_reports),
  }));
}

function buildAlerts(tc, rc, dc, chatOpen) {
  const alerts = [];
  if (Number(tc.unassigned) > 0) {
    alerts.push({ id: 'unassigned', message: `${tc.unassigned} support ticket(s) have no assignee.`, severity: 'warning' });
  }
  if (Number(tc.high_priority) > 0) {
    alerts.push({ id: 'high-priority', message: `${tc.high_priority} high-priority ticket(s) need attention.`, severity: 'error' });
  }
  if (Number(dc.open_count) > 0) {
    alerts.push({
      id: 'open-disputes',
      message: `${dc.open_count} dispute(s) open — ${Number(dc.credits_at_risk).toLocaleString()} credits at risk.`,
      severity: 'error',
    });
  }
  if (Number(rc.open_count) > 0) {
    alerts.push({ id: 'open-reports', message: `${rc.open_count} user report(s) awaiting triage.`, severity: 'info' });
  }
  if (chatOpen > 0) {
    alerts.push({ id: 'chat-queue', message: `${chatOpen} live chat conversation(s) waiting.`, severity: 'warning' });
  }
  if (!alerts.length) {
    alerts.push({ id: 'clear', message: 'Support desk is clear — no urgent queues.', severity: 'success' });
  }
  return alerts;
}

async function getSupportOverview() {
  const [
    ticketCounts,
    categoryRows,
    reportCounts,
    disputeCounts,
    tickets,
    disputes,
    reports,
    staffWorkload,
    chatQueue,
    ticketLog,
    extraStats,
    priorityMix,
    disputeMix,
    ticketTrend,
  ] = await Promise.all([
    scopedTicketCounts(SUPPORT_SCOPE),
    scopedTicketCategoryBreakdown(SUPPORT_SCOPE),
    scopedReportCounts({}),
    scopedDisputeCounts({}),
    getSupportTickets(),
    getSupportDisputes(),
    getSupportReports(),
    getSupportStaffWorkload(),
    getChatQueue(),
    getTicketLog(),
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM support_tickets t
          WHERE NOT (LOWER(t.category) = ANY($1))
            AND t.created_at >= NOW() - INTERVAL '7 days') AS tickets_this_week,
        (SELECT COUNT(*)::int FROM ticket_messages tm
          INNER JOIN support_tickets t ON t.ticket_id = tm.ticket_id
          WHERE NOT (LOWER(t.category) = ANY($1))
            AND tm.created_at >= NOW() - INTERVAL '7 days') AS messages_this_week,
        (SELECT COUNT(*)::int FROM ticket_messages tm
          INNER JOIN support_tickets t ON t.ticket_id = tm.ticket_id
          WHERE NOT (LOWER(t.category) = ANY($1))) AS total_messages,
        (SELECT COUNT(*)::int FROM violations v
          WHERE v.deleted_at IS NULL AND LOWER(v.status) = 'active') AS active_violations,
        (SELECT COUNT(*)::int FROM restrictions r
          WHERE r.ends_at IS NULL OR r.ends_at > NOW()) AS active_restrictions
    `, [SPECIALIST_CATEGORIES]),
    pool.query(`
      SELECT LOWER(priority) AS priority, COUNT(*)::int AS count
      FROM support_tickets t
      WHERE NOT (LOWER(t.category) = ANY($1))
      GROUP BY LOWER(priority)
      ORDER BY count DESC
    `, [SPECIALIST_CATEGORIES]),
    pool.query(`
      SELECT LOWER(status) AS status, COUNT(*)::int AS count
      FROM disputes
      WHERE deleted_at IS NULL
      GROUP BY LOWER(status)
      ORDER BY count DESC
    `),
    pool.query(`
      SELECT day::date AS day,
        (SELECT COUNT(*)::int FROM support_tickets t
          WHERE NOT (LOWER(t.category) = ANY($1))
            AND t.created_at::date = day::date) AS tickets,
        (SELECT COUNT(*)::int FROM ticket_messages tm
          INNER JOIN support_tickets t ON t.ticket_id = tm.ticket_id
          WHERE NOT (LOWER(t.category) = ANY($1))
            AND tm.created_at::date = day::date) AS messages
      FROM generate_series(NOW() - INTERVAL '13 days', NOW(), INTERVAL '1 day') day
      ORDER BY day
    `, [SPECIALIST_CATEGORIES]),
  ]);

  const tc = ticketCounts;
  const rc = reportCounts;
  const dc = disputeCounts;
  const es = extraStats.rows[0];
  const chatOpen = chatQueue.filter((t) => !['resolved', 'closed'].includes(t.status)).length;

  const priorityColors = { high: '#f87171', medium: '#fbbf24', low: '#60a5fa' };
  const disputeColors = {
    open: '#f87171',
    under_review: '#fbbf24',
    resolved: '#34d399',
    closed: '#a78bfa',
  };

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      openTickets: Number(tc.open_count) + Number(tc.in_progress),
      totalTickets: Number(tc.total),
      unassignedTickets: Number(tc.unassigned),
      highPriorityTickets: Number(tc.high_priority),
      resolvedTickets: Number(tc.resolved),
      openReports: Number(rc.open_count),
      totalReports: Number(rc.total),
      openDisputes: Number(dc.open_count),
      totalDisputes: Number(dc.total),
      creditsAtRisk: Number(dc.credits_at_risk),
      chatWaiting: chatOpen,
      slaCompliancePercent: tc.total > 0 ? Math.round((Number(tc.resolved) / Number(tc.total)) * 100) : 100,
      ticketsThisWeek: Number(es.tickets_this_week),
      messagesThisWeek: Number(es.messages_this_week),
      totalMessages: Number(es.total_messages),
      activeViolations: Number(es.active_violations),
      activeRestrictions: Number(es.active_restrictions),
    },
    charts: {
      ticketStatusMix: ticketStatusChart(tc),
      ticketCategories: toCategoryChart(categoryRows),
      priorityMix: priorityMix.rows.map((r) => ({
        label: (r.priority || 'medium').replace(/^./, (c) => c.toUpperCase()),
        value: Number(r.count),
        color: priorityColors[r.priority] || '#71717a',
      })),
      disputeStatusMix: disputeMix.rows.map((r) => ({
        label: String(r.status || 'open').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
        value: Number(r.count),
        color: disputeColors[r.status] || '#71717a',
      })),
      activityTrend: ticketTrend.rows.map((r) => ({
        day: r.day,
        tickets: Number(r.tickets),
        messages: Number(r.messages),
      })),
    },
    recentTickets: tickets.slice(0, 8),
    recentDisputes: disputes.slice(0, 6),
    recentReports: reports.slice(0, 6),
    ticketLog,
    staffWorkload,
    alerts: buildAlerts(tc, rc, dc, chatOpen),
    dataSources: {
      tables: [
        'support_tickets',
        'ticket_messages',
        'disputes',
        'dispute_chats',
        'inbox/messages (mongo)',
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
  getTicketLog,
  getChatQueue,
};
