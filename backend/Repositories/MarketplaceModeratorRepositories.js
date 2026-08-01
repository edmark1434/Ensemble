const { pool } = require('../lib/database');
const { QUEUE_SCOPES } = require('../lib/ticketEnums');
const { MARKETPLACE_REPORT_TYPES } = require('../lib/reportEnums');
const {
  fetchScopedTickets,
  scopedTicketCounts,
  fetchScopedReports,
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

async function getMarketplaceOverview() {
  const [listingCounts, categoryBreakdown, ticketCounts, restrictedCount] = await Promise.all([
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
    pool.query(`SELECT COUNT(*)::int AS count FROM accounts WHERE LOWER(status) IN ('suspended', 'banned')`),
  ]);

  const lc = listingCounts.rows[0];
  const tc = ticketCounts;

  const statusChart = [
    { label: 'Pending', value: Number(lc.pending), color: '#fbbf24' },
    { label: 'Approved', value: Number(lc.approved), color: '#34d399' },
    { label: 'Rejected', value: Number(lc.rejected), color: '#f87171' },
    { label: 'Delisted', value: Number(lc.delisted), color: '#a1a1aa' },
  ].filter((x) => x.value > 0);

  const categoryChart = categoryBreakdown.rows.map((r, i) => ({
    label: r.category || 'Uncategorized',
    value: r.count,
    color: ['#fb7185', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#38bdf8'][i % 6],
  }));

  const recentListings = await fetchListings({ status: 'all' });

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      totalListings: Number(lc.total),
      pendingListings: Number(lc.pending),
      approvedListings: Number(lc.approved),
      rejectedListings: Number(lc.rejected),
      delistedListings: Number(lc.delisted),
      approvedCreditValue: Number(lc.approved_credit_value),
      openTickets: Number(tc.open_count),
      totalTickets: Number(tc.total),
      restrictedAccounts: Number(restrictedCount.rows[0].count),
    },
    charts: {
      listingStatusMix: statusChart,
      listingCategories: categoryChart,
    },
    recentListings: recentListings.slice(0, 8),
    alerts: buildMarketplaceAlerts(lc, tc),
  };
}

function buildMarketplaceAlerts(lc, tc) {
  const alerts = [];
  const openTickets = Number(tc.open_count) + Number(tc.in_progress || 0);

  if (Number(lc.pending) > 0) {
    alerts.push({ id: 'pending-listings', message: `${lc.pending} listing(s) awaiting review.`, severity: 'warning' });
  }
  if (Number(tc.unassigned) > 0) {
    alerts.push({ id: 'unassigned', message: `${tc.unassigned} marketplace ticket(s) have no assignee.`, severity: 'warning' });
  }
  if (Number(tc.high_priority) > 0) {
    alerts.push({ id: 'high-priority', message: `${tc.high_priority} high-priority marketplace ticket(s) need attention.`, severity: 'error' });
  }
  if (Number(tc.awaiting_reply) > 0) {
    alerts.push({ id: 'awaiting-reply', message: `${tc.awaiting_reply} marketplace ticket(s) awaiting a staff reply.`, severity: 'warning' });
  }
  if (Number(tc.escalated) > 0) {
    alerts.push({ id: 'escalated', message: `${tc.escalated} escalated marketplace ticket(s) need a handoff.`, severity: 'error' });
  }
  if (openTickets > 0) {
    alerts.push({ id: 'open-tickets', message: `${openTickets} marketplace ticket(s) open.`, severity: 'info' });
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
