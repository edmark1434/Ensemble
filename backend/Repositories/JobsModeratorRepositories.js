const {
  fetchScopedTickets,
  scopedTicketCounts,
  fetchScopedDisputes,
  scopedDisputeCounts,
  ticketStatusChart,
} = require('./ModeratorSharedRepositories');

// Jobs & Gigs moderation covers job/gig tickets and disputes tied to jobs, gigs and contracts.
const JOBS_TICKET_SCOPE = { categoriesIn: ['jobs', 'gigs', 'job', 'gig'] };
const JOBS_DISPUTE_ENTITIES = ['job', 'gig', 'contract'];

async function getJobsTickets({ status } = {}) {
  return fetchScopedTickets({ ...JOBS_TICKET_SCOPE, status });
}

async function getJobsDisputes({ status } = {}) {
  return fetchScopedDisputes({ entityTypesIn: JOBS_DISPUTE_ENTITIES, status });
}

function buildAlerts(tc, dc) {
  const alerts = [];
  if (Number(dc.open_count) > 0) {
    alerts.push({
      id: 'open-disputes',
      message: `${dc.open_count} job/gig dispute(s) open — ${Number(dc.credits_at_risk).toLocaleString()} credits at risk.`,
      severity: 'error',
    });
  }
  if (Number(tc.unassigned) > 0) {
    alerts.push({ id: 'unassigned', message: `${tc.unassigned} job/gig ticket(s) have no assignee.`, severity: 'warning' });
  }
  if (Number(tc.open_count) + Number(tc.in_progress) > 0) {
    alerts.push({ id: 'open-tickets', message: `${Number(tc.open_count) + Number(tc.in_progress)} job/gig ticket(s) open.`, severity: 'info' });
  }
  if (!alerts.length) {
    alerts.push({ id: 'clear', message: 'Jobs & Gigs queues are clear.', severity: 'success' });
  }
  return alerts;
}

async function getJobsOverview() {
  const [ticketCounts, disputeCounts, tickets, disputes] = await Promise.all([
    scopedTicketCounts(JOBS_TICKET_SCOPE),
    scopedDisputeCounts({ entityTypesIn: JOBS_DISPUTE_ENTITIES }),
    getJobsTickets(),
    getJobsDisputes(),
  ]);

  const tc = ticketCounts;
  const dc = disputeCounts;

  const disputeStatusMix = [
    { label: 'Open', value: disputes.filter((d) => d.status === 'open').length, color: '#f87171' },
    { label: 'Under review', value: disputes.filter((d) => d.status === 'under_review').length, color: '#fbbf24' },
    { label: 'Resolved', value: disputes.filter((d) => ['resolved', 'closed'].includes(d.status)).length, color: '#34d399' },
  ].filter((x) => x.value > 0);

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      openTickets: Number(tc.open_count) + Number(tc.in_progress),
      totalTickets: Number(tc.total),
      unassignedTickets: Number(tc.unassigned),
      openDisputes: Number(dc.open_count),
      totalDisputes: Number(dc.total),
      creditsAtRisk: Number(dc.credits_at_risk),
      resolvedTickets: Number(tc.resolved),
    },
    charts: {
      ticketStatusMix: ticketStatusChart(tc),
      disputeStatusMix,
    },
    recentTickets: tickets.slice(0, 8),
    disputes: disputes.slice(0, 10),
    alerts: buildAlerts(tc, dc),
    dataSources: { tables: ['support_tickets', 'disputes'], persisted: true },
  };
}

module.exports = {
  getJobsOverview,
  getJobsTickets,
  getJobsDisputes,
};
