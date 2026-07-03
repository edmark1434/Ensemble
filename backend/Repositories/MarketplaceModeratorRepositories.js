const { pool } = require('../lib/database');

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

async function fetchListings(status) {
  const params = [];
  let where = '';
  if (status && status !== 'all') {
    params.push(status);
    where = `WHERE l.status = $${params.length}`;
  }

  const result = await pool.query(
    `
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
    ${where}
    ORDER BY
      CASE l.status WHEN 'pending' THEN 0 ELSE 1 END,
      l.created_at DESC
    LIMIT 50
    `,
    params
  );
  return result.rows.map(mapListingRow);
}

async function getMarketplaceListings({ status } = {}) {
  return fetchListings(status);
}

async function getMarketplaceListingDetail(listingId) {
  const listings = await fetchListings('all');
  return listings.find((l) => l.id === Number(listingId)) || null;
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
  const result = await pool.query(`
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
    WHERE t.category = 'marketplace'
    ORDER BY
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      t.updated_at DESC
    LIMIT 50
  `);

  return result.rows.map((row) => ({
    id: row.ticket_id,
    number: row.ticket_number,
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    status: row.status,
    channel: row.channel,
    requester: {
      accountId: row.requester_account_id,
      name: row.requester_name || 'Unknown',
      username: row.requester_handle || '—',
      email: row.requester_email || null,
    },
    assignee: row.assigned_staff_id
      ? { staffId: row.assigned_staff_id, name: row.assignee_name || 'Unassigned', role: row.assigned_role || row.assignee_role }
      : null,
    messageCount: Number(row.message_count || 0),
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  }));
}

async function getMarketplaceOverview() {
  const [listingCounts, categoryBreakdown, ticketCounts, restrictedCount] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COALESCE(SUM(price_credits) FILTER (WHERE status = 'approved'), 0)::int AS approved_credit_value
      FROM marketplace_listings
    `),
    pool.query(`
      SELECT category, COUNT(*)::int AS count
      FROM marketplace_listings GROUP BY category ORDER BY count DESC
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('resolved', 'closed'))::int AS open_count
      FROM support_tickets WHERE category = 'marketplace'
    `),
    pool.query(`SELECT COUNT(*)::int AS count FROM accounts WHERE LOWER(status) IN ('suspended', 'banned')`),
  ]);

  const lc = listingCounts.rows[0];
  const tc = ticketCounts.rows[0];

  const statusChart = [
    { label: 'Pending', value: Number(lc.pending), color: '#fbbf24' },
    { label: 'Approved', value: Number(lc.approved), color: '#34d399' },
    { label: 'Rejected', value: Number(lc.rejected), color: '#f87171' },
  ].filter((x) => x.value > 0);

  const categoryChart = categoryBreakdown.rows.map((r, i) => ({
    label: r.category || 'Uncategorized',
    value: r.count,
    color: ['#fb7185', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#38bdf8'][i % 6],
  }));

  const recentListings = await fetchListings('all');

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      totalListings: Number(lc.total),
      pendingListings: Number(lc.pending),
      approvedListings: Number(lc.approved),
      rejectedListings: Number(lc.rejected),
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
  if (Number(lc.pending) > 0) {
    alerts.push({ id: 'pending-listings', message: `${lc.pending} listing(s) awaiting review.`, severity: 'warning' });
  }
  if (Number(tc.open_count) > 0) {
    alerts.push({ id: 'open-tickets', message: `${tc.open_count} marketplace ticket(s) open.`, severity: 'info' });
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
  reviewMarketplaceListing,
  getMarketplaceTickets,
};
