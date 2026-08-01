const { pool } = require('../lib/database');
const { QUEUE_SCOPES } = require('../lib/ticketEnums');
const { MARKETPLACE_REPORT_TYPES } = require('../lib/reportEnums');
const {
  fetchScopedTickets,
  scopedTicketCounts,
  scopedTicketCategoryBreakdown,
  fetchScopedReports,
  scopedReportCounts,
  toCategoryChart,
  ticketStatusChart,
} = require('./ModeratorSharedRepositories');

function mapListingRow(row) {
  return {
    id: row.listing_id,
    number: row.listing_number,
    title: row.title,
    description: row.description,
    category: row.category,
    priceCredits: Number(row.price_credits || 0),
    thumbnailUrl: row.thumbnail_url,
    status: row.status,
    rejectionReason: row.rejection_reason,
    submittedBy: {
      accountId: row.submitted_by_account_id,
      name: row.submitter_name || 'Unknown',
      handle: row.submitter_handle || '—',
    },
    reviewedBy: row.reviewed_by_staff_id
      ? { staffId: row.reviewed_by_staff_id, name: row.reviewer_name || 'Staff' }
      : null,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LISTING_SELECT = `
  SELECT
    l.*,
    COALESCE(sa.display_name, su.first_name || ' ' || su.last_name) AS submitter_name,
    sa.handle AS submitter_handle,
    COALESCE(ra.display_name, rs.first_name || ' ' || rs.last_name) AS reviewer_name
  FROM marketplace_listings l
  LEFT JOIN accounts sa ON sa.account_id = l.submitted_by_account_id
  LEFT JOIN users su ON su.account_id = sa.account_id
  LEFT JOIN staff rs ON rs.staff_id = l.reviewed_by_staff_id
  LEFT JOIN accounts ra ON ra.account_id = rs.account_id
`;

async function fetchListings({ status, search, category } = {}) {
  const params = [];
  const clauses = [];

  if (status && status !== 'all') {
    params.push(status);
    clauses.push(`l.status = $${params.length}`);
  }

  if (category && category !== 'all') {
    params.push(category);
    clauses.push(`COALESCE(l.category, 'Uncategorized') = $${params.length}`);
  }

  if (search && String(search).trim()) {
    const q = `%${String(search).trim().toLowerCase()}%`;
    params.push(q);
    const i = params.length;
    clauses.push(`(
      LOWER(l.title) LIKE $${i}
      OR LOWER(l.listing_number) LIKE $${i}
      OR LOWER(COALESCE(sa.handle, '')) LIKE $${i}
      OR LOWER(COALESCE(sa.display_name, '')) LIKE $${i}
      OR LOWER(COALESCE(su.first_name || ' ' || su.last_name, '')) LIKE $${i}
    )`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await pool.query(
    `
    ${LISTING_SELECT}
    ${where}
    ORDER BY
      CASE l.status WHEN 'pending' THEN 0 ELSE 1 END,
      l.created_at DESC
    LIMIT 100
    `,
    params
  );
  return result.rows.map(mapListingRow);
}

async function getMarketplaceListings({ status, search, category } = {}) {
  return fetchListings({ status, search, category });
}

async function getMarketplaceListingDetail(listingId) {
  const result = await pool.query(
    `
    ${LISTING_SELECT}
    WHERE l.listing_id = $1
    LIMIT 1
    `,
    [listingId]
  );
  if (!result.rows[0]) return null;
  return mapListingRow(result.rows[0]);
}

async function getSellerMarketplaceListings(accountId) {
  const accountResult = await pool.query(
    `
    SELECT
      a.account_id,
      a.handle,
      a.status,
      COALESCE(a.display_name, u.first_name || ' ' || u.last_name, 'Unknown') AS name
    FROM accounts a
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE a.account_id = $1
    LIMIT 1
    `,
    [accountId]
  );
  if (!accountResult.rows[0]) return null;

  const listingsResult = await pool.query(
    `
    SELECT
      listing_id,
      listing_number,
      title,
      category,
      price_credits,
      status,
      created_at,
      updated_at,
      reviewed_at
    FROM marketplace_listings
    WHERE submitted_by_account_id = $1
    ORDER BY created_at DESC
    LIMIT 100
    `,
    [accountId]
  );

  const account = accountResult.rows[0];
  const listings = listingsResult.rows.map((row) => ({
    id: row.listing_id,
    number: row.listing_number,
    title: row.title,
    category: row.category,
    priceCredits: Number(row.price_credits || 0),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
  }));

  const counts = {
    total: listings.length,
    pending: listings.filter((l) => l.status === 'pending').length,
    approved: listings.filter((l) => l.status === 'approved').length,
    rejected: listings.filter((l) => l.status === 'rejected').length,
    delisted: listings.filter((l) => l.status === 'delisted').length,
  };

  return {
    account: {
      accountId: account.account_id,
      name: account.name,
      handle: account.handle || '—',
      status: account.status || 'active',
    },
    counts,
    listings,
  };
}

async function reviewMarketplaceListing(listingId, { status, rejectionReason }, staffSession) {
  const allowed = ['approved', 'rejected', 'delisted'];
  if (!allowed.includes(status)) {
    throw new Error(`Invalid listing status: ${status}`);
  }

  await pool.query(
    `UPDATE marketplace_listings
     SET status = $1, rejection_reason = $2, reviewed_by_staff_id = $3, reviewed_at = NOW(), updated_at = NOW()
     WHERE listing_id = $4`,
    [status, status === 'rejected' ? rejectionReason || null : null, staffSession?.staff_id || null, listingId]
  );

  return getMarketplaceListingDetail(listingId);
}

async function getMarketplaceTickets() {
  return fetchScopedTickets(QUEUE_SCOPES.marketplace);
}

async function getMarketplaceReports({ status } = {}) {
  return fetchScopedReports({ targetTypesIn: [...MARKETPLACE_REPORT_TYPES], status });
}

async function getMarketplaceReportBreakdown(targetTypesIn) {
  const params = [targetTypesIn];
  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('open', 'pending'))::int AS open_status,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('in_review', 'in review', 'in_progress', 'in progress'))::int AS in_review,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('resolved', 'closed'))::int AS resolved,
      COUNT(*) FILTER (WHERE LOWER(status) = 'dismissed')::int AS dismissed,
      COUNT(*) FILTER (
        WHERE LOWER(status) NOT IN ('resolved', 'closed', 'dismissed')
          AND assigned_staff_id IS NULL
      )::int AS unassigned,
      COUNT(*) FILTER (
        WHERE LOWER(priority) = 'high'
          AND LOWER(status) NOT IN ('resolved', 'closed', 'dismissed')
      )::int AS high_priority
    FROM reports
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(target_type, type)) = ANY($1)
    `,
    params
  );
  const typeResult = await pool.query(
    `
    SELECT LOWER(COALESCE(target_type, type)) AS target_type, COUNT(*)::int AS count
    FROM reports
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(target_type, type)) = ANY($1)
    GROUP BY 1
    ORDER BY count DESC
    `,
    params
  );
  const c = result.rows[0] || {};
  return {
    counts: {
      total: Number(c.total || 0),
      openStatus: Number(c.open_status || 0),
      inReview: Number(c.in_review || 0),
      resolved: Number(c.resolved || 0),
      dismissed: Number(c.dismissed || 0),
      unassigned: Number(c.unassigned || 0),
      highPriority: Number(c.high_priority || 0),
      openCount: Number(c.open_status || 0) + Number(c.in_review || 0),
    },
    byType: typeResult.rows.map((r) => ({
      label: String(r.target_type || 'other')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase()),
      value: Number(r.count),
    })),
  };
}

async function getMarketplaceOverview() {
  const marketplaceTypes = [...MARKETPLACE_REPORT_TYPES];
  const [
    listingCounts,
    categoryBreakdown,
    ticketCounts,
    categoryRows,
    reportCounts,
    reportBreakdown,
    restrictedCount,
    tickets,
    reports,
    recentListings,
  ] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE status = 'delisted')::int AS delisted,
        COALESCE(SUM(price_credits) FILTER (WHERE status = 'approved'), 0)::int AS approved_credit_value
      FROM marketplace_listings
    `),
    pool.query(`
      SELECT COALESCE(category, 'Uncategorized') AS category, COUNT(*)::int AS count
      FROM marketplace_listings GROUP BY COALESCE(category, 'Uncategorized') ORDER BY count DESC
    `),
    scopedTicketCounts(QUEUE_SCOPES.marketplace),
    scopedTicketCategoryBreakdown(QUEUE_SCOPES.marketplace),
    scopedReportCounts({ targetTypesIn: marketplaceTypes }),
    getMarketplaceReportBreakdown(marketplaceTypes),
    pool.query(`SELECT COUNT(*)::int AS count FROM accounts WHERE LOWER(status) IN ('suspended', 'banned')`),
    getMarketplaceTickets(),
    getMarketplaceReports(),
    fetchListings({ status: 'all' }),
  ]);

  const lc = listingCounts.rows[0];
  const tc = ticketCounts;
  const rc = reportCounts;
  const rb = reportBreakdown.counts;

  const listingStatusMix = [
    { label: 'Pending', value: Number(lc.pending), color: '#fbbf24' },
    { label: 'Approved', value: Number(lc.approved), color: '#34d399' },
    { label: 'Rejected', value: Number(lc.rejected), color: '#f87171' },
    { label: 'Delisted', value: Number(lc.delisted), color: '#a1a1aa' },
  ].filter((x) => x.value > 0);

  const listingCategories = categoryBreakdown.rows.map((r, i) => ({
    label: r.category || 'Uncategorized',
    value: r.count,
    color: ['#f59e0b', '#fb7185', '#a78bfa', '#60a5fa', '#34d399', '#38bdf8'][i % 6],
  }));

  const reportStatusMix = [
    { label: 'Open', value: rb.openStatus, color: '#f87171' },
    { label: 'In review', value: rb.inReview, color: '#fbbf24' },
    { label: 'Resolved', value: rb.resolved, color: '#34d399' },
    { label: 'Dismissed', value: rb.dismissed, color: '#a1a1aa' },
  ].filter((x) => x.value > 0);

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      totalListings: Number(lc.total),
      pendingListings: Number(lc.pending),
      approvedListings: Number(lc.approved),
      rejectedListings: Number(lc.rejected),
      delistedListings: Number(lc.delisted),
      approvedCreditValue: Number(lc.approved_credit_value),
      openTickets: Number(tc.open_count) + Number(tc.in_progress),
      totalTickets: Number(tc.total),
      unassignedTickets: Number(tc.unassigned),
      highPriorityTickets: Number(tc.high_priority),
      awaitingReplyTickets: Number(tc.awaiting_reply),
      escalatedTickets: Number(tc.escalated),
      inProgressTickets: Number(tc.in_progress),
      resolvedTickets: Number(tc.resolved),
      openReports: Number(rc.open_count),
      totalReports: Number(rc.total),
      unassignedReports: rb.unassigned,
      highPriorityReports: rb.highPriority,
      resolvedReports: rb.resolved,
      restrictedAccounts: Number(restrictedCount.rows[0].count),
    },
    charts: {
      listingStatusMix,
      listingCategories,
      ticketStatusMix: ticketStatusChart(tc),
      ticketCategories: toCategoryChart(categoryRows),
      reportStatusMix,
      reportTypes: reportBreakdown.byType.map((row, i) => ({
        ...row,
        color: ['#f59e0b', '#fb7185', '#a78bfa', '#60a5fa', '#34d399', '#38bdf8'][i % 6],
      })),
    },
    recentListings: recentListings.slice(0, 8),
    recentTickets: tickets.slice(0, 10),
    flaggedReports: reports.slice(0, 10),
    alerts: buildMarketplaceAlerts(lc, tc, reportBreakdown),
    dataSources: {
      tables: ['marketplace_listings', 'tickets', 'reports', 'accounts'],
      persisted: true,
    },
  };
}

function buildMarketplaceAlerts(lc, tc, reportBreakdown) {
  const alerts = [];
  const openTickets = Number(tc.open_count) + Number(tc.in_progress || 0);
  const rb = reportBreakdown?.counts || {};

  if (Number(lc.pending) > 0) {
    alerts.push({
      id: 'pending-listings',
      message: `${lc.pending} listing(s) awaiting review.`,
      severity: 'warning',
      action: { tab: 'marketplace-control' },
    });
  }
  if (Number(tc.unassigned) > 0) {
    alerts.push({
      id: 'unassigned',
      message: `${tc.unassigned} marketplace ticket(s) have no assignee.`,
      severity: 'warning',
      action: { tab: 'ticket-management', ticketFilters: { assignee: 'unassigned' } },
    });
  }
  if (Number(tc.high_priority) > 0) {
    alerts.push({
      id: 'high-priority',
      message: `${tc.high_priority} high-priority marketplace ticket(s) need attention.`,
      severity: 'error',
      action: { tab: 'ticket-management', ticketFilters: { priority: 'High' } },
    });
  }
  if (Number(tc.awaiting_reply) > 0) {
    alerts.push({
      id: 'awaiting-reply',
      message: `${tc.awaiting_reply} marketplace ticket(s) awaiting a staff reply.`,
      severity: 'warning',
      action: { tab: 'ticket-management' },
    });
  }
  if (Number(tc.escalated) > 0) {
    alerts.push({
      id: 'escalated',
      message: `${tc.escalated} escalated marketplace ticket(s) need a handoff.`,
      severity: 'error',
      action: { tab: 'ticket-management' },
    });
  }
  if (Number(rb.unassigned) > 0) {
    alerts.push({
      id: 'unassigned-reports',
      message: `${rb.unassigned} marketplace report(s) unassigned.`,
      severity: 'warning',
      action: { tab: 'reports' },
    });
  }
  if (Number(rb.highPriority) > 0) {
    alerts.push({
      id: 'high-reports',
      message: `${rb.highPriority} high-priority marketplace report(s) open.`,
      severity: 'error',
      action: { tab: 'reports' },
    });
  }
  if (openTickets > 0) {
    alerts.push({
      id: 'open-tickets',
      message: `${openTickets} marketplace ticket(s) open.`,
      severity: 'info',
      action: { tab: 'ticket-management' },
    });
  }
  if (!alerts.length) {
    alerts.push({ id: 'clear', message: 'Marketplace queue is clear.', severity: 'success' });
  }
  return alerts;
}

module.exports = {
  getMarketplaceOverview,
  getMarketplaceListings,
  getMarketplaceListingDetail,
  getSellerMarketplaceListings,
  reviewMarketplaceListing,
  getMarketplaceTickets,
  getMarketplaceReports,
};
