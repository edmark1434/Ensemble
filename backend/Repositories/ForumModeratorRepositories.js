const {
  fetchScopedTickets,
  scopedTicketCounts,
  scopedTicketCategoryBreakdown,
  fetchScopedReports,
  scopedReportCounts,
  toCategoryChart,
  ticketStatusChart,
} = require('./ModeratorSharedRepositories');

// Forum moderation covers community/forum tickets and reports about forum content.
const FORUM_TICKET_SCOPE = { categoriesIn: ['community', 'forum'] };
const FORUM_REPORT_TYPES = ['discussion', 'comment', 'post', 'forum', 'thread'];

async function getForumTickets({ status } = {}) {
  return fetchScopedTickets({ ...FORUM_TICKET_SCOPE, status });
}

async function getForumReports({ status } = {}) {
  return fetchScopedReports({ targetTypesIn: FORUM_REPORT_TYPES, status });
}

function buildAlerts(tc, rc) {
  const alerts = [];
  if (Number(tc.unassigned) > 0) {
    alerts.push({ id: 'unassigned', message: `${tc.unassigned} forum ticket(s) have no assignee.`, severity: 'warning' });
  }
  if (Number(rc.open_count) > 0) {
    alerts.push({ id: 'flagged-content', message: `${rc.open_count} flagged forum item(s) awaiting review.`, severity: 'error' });
  }
  if (Number(tc.open_count) + Number(tc.in_progress) > 0) {
    alerts.push({ id: 'open-tickets', message: `${Number(tc.open_count) + Number(tc.in_progress)} forum ticket(s) open.`, severity: 'info' });
  }
  if (!alerts.length) {
    alerts.push({ id: 'clear', message: 'Forum queues are clear.', severity: 'success' });
  }
  return alerts;
}

async function getForumOverview() {
  const [ticketCounts, categoryRows, reportCounts, tickets, reports] = await Promise.all([
    scopedTicketCounts(FORUM_TICKET_SCOPE),
    scopedTicketCategoryBreakdown(FORUM_TICKET_SCOPE),
    scopedReportCounts({ targetTypesIn: FORUM_REPORT_TYPES }),
    getForumTickets(),
    getForumReports(),
  ]);

  const tc = ticketCounts;
  const rc = reportCounts;

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      openTickets: Number(tc.open_count) + Number(tc.in_progress),
      totalTickets: Number(tc.total),
      unassignedTickets: Number(tc.unassigned),
      flaggedContent: Number(rc.open_count),
      totalReports: Number(rc.total),
      resolvedTickets: Number(tc.resolved),
    },
    charts: {
      ticketStatusMix: ticketStatusChart(tc),
      ticketCategories: toCategoryChart(categoryRows),
    },
    recentTickets: tickets.slice(0, 8),
    flaggedReports: reports.slice(0, 8),
    alerts: buildAlerts(tc, rc),
    notice:
      'Live forum groups and discussions are stored in MongoDB. Configure MONGODB_URI to enable content-level moderation; ticket and report queues below are always available.',
    dataSources: { tables: ['support_tickets', 'reports'], persisted: true },
  };
}

module.exports = {
  getForumOverview,
  getForumTickets,
  getForumReports,
};
