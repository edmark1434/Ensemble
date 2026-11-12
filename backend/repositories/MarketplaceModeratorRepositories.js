const { pool } = require('../lib/Database');
const { QUEUE_SCOPES } = require('../lib/TicketEnums');
const { MARKETPLACE_REPORT_TYPES } = require('../lib/ReportEnums');
const { recordAccountActivity } = require('./AccountActivityRepositories');
const { sendMarketplaceListingNotification } = require('../lib/ModerationPolicy');
const { fetchStaffWorkload } = require('./AdminTicketsRepositories');
const { sumActiveWarningPoints } = require('./WarningBandRepositories');
const { meritFromWarningPoints } = require('../lib/WarningBands');
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
    marketAssetId: row.market_asset_id || null,
    status: row.status,
    rejectionReason: row.rejection_reason,
    moderationNote: row.moderation_note || null,
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

/** Queue order the desk can ask for. Pending always floats to the top of the default view. */
const LISTING_SORTS = {
  newest: 'CASE l.status WHEN \'pending\' THEN 0 ELSE 1 END, l.created_at DESC',
  oldest: 'CASE l.status WHEN \'pending\' THEN 0 ELSE 1 END, l.created_at ASC',
  price_desc: 'l.price_credits DESC, l.created_at DESC',
  price_asc: 'l.price_credits ASC, l.created_at DESC',
  title: 'LOWER(l.title) ASC',
  reviewed: 'l.reviewed_at DESC NULLS LAST, l.created_at DESC',
};

function listingLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 100;
  return Math.min(parsed, 500);
}

async function fetchListings({ status, search, category, sort, limit } = {}) {
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
  const orderBy = LISTING_SORTS[String(sort || 'newest')] || LISTING_SORTS.newest;

  params.push(listingLimit(limit));

  const result = await pool.query(
    `
    ${LISTING_SELECT}
    ${where}
    ORDER BY ${orderBy}
    LIMIT $${params.length}
    `,
    params
  );
  return result.rows.map(mapListingRow);
}

async function getMarketplaceListings({ status, search, category, sort, limit } = {}) {
  return fetchListings({ status, search, category, sort, limit });
}

async function getListingLinkedAsset(marketAssetId) {
  if (!marketAssetId) return null;

  const result = await pool.query(
    `
    SELECT
      ma.market_asset_id,
      ma.name,
      ma.status,
      ma.description,
      (
        SELECT typed_media.type
        FROM market_media_assets typed_link
        JOIN media_assets typed_media ON typed_media.media_asset_id = typed_link.media_asset_id
        WHERE typed_link.market_asset_id = ma.market_asset_id
          AND typed_media.deleted_at IS NULL
        ORDER BY typed_link.position, typed_media.media_asset_id
        LIMIT 1
      ) AS type,
      COALESCE((
        SELECT json_agg(json_build_object(
          'mediaAssetId', thumbnail_media.media_asset_id,
          'path', thumbnail_file.path,
          'position', thumbnail_link.position
        ) ORDER BY thumbnail_link.position, thumbnail_media.media_asset_id)
        FROM market_asset_thumbnails thumbnail_link
        JOIN media_assets thumbnail_media
          ON thumbnail_media.media_asset_id = thumbnail_link.media_asset_id
        JOIN files thumbnail_file ON thumbnail_file.file_id = thumbnail_media.thumbnail_file_id
        WHERE thumbnail_link.market_asset_id = ma.market_asset_id
          AND thumbnail_media.deleted_at IS NULL
          AND thumbnail_file.deleted_at IS NULL
      ), '[]'::json) AS thumbnails,
      COALESCE((
        SELECT json_agg(json_build_object(
          'mediaAssetId', item.media_asset_id,
          'name', item.name,
          'type', item.type,
          'mimeType', item_original.mime_type,
          'sizeBytes', item_original.size_bytes,
          'width', item.width,
          'height', item.height,
          'durationSeconds', item.duration_seconds,
          'proxyPath', item_proxy.path,
          'thumbnailPath', item_thumbnail.path,
          'processingStatus', CASE
            WHEN item_job.status = 'failed' THEN 'failed'
            WHEN item_job.status IN ('pending', 'running') THEN 'processing'
            ELSE 'ready'
          END,
          'position', item_link.position
        ) ORDER BY item_link.position, item.media_asset_id)
        FROM market_media_assets item_link
        JOIN media_assets item ON item.media_asset_id = item_link.media_asset_id
        JOIN files item_original ON item_original.file_id = item.original_file_id
        LEFT JOIN files item_proxy ON item_proxy.file_id = item.proxy_file_id
          AND item_proxy.deleted_at IS NULL
        LEFT JOIN files item_thumbnail ON item_thumbnail.file_id = item.thumbnail_file_id
          AND item_thumbnail.deleted_at IS NULL
        LEFT JOIN media_asset_jobs item_job ON item_job.media_asset_id = item.media_asset_id
        WHERE item_link.market_asset_id = ma.market_asset_id
          AND item.deleted_at IS NULL
          AND item_original.deleted_at IS NULL
      ), '[]'::json) AS mediaFiles
    FROM market_assets ma
    WHERE ma.market_asset_id = $1
      AND ma.deleted_at IS NULL
    LIMIT 1
    `,
    [marketAssetId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.market_asset_id,
    name: row.name,
    status: row.status,
    description: row.description,
    type: row.type || null,
    thumbnails: Array.isArray(row.thumbnails) ? row.thumbnails : [],
    mediaFiles: Array.isArray(row.mediaFiles) ? row.mediaFiles : [],
  };
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
  const listing = mapListingRow(result.rows[0]);
  listing.asset = await getListingLinkedAsset(listing.marketAssetId);
  return listing;
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

  const [listingsResult, warningPoints] = await Promise.all([
    pool.query(
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
    ),
    sumActiveWarningPoints(accountId),
  ]);

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
      merit: meritFromWarningPoints(warningPoints),
    },
    counts,
    listings,
  };
}

/**
 * Review one listing.
 *
 * `pending` re-opens an already reviewed listing (the copyright / re-approval path): the
 * market asset goes back to draft so it leaves the live catalog while it is re-checked.
 * A rejection stores its reason in `rejection_reason`; delist and re-approval store theirs
 * in `moderation_note`, so the two trails never overwrite each other.
 */
async function reviewMarketplaceListing(
  listingId,
  { status, rejectionReason, moderationNote, reason },
  staffSession
) {
  const allowed = ['approved', 'rejected', 'delisted', 'pending'];
  if (!allowed.includes(status)) {
    throw new Error(`Invalid listing status: ${status}`);
  }

  const rejectReason = status === 'rejected' ? (rejectionReason || reason || null) : null;
  const note =
    status === 'delisted' || status === 'pending'
      ? (moderationNote || reason || rejectionReason || null)
      : null;
  if ((status === 'delisted' || status === 'pending') && !String(note || '').trim()) {
    const err = new Error(
      status === 'pending'
        ? 'A reason is required when sending a listing back for re-approval'
        : 'A reason is required when delisting a listing'
    );
    err.statusCode = 400;
    throw err;
  }

  const rawStaffId = staffSession?.staff_id || staffSession?.staffId || null;
  const staffId = rawStaffId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawStaffId)
    ? rawStaffId
    : null;
  const before = await pool.query(
    `SELECT listing_id, listing_number, title, submitted_by_account_id, market_asset_id
     FROM marketplace_listings WHERE listing_id = $1`,
    [listingId]
  );
  if (!before.rows.length) throw new Error('Listing not found');

  await pool.query(
    `UPDATE marketplace_listings
     SET status = $1,
         rejection_reason = $2,
         moderation_note = $3,
         reviewed_by_staff_id = $4,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE listing_id = $5`,
    [status, rejectReason, note, staffId, listingId]
  );

  const row = before.rows[0];
  if (row.market_asset_id) {
    if (status === 'approved') {
      await pool.query(
        `UPDATE market_assets
         SET status = 'published', updated_at = NOW()
         WHERE market_asset_id = $1 AND deleted_at IS NULL`,
        [row.market_asset_id]
      );
      try {
        require('../services/BadgeServices').scheduleBadgeEvaluation(row.submitted_by_account_id);
      } catch (badgeErr) {
        console.error('Badge evaluation after listing approve failed:', badgeErr.message);
      }
    } else {
      // rejected, delisted and re-review all pull the asset out of the live catalog.
      await pool.query(
        `UPDATE market_assets
         SET status = 'draft', updated_at = NOW()
         WHERE market_asset_id = $1 AND deleted_at IS NULL`,
        [row.market_asset_id]
      );
    }
  }

  await sendMarketplaceListingNotification({
    accountId: row.submitted_by_account_id,
    marketAssetId: row.market_asset_id,
    listingId,
    title: row.title || 'Untitled Asset',
    status,
    rejectionReason: rejectReason,
    moderationNote: note,
  });

  await recordAccountActivity({
    accountId: row.submitted_by_account_id,
    action:
      status === 'pending'
        ? `Listing ${row.listing_number || row.title || listingId} sent back for re-approval`
        : `Listing ${row.listing_number || row.title || listingId} ${status}`,
    eventCode: 'LISTING_REVIEWED',
    referenceTable: 'marketplace_listings',
    referencePrefix: 'LST',
    referenceId: listingId,
    actorStaffId: staffId,
    metadata: {
      status,
      title: row.title,
      rejectionReason: rejectReason,
      moderationNote: note,
    },
  });

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
  const [result, typeResult] = await Promise.all([
  pool.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('open', 'pending'))::int AS open_status,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('in_review', 'in review', 'in_progress', 'in progress'))::int AS in_review,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('resolved', 'closed'))::int AS resolved,
      COUNT(*) FILTER (WHERE LOWER(status) = 'dismissed')::int AS dismissed,
      COUNT(*) FILTER (
        WHERE LOWER(status) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned')
          AND assigned_staff_id IS NULL
      )::int AS unassigned,
      COUNT(*) FILTER (
        WHERE LOWER(priority) = 'high'
          AND LOWER(status) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned')
      )::int AS high_priority
    FROM reports
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(target_type, type)) = ANY($1)
    `,
    params
  ),
  pool.query(
    `
    SELECT LOWER(COALESCE(target_type, type)) AS target_type, COUNT(*)::int AS count
    FROM reports
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(target_type, type)) = ANY($1)
    GROUP BY 1
    ORDER BY count DESC
    `,
    params
  ),
  ]);
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

/** Review-queue health for the dashboard: backlog age, throughput and copyright pressure. */
async function getListingQueueHealth(targetTypesIn) {
  const [queue, copyright] = await Promise.all([
    pool.query(`
      SELECT
        MIN(created_at) FILTER (WHERE status = 'pending') AS oldest_pending_at,
        COUNT(*) FILTER (
          WHERE status = 'pending' AND created_at < NOW() - INTERVAL '48 hours'
        )::int AS pending_over_48h,
        COUNT(*) FILTER (
          WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days'
        )::int AS pending_over_7d,
        COUNT(*) FILTER (WHERE reviewed_at >= NOW() - INTERVAL '24 hours')::int AS reviewed_24h,
        COUNT(*) FILTER (WHERE reviewed_at >= NOW() - INTERVAL '7 days')::int AS reviewed_7d,
        COUNT(*) FILTER (
          WHERE status = 'approved' AND reviewed_at >= NOW() - INTERVAL '7 days'
        )::int AS approved_7d,
        COUNT(*) FILTER (
          WHERE status IN ('rejected', 'delisted') AND reviewed_at >= NOW() - INTERVAL '7 days'
        )::int AS removed_7d,
        AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))) FILTER (
          WHERE reviewed_at IS NOT NULL AND reviewed_at >= NOW() - INTERVAL '30 days'
        ) AS avg_review_seconds
      FROM marketplace_listings
    `),
    pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM reports
      WHERE deleted_at IS NULL
        AND LOWER(COALESCE(target_type, type)) = ANY($1)
        AND LOWER(status) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned')
        AND (LOWER(COALESCE(type, '')) LIKE '%copyright%' OR LOWER(COALESCE(description, '')) LIKE '%copyright%')
      `,
      [targetTypesIn]
    ),
  ]);

  const q = queue.rows[0] || {};
  const avgSeconds = q.avg_review_seconds === null ? null : Number(q.avg_review_seconds);
  return {
    oldestPendingAt: q.oldest_pending_at || null,
    pendingOver48h: Number(q.pending_over_48h || 0),
    pendingOver7d: Number(q.pending_over_7d || 0),
    reviewedLast24h: Number(q.reviewed_24h || 0),
    reviewedLast7d: Number(q.reviewed_7d || 0),
    approvedLast7d: Number(q.approved_7d || 0),
    removedLast7d: Number(q.removed_7d || 0),
    avgReviewHours:
      avgSeconds === null || Number.isNaN(avgSeconds)
        ? null
        : Math.round((avgSeconds / 3600) * 10) / 10,
    copyrightReports: Number(copyright.rows[0]?.count || 0),
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
    staffWorkload,
    queueHealth,
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
    // Powers the "assign to" pickers and filters on this desk's queues.
    fetchStaffWorkload(),
    getListingQueueHealth(marketplaceTypes),
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
      openTickets: Number(tc.open_count) + Number(tc.in_progress) + Number(tc.escalated_dev || 0),
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
      ...queueHealth,
    },
    queueHealth,
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
    staffWorkload,
    alerts: buildMarketplaceAlerts(lc, tc, reportBreakdown, queueHealth),
    dataSources: {
      tables: ['marketplace_listings', 'tickets', 'reports', 'accounts'],
      persisted: true,
    },
  };
}

function buildMarketplaceAlerts(lc, tc, reportBreakdown, queueHealth = {}) {
  const alerts = [];
  const openTickets = Number(tc.open_count) + Number(tc.in_progress || 0) + Number(tc.escalated_dev || 0);
  const rb = reportBreakdown?.counts || {};

  if (Number(lc.pending) > 0) {
    alerts.push({
      id: 'pending-listings',
      message: `${lc.pending} listing(s) awaiting review.`,
      severity: 'warning',
      action: { tab: 'marketplace-control' },
    });
  }
  if (Number(queueHealth.pendingOver48h) > 0) {
    alerts.push({
      id: 'aging-listings',
      message: `${queueHealth.pendingOver48h} listing(s) have been pending for over 48 hours.`,
      severity: 'error',
      action: { tab: 'marketplace-control' },
    });
  }
  if (Number(queueHealth.copyrightReports) > 0) {
    alerts.push({
      id: 'copyright-reports',
      message: `${queueHealth.copyrightReports} open marketplace report(s) mention copyright.`,
      severity: 'error',
      action: { tab: 'reports' },
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
