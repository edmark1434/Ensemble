const { pool } = require('../lib/database');
const {
  fetchScopedTickets,
  scopedTicketCounts,
  scopedTicketCategoryBreakdown,
  fetchScopedReports,
  scopedReportCounts,
  fetchScopedDisputes,
  scopedDisputeCounts,
  toCategoryChart,
  ticketStatusChart,
  normalizeStatus,
} = require('./ModeratorSharedRepositories');

// Support desk owns general support: everything not routed to a specialist queue.
const SPECIALIST_CATEGORIES = ['marketplace', 'community', 'forum', 'jobs', 'gigs', 'job', 'gig'];
const SUPPORT_SCOPE = { categoriesNotIn: SPECIALIST_CATEGORIES };

async function getSupportTickets({ status } = {}) {
  return fetchScopedTickets({ ...SUPPORT_SCOPE, status });
}

async function getSupportReports({ status } = {}) {
  return fetchScopedReports({ status });
}

// Support desk sees the full dispute queue.
async function getSupportDisputes({ status } = {}) {
  return fetchScopedDisputes({ status });
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
  const { mapTicketRow } = require('./ModeratorSharedRepositories');
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

function buildAlerts(tc, rc, chatOpen) {
  const alerts = [];
  if (Number(tc.unassigned) > 0) {
    alerts.push({ id: 'unassigned', message: `${tc.unassigned} support ticket(s) have no assignee.`, severity: 'warning' });
  }
  if (Number(tc.high_priority) > 0) {
    alerts.push({ id: 'high-priority', message: `${tc.high_priority} high-priority ticket(s) need attention.`, severity: 'error' });
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
  const [ticketCounts, categoryRows, reportCounts, disputeCounts, tickets, reports, staffWorkload, chatQueue, ticketLog] = await Promise.all([
    scopedTicketCounts(SUPPORT_SCOPE),
    scopedTicketCategoryBreakdown(SUPPORT_SCOPE),
    scopedReportCounts({}),
    scopedDisputeCounts({}),
    getSupportTickets(),
    getSupportReports(),
    getSupportStaffWorkload(),
    getChatQueue(),
    getTicketLog(),
  ]);

  const tc = ticketCounts;
  const rc = reportCounts;
  const dc = disputeCounts;
  const chatOpen = chatQueue.filter((t) => !['resolved', 'closed'].includes(t.status)).length;

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
    },
    charts: {
      ticketStatusMix: ticketStatusChart(tc),
      ticketCategories: toCategoryChart(categoryRows),
    },
    recentTickets: tickets.slice(0, 8),
    ticketLog,
    staffWorkload,
    alerts: buildAlerts(tc, rc, chatOpen),
    dataSources: { tables: ['support_tickets', 'ticket_messages', 'disputes', 'dispute_chats', 'inbox/messages (mongo)', 'reports'], persisted: true },
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
