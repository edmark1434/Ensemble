const { pool } = require('../lib/Database');
const { QUEUE_SCOPES, MARKETPLACE_TYPES } = require('../lib/TicketEnums');
const { MARKETPLACE_REPORT_TYPES, CLOSED_REPORT_STATUSES } = require('../lib/ReportEnums');
const { recordAccountActivity, listActivityForReference } = require('./AccountActivityRepositories');
const { sendMarketplaceListingNotification } = require('../lib/ModerationPolicy');
const { fetchStaffWorkload } = require('./AdminTicketsRepositories');
const { sumActiveWarningPoints } = require('./WarningBandRepositories');
const { meritFromWarningPoints } = require('../lib/WarningBands');
const {
  adminOwnedExclusionSql,
  fetchScopedTickets,
  scopedTicketCounts,
  scopedTicketCategoryBreakdown,
  fetchScopedReports,
  scopedReportCounts,
  toCategoryChart,
  ticketStatusChart,
} = require('./ModeratorSharedRepositories');

/**
 * The marketplace ticket queue: marketplace ticket types that Admin has not taken over.
 * Escalating to Admin (or an Admin claiming the ticket) takes it out of this desk.
 */
const MARKETPLACE_TICKET_SCOPE = Object.freeze({
  ...QUEUE_SCOPES.marketplace,
  excludeAdminOwned: true,
});

/** Raw-SQL twin of MARKETPLACE_TICKET_SCOPE, for the SLA and workload queries. Param $1 = types. */
const MARKETPLACE_TICKET_WHERE = `
  t.deleted_at IS NULL
  AND t.type = ANY($1::text[])
  AND ${adminOwnedExclusionSql('t')}
`;
const OPEN_TICKET_SQL = `t.status NOT IN ('Resolved', 'Closed')`;

/** Report status groups, matching every status the report desk and decisions can write. */
const REPORT_OPEN_STATUSES = ['open', 'pending'];
const REPORT_REVIEW_STATUSES = ['in_review', 'in review', 'in_progress', 'in progress', 'under_review', 'escalated'];
const REPORT_RESOLVED_STATUSES = ['resolved', 'closed', 'sanctioned'];
const REPORT_DISMISSED_STATUSES = ['dismissed', 'denied', 'archived'];

function hoursFromSeconds(value) {
  if (value === null || value === undefined) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return null;
  return Math.round((seconds / 3600) * 10) / 10;
}

function mapListingRow(row) {
  return {
    id: row.listing_id,
    number: row.listing_number,
    title: row.title,
    description: row.description,
    category: row.category,
    priceCredits: Number(row.price_credits || 0),
    thumbnailUrl: row.thumbnail_url || row.cover_path || null,
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
    COALESCE(ra.display_name, rs.first_name || ' ' || rs.last_name) AS reviewer_name,
    (
      -- Listings created from the asset flow never set thumbnail_url; use the asset's cover.
      SELECT cover_file.path
      FROM market_asset_thumbnails cover_link
      JOIN media_assets cover_media ON cover_media.media_asset_id = cover_link.media_asset_id
        AND cover_media.deleted_at IS NULL
      JOIN files cover_file ON cover_file.file_id = cover_media.thumbnail_file_id
        AND cover_file.deleted_at IS NULL
      WHERE cover_link.market_asset_id = l.market_asset_id
        AND cover_file.path NOT LIKE 'asset-originals/%'
      ORDER BY cover_link.position, cover_media.media_asset_id
      LIMIT 1
    ) AS cover_path
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

/** Originals live under a private prefix; only public derivatives may be rendered directly. */
const PRIVATE_ORIGINAL_PREFIX = 'asset-originals/';

function publicPath(path) {
  const value = String(path || '');
  return value && !value.startsWith(PRIVATE_ORIGINAL_PREFIX) ? value : null;
}

/**
 * Everything a reviewer needs about the market asset behind a listing.
 *
 * JSON keys are snake_case inside SQL: Postgres folds unquoted aliases to lower case, which
 * is why the earlier `AS mediaFiles` column always came back as `mediafiles` (empty list).
 */
async function getListingLinkedAsset(marketAssetId) {
  if (!marketAssetId) return null;

  const result = await pool.query(
    `
    SELECT
      ma.market_asset_id,
      ma.name,
      ma.status,
      ma.description,
      ma.price_credits,
      ma.created_at,
      ma.updated_at,
      COALESCE(
        (
          SELECT typed_media.type
          FROM market_media_assets typed_link
          JOIN media_assets typed_media ON typed_media.media_asset_id = typed_link.media_asset_id
          WHERE typed_link.market_asset_id = ma.market_asset_id
            AND typed_media.deleted_at IS NULL
          ORDER BY typed_link.position, typed_media.media_asset_id
          LIMIT 1
        ),
        CASE WHEN EXISTS (
          SELECT 1 FROM market_ydoc_assets typed_snapshot
          WHERE typed_snapshot.market_asset_id = ma.market_asset_id
        ) THEN 'template' END
      ) AS asset_type,
      COALESCE((
        SELECT json_agg(json_build_object(
          'media_asset_id', thumbnail_media.media_asset_id,
          'path', thumbnail_file.path,
          'position', thumbnail_link.position,
          'is_content', EXISTS (
            SELECT 1 FROM market_media_assets content_check
            WHERE content_check.market_asset_id = ma.market_asset_id
              AND content_check.media_asset_id = thumbnail_media.media_asset_id
          )
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
          'media_asset_id', item.media_asset_id,
          'name', item.name,
          'type', item.type,
          'original_name', item_original.name,
          'mime_type', item_original.mime_type,
          'size_bytes', item_original.size_bytes,
          'uploaded_at', item_original.created_at,
          'width', item.width,
          'height', item.height,
          'duration_seconds', item.duration_seconds,
          'proxy_path', item_proxy.path,
          'thumbnail_path', item_thumbnail.path,
          'processing_status', CASE
            WHEN item_job.status = 'failed' THEN 'failed'
            WHEN item_job.status IN ('pending', 'running') THEN 'processing'
            ELSE 'ready'
          END,
          'processing_error', item_job.error,
          'processing_attempts', item_job.attempts,
          'position', item_link.position
        ) ORDER BY item_link.position, item.media_asset_id)
        FROM market_media_assets item_link
        JOIN media_assets item ON item.media_asset_id = item_link.media_asset_id
        JOIN files item_original ON item_original.file_id = item.original_file_id
        LEFT JOIN files item_proxy ON item_proxy.file_id = item.proxy_file_id
          AND item_proxy.deleted_at IS NULL
        LEFT JOIN files item_thumbnail ON item_thumbnail.file_id = item.thumbnail_file_id
          AND item_thumbnail.deleted_at IS NULL
          AND (item_thumbnail.mime_type LIKE 'image/%'
            OR (item.type = 'video' AND item_thumbnail.mime_type = 'video/mp4'))
        LEFT JOIN media_asset_jobs item_job ON item_job.media_asset_id = item.media_asset_id
        WHERE item_link.market_asset_id = ma.market_asset_id
          AND item.deleted_at IS NULL
          AND item_original.deleted_at IS NULL
      ), '[]'::json) AS media_files,
      (
        SELECT json_build_object(
          'snapshot_bytes', octet_length(snapshot.document),
          'created_at', snapshot.created_at,
          'source_project_id', source.project_id
        )
        FROM market_ydoc_assets template
        JOIN yjs_snapshots snapshot ON snapshot.yjs_snapshot_id = template.yjs_snapshot_id
        LEFT JOIN project_yjs_snapshots source ON source.yjs_snapshot_id = snapshot.yjs_snapshot_id
        WHERE template.market_asset_id = ma.market_asset_id
        LIMIT 1
      ) AS template,
      COALESCE((
        SELECT json_agg(tag.name ORDER BY tag.name)
        FROM market_asset_tags asset_tag
        JOIN tags tag ON tag.tag_id = asset_tag.tag_id
        WHERE asset_tag.market_asset_id = ma.market_asset_id
          AND asset_tag.deleted_at IS NULL
          AND tag.deleted_at IS NULL
      ), '[]'::json) AS tags,
      (SELECT COUNT(*)::int FROM market_asset_licenses license
       WHERE license.market_asset_id = ma.market_asset_id
         AND license.status = 'active' AND license.deleted_at IS NULL) AS active_licenses,
      (SELECT COUNT(*)::int FROM market_asset_licenses license
       WHERE license.market_asset_id = ma.market_asset_id
         AND license.status = 'refunded' AND license.deleted_at IS NULL) AS refunded_licenses,
      (SELECT COUNT(*)::int FROM asset_likes liked
       WHERE liked.market_asset_id = ma.market_asset_id AND liked.deleted_at IS NULL) AS like_count,
      (SELECT COUNT(*)::int FROM asset_reviews review
       WHERE review.market_asset_id = ma.market_asset_id AND review.deleted_at IS NULL) AS review_count,
      (SELECT ROUND(AVG(review.rating)::numeric, 1) FROM asset_reviews review
       WHERE review.market_asset_id = ma.market_asset_id AND review.deleted_at IS NULL) AS average_rating
    FROM market_assets ma
    WHERE ma.market_asset_id = $1
      AND ma.deleted_at IS NULL
    LIMIT 1
    `,
    [marketAssetId]
  );

  const row = result.rows[0];
  if (!row) return null;

  const thumbnails = (Array.isArray(row.thumbnails) ? row.thumbnails : [])
    .map((thumb) => ({
      mediaAssetId: thumb.media_asset_id,
      path: publicPath(thumb.path),
      position: thumb.position,
      isContent: Boolean(thumb.is_content),
    }))
    .filter((thumb) => thumb.path);

  const mediaFiles = (Array.isArray(row.media_files) ? row.media_files : []).map((file) => ({
    mediaAssetId: file.media_asset_id,
    name: file.name,
    type: file.type,
    originalName: file.original_name || null,
    mimeType: file.mime_type || null,
    sizeBytes: file.size_bytes === null ? null : Number(file.size_bytes),
    uploadedAt: file.uploaded_at || null,
    width: file.width ?? null,
    height: file.height ?? null,
    durationSeconds: file.duration_seconds ?? null,
    proxyPath: publicPath(file.proxy_path),
    thumbnailPath: publicPath(file.thumbnail_path),
    processingStatus: file.processing_status || 'ready',
    processingError: file.processing_error || null,
    processingAttempts: Number(file.processing_attempts || 0),
    position: file.position,
  }));

  return {
    id: row.market_asset_id,
    name: row.name,
    status: row.status,
    description: row.description,
    type: row.asset_type || null,
    priceCredits: Number(row.price_credits || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: Array.isArray(row.tags) ? row.tags : [],
    thumbnails,
    mediaFiles,
    template: row.template
      ? {
          snapshotBytes: Number(row.template.snapshot_bytes || 0),
          createdAt: row.template.created_at || null,
          sourceProjectId: row.template.source_project_id || null,
        }
      : null,
    stats: {
      activeLicenses: Number(row.active_licenses || 0),
      refundedLicenses: Number(row.refunded_licenses || 0),
      likes: Number(row.like_count || 0),
      reviews: Number(row.review_count || 0),
      averageRating: row.average_rating === null ? null : Number(row.average_rating),
    },
  };
}

/**
 * Copyright signals: other market assets carrying an upload with the same size and type,
 * or listed under the same title. Same size + type is a strong hint of a re-upload, not proof.
 */
async function getListingDuplicateSignals(marketAssetId, assetName, sellerAccountId) {
  if (!marketAssetId) return [];
  const result = await pool.query(
    `
    WITH mine AS (
      SELECT original.size_bytes, original.mime_type
      FROM market_media_assets link
      JOIN media_assets media ON media.media_asset_id = link.media_asset_id
      JOIN files original ON original.file_id = media.original_file_id
      WHERE link.market_asset_id = $1
        AND media.deleted_at IS NULL
        AND original.deleted_at IS NULL
        AND original.size_bytes >= 51200
    ),
    file_matches AS (
      SELECT DISTINCT ON (other_link.market_asset_id)
        other_link.market_asset_id,
        'file'::text AS matched_on,
        other_media.name AS matched_media
      FROM market_media_assets other_link
      JOIN media_assets other_media ON other_media.media_asset_id = other_link.media_asset_id
      JOIN files other_file ON other_file.file_id = other_media.original_file_id
      JOIN mine ON mine.size_bytes = other_file.size_bytes AND mine.mime_type = other_file.mime_type
      WHERE other_link.market_asset_id <> $1
        AND other_media.deleted_at IS NULL
        AND other_file.deleted_at IS NULL
      ORDER BY other_link.market_asset_id
    ),
    title_matches AS (
      SELECT other.market_asset_id, 'title'::text AS matched_on, NULL::text AS matched_media
      FROM market_assets other
      WHERE other.market_asset_id <> $1
        AND other.deleted_at IS NULL
        AND $2::text <> ''
        AND LOWER(TRIM(other.name)) = LOWER(TRIM($2::text))
    ),
    matches AS (
      SELECT * FROM file_matches
      UNION ALL
      SELECT * FROM title_matches
      WHERE market_asset_id NOT IN (SELECT market_asset_id FROM file_matches)
    )
    SELECT
      matches.market_asset_id,
      matches.matched_on,
      matches.matched_media,
      other_asset.name,
      other_asset.status,
      other_asset.created_at,
      latest.listing_id,
      latest.listing_number,
      latest.status AS listing_status,
      latest.submitted_by_account_id,
      seller.display_name AS seller_name,
      seller.handle AS seller_handle
    FROM matches
    JOIN market_assets other_asset ON other_asset.market_asset_id = matches.market_asset_id
      AND other_asset.deleted_at IS NULL
    LEFT JOIN LATERAL (
      SELECT listing.listing_id, listing.listing_number, listing.status, listing.submitted_by_account_id
      FROM marketplace_listings listing
      WHERE listing.market_asset_id = matches.market_asset_id
      ORDER BY listing.created_at DESC, listing.listing_id DESC
      LIMIT 1
    ) latest ON TRUE
    LEFT JOIN accounts seller ON seller.account_id = latest.submitted_by_account_id
    ORDER BY CASE matches.matched_on WHEN 'file' THEN 0 ELSE 1 END, other_asset.created_at ASC
    LIMIT 10
    `,
    [marketAssetId, String(assetName || '')]
  );

  return result.rows.map((row) => ({
    marketAssetId: row.market_asset_id,
    matchedOn: row.matched_on,
    matchedMedia: row.matched_media || null,
    name: row.name,
    assetStatus: row.status,
    createdAt: row.created_at,
    listingId: row.listing_id || null,
    listingNumber: row.listing_number || null,
    listingStatus: row.listing_status || null,
    seller: row.submitted_by_account_id
      ? {
          accountId: row.submitted_by_account_id,
          name: row.seller_name || 'Unknown',
          handle: row.seller_handle || '—',
        }
      : null,
    sameSeller: Boolean(
      sellerAccountId && String(row.submitted_by_account_id) === String(sellerAccountId)
    ),
  }));
}

/** Reports filed against this listing or its market asset, newest first. */
async function getListingReports(listingId, marketAssetId) {
  const ids = [listingId, marketAssetId].filter(Boolean).map(String);
  if (!ids.length) return { open: 0, total: 0, items: [] };
  const result = await pool.query(
    `
    SELECT report_id, report_number, type, status, priority, created_at,
           NOT (LOWER(status) = ANY($2::text[])) AS is_open,
           COUNT(*) OVER()::int AS total_count,
           COUNT(*) FILTER (WHERE NOT (LOWER(status) = ANY($2::text[]))) OVER()::int AS open_count
    FROM reports
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(target_type, '')) IN ('asset', 'listing')
      AND target_id = ANY($1::text[])
    ORDER BY created_at DESC
    LIMIT 10
    `,
    [ids, [...CLOSED_REPORT_STATUSES]]
  );
  const first = result.rows[0];
  return {
    open: Number(first?.open_count || 0),
    total: Number(first?.total_count || 0),
    items: result.rows.map((row) => ({
      id: row.report_id,
      number: row.report_number,
      type: row.type,
      status: row.status,
      priority: row.priority,
      isOpen: Boolean(row.is_open),
      createdAt: row.created_at,
    })),
  };
}

/** Seller standing at a glance, so the reviewer does not have to open a second window. */
async function getListingSellerContext(accountId) {
  if (!accountId) return null;
  const [accountResult, warningPoints] = await Promise.all([
    pool.query(
      `
      SELECT
        a.account_id,
        a.status,
        a.created_at,
        (SELECT COUNT(*)::int FROM marketplace_listings l WHERE l.submitted_by_account_id = a.account_id) AS total,
        (SELECT COUNT(*)::int FROM marketplace_listings l
         WHERE l.submitted_by_account_id = a.account_id AND l.status = 'approved') AS approved,
        (SELECT COUNT(*)::int FROM marketplace_listings l
         WHERE l.submitted_by_account_id = a.account_id AND l.status = 'rejected') AS rejected,
        (SELECT COUNT(*)::int FROM marketplace_listings l
         WHERE l.submitted_by_account_id = a.account_id AND l.status = 'delisted') AS delisted,
        (SELECT COUNT(*)::int FROM marketplace_listings l
         WHERE l.submitted_by_account_id = a.account_id AND l.status = 'pending') AS pending
      FROM accounts a
      WHERE a.account_id = $1
      LIMIT 1
      `,
      [accountId]
    ),
    sumActiveWarningPoints(accountId).catch(() => 0),
  ]);
  const row = accountResult.rows[0];
  if (!row) return null;
  return {
    accountId: row.account_id,
    status: row.status || 'active',
    joinedAt: row.created_at || null,
    merit: meritFromWarningPoints(warningPoints),
    listings: {
      total: Number(row.total || 0),
      approved: Number(row.approved || 0),
      rejected: Number(row.rejected || 0),
      delisted: Number(row.delisted || 0),
      pending: Number(row.pending || 0),
    },
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
  const [asset, seller, reports, history] = await Promise.all([
    getListingLinkedAsset(listing.marketAssetId),
    getListingSellerContext(listing.submittedBy.accountId),
    getListingReports(listing.id, listing.marketAssetId),
    listActivityForReference('marketplace_listings', listing.id, { limit: 25 }).catch(() => []),
  ]);
  listing.asset = asset;
  listing.seller = seller;
  listing.reports = reports;
  listing.reviewHistory = history.map((entry) => ({
    id: entry.id,
    action: entry.action,
    eventCode: entry.eventCode,
    actorName: entry.actorName,
    actorRole: entry.actorRole,
    status: entry.metadata?.status || null,
    reason: entry.metadata?.rejectionReason || entry.metadata?.moderationNote || null,
    fileName: entry.metadata?.fileName || null,
    createdAt: entry.createdAt,
  }));
  listing.duplicates = asset
    ? await getListingDuplicateSignals(asset.id, asset.name, listing.submittedBy.accountId).catch(
        (err) => {
          console.warn('Listing duplicate check skipped:', err.message);
          return [];
        }
      )
    : [];
  return listing;
}

/**
 * The stored original behind one media item of a listing. Only media linked to this listing's
 * market asset (as content or as a showcase image) resolves, so ids cannot be swapped.
 */
async function getListingMediaOriginal(listingId, mediaAssetId) {
  const result = await pool.query(
    `
    SELECT
      l.listing_id,
      l.listing_number,
      l.title,
      l.submitted_by_account_id,
      media.media_asset_id,
      media.name AS media_name,
      original.path,
      original.name AS original_name,
      original.mime_type,
      original.size_bytes
    FROM marketplace_listings l
    JOIN media_assets media ON media.media_asset_id = $2
      AND media.deleted_at IS NULL
    JOIN files original ON original.file_id = media.original_file_id
      AND original.deleted_at IS NULL
    WHERE l.listing_id = $1
      AND l.market_asset_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM market_media_assets link
          WHERE link.market_asset_id = l.market_asset_id AND link.media_asset_id = media.media_asset_id
        )
        OR EXISTS (
          SELECT 1 FROM market_asset_thumbnails link
          WHERE link.market_asset_id = l.market_asset_id AND link.media_asset_id = media.media_asset_id
        )
      )
    LIMIT 1
    `,
    [listingId, mediaAssetId]
  );
  return result.rows[0] || null;
}

/** True when this staff member already opened this file in the last hour (keeps the audit log readable). */
async function hasRecentListingFileView(listingId, mediaAssetId, staffId) {
  if (!staffId) return false;
  const result = await pool.query(
    `
    SELECT 1
    FROM account_activity
    WHERE event_code = 'LISTING_FILE_VIEWED'
      AND reference_table = 'marketplace_listings'
      AND reference_id = $1
      AND actor_staff_id = $2
      AND metadata->>'mediaAssetId' = $3
      AND created_at >= NOW() - INTERVAL '1 hour'
    LIMIT 1
    `,
    [String(listingId), staffId, String(mediaAssetId)]
  );
  return result.rows.length > 0;
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

async function getMarketplaceTickets({ status } = {}) {
  return fetchScopedTickets({ ...MARKETPLACE_TICKET_SCOPE, status });
}

async function getMarketplaceReports({ status } = {}) {
  return fetchScopedReports({ targetTypesIn: [...MARKETPLACE_REPORT_TYPES], status });
}

/**
 * Report counters by status group plus throughput. Reports have no resolved_at column, so a
 * closed report's `updated_at` stands in for when it was decided.
 */
async function getMarketplaceReportBreakdown(targetTypesIn) {
  const params = [
    targetTypesIn,
    REPORT_OPEN_STATUSES,
    REPORT_REVIEW_STATUSES,
    REPORT_RESOLVED_STATUSES,
    REPORT_DISMISSED_STATUSES,
    [...CLOSED_REPORT_STATUSES],
  ];
  const [result, typeResult, reasonResult] = await Promise.all([
    pool.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(status) = ANY($2::text[]))::int AS open_status,
        COUNT(*) FILTER (WHERE LOWER(status) = ANY($3::text[]))::int AS in_review,
        COUNT(*) FILTER (WHERE LOWER(status) = ANY($4::text[]))::int AS resolved,
        COUNT(*) FILTER (WHERE LOWER(status) = 'sanctioned')::int AS sanctioned,
        COUNT(*) FILTER (WHERE LOWER(status) = ANY($5::text[]))::int AS dismissed,
        COUNT(*) FILTER (
          WHERE LOWER(status) <> ALL($6::text[]) AND assigned_staff_id IS NULL
        )::int AS unassigned,
        COUNT(*) FILTER (
          WHERE LOWER(priority) = 'high' AND LOWER(status) <> ALL($6::text[])
        )::int AS high_priority,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS filed_7d,
        COUNT(*) FILTER (
          WHERE LOWER(status) = ANY($6::text[]) AND updated_at >= NOW() - INTERVAL '7 days'
        )::int AS decided_7d,
        MIN(created_at) FILTER (WHERE LOWER(status) <> ALL($6::text[])) AS oldest_open_at,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) FILTER (
          WHERE LOWER(status) = ANY($6::text[]) AND updated_at >= NOW() - INTERVAL '30 days'
        ) AS avg_resolution_seconds
      FROM reports
      WHERE deleted_at IS NULL
        AND LOWER(COALESCE(target_type, type)) = ANY($1::text[])
      `,
      params
    ),
    pool.query(
      `
      SELECT LOWER(COALESCE(target_type, type)) AS target_type, COUNT(*)::int AS count
      FROM reports
      WHERE deleted_at IS NULL
        AND LOWER(COALESCE(target_type, type)) = ANY($1::text[])
      GROUP BY 1
      ORDER BY count DESC
      `,
      [targetTypesIn]
    ),
    // Why members report marketplace items (the reason they picked), open cases only.
    pool.query(
      `
      SELECT COALESCE(NULLIF(TRIM(type), ''), 'Other') AS reason, COUNT(*)::int AS count
      FROM reports
      WHERE deleted_at IS NULL
        AND LOWER(COALESCE(target_type, type)) = ANY($1::text[])
        AND LOWER(COALESCE(status, 'open')) <> ALL($2::text[])
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 6
      `,
      [targetTypesIn, [...CLOSED_REPORT_STATUSES]]
    ),
  ]);
  const c = result.rows[0] || {};
  return {
    counts: {
      total: Number(c.total || 0),
      openStatus: Number(c.open_status || 0),
      inReview: Number(c.in_review || 0),
      resolved: Number(c.resolved || 0),
      sanctioned: Number(c.sanctioned || 0),
      dismissed: Number(c.dismissed || 0),
      unassigned: Number(c.unassigned || 0),
      highPriority: Number(c.high_priority || 0),
      openCount: Number(c.open_status || 0) + Number(c.in_review || 0),
      filedLast7d: Number(c.filed_7d || 0),
      decidedLast7d: Number(c.decided_7d || 0),
      oldestOpenAt: c.oldest_open_at || null,
      avgResolutionHours: hoursFromSeconds(c.avg_resolution_seconds),
    },
    byType: typeResult.rows.map((r) => ({
      label: String(r.target_type || 'other')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase()),
      value: Number(r.count),
    })),
    byReason: reasonResult.rows.map((r) => ({ label: r.reason, value: Number(r.count) })),
  };
}

/**
 * Response health for the marketplace ticket queue. "Overdue" matches the rule the ticket rows
 * use: no staff reply within 24 hours, or open for more than 72 hours.
 */
async function getMarketplaceTicketSla() {
  const result = await pool.query(
    `
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
          AND (
            (t.first_staff_reply_at IS NULL AND t.created_at < NOW() - INTERVAL '24 hours')
            OR t.created_at < NOW() - INTERVAL '72 hours'
          )
      )::int AS overdue,
      COUNT(*) FILTER (WHERE t.created_at >= NOW() - INTERVAL '7 days')::int AS opened_7d,
      COUNT(*) FILTER (WHERE t.resolved_at >= NOW() - INTERVAL '7 days')::int AS closed_7d,
      AVG(EXTRACT(EPOCH FROM (t.first_staff_reply_at - t.created_at))) FILTER (
        WHERE t.first_staff_reply_at IS NOT NULL AND t.created_at >= NOW() - INTERVAL '30 days'
      ) AS avg_first_reply_seconds,
      AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))) FILTER (
        WHERE t.resolved_at >= NOW() - INTERVAL '30 days'
      ) AS avg_resolution_seconds,
      AVG(t.satisfaction_score) FILTER (WHERE t.satisfaction_score IS NOT NULL) AS avg_satisfaction,
      COUNT(*) FILTER (WHERE t.satisfaction_score IS NOT NULL)::int AS rated
    FROM tickets t
    WHERE ${MARKETPLACE_TICKET_WHERE}
    `,
    [[...MARKETPLACE_TYPES]]
  );
  const row = result.rows[0] || {};
  const satisfaction = row.avg_satisfaction === null ? null : Number(row.avg_satisfaction);
  return {
    oldestOpenAt: row.oldest_open_at || null,
    oldestUnassignedAt: row.oldest_unassigned_at || null,
    awaitingFirstReply: Number(row.awaiting_first_reply || 0),
    overdue: Number(row.overdue || 0),
    openedLast7d: Number(row.opened_7d || 0),
    closedLast7d: Number(row.closed_7d || 0),
    avgFirstReplyHours: hoursFromSeconds(row.avg_first_reply_seconds),
    avgResolutionHours: hoursFromSeconds(row.avg_resolution_seconds),
    avgSatisfaction:
      satisfaction === null || Number.isNaN(satisfaction) ? null : Math.round(satisfaction * 10) / 10,
    ratedTickets: Number(row.rated || 0),
  };
}

/** Daily intake and decisions for the last 14 days (listings, tickets, reports). */
async function getMarketplaceActivity(reportTypes) {
  const result = await pool.query(
    `
    WITH days AS (
      SELECT generate_series(
        (CURRENT_DATE - 13)::timestamp,
        CURRENT_DATE::timestamp,
        INTERVAL '1 day'
      )::date AS day
    )
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS day,
      (SELECT COUNT(*) FROM marketplace_listings l WHERE l.created_at::date = d.day)::int AS submitted,
      (SELECT COUNT(*) FROM marketplace_listings l WHERE l.reviewed_at::date = d.day)::int AS decided,
      (SELECT COUNT(*) FROM tickets t
        WHERE t.deleted_at IS NULL AND t.type = ANY($1::text[]) AND t.created_at::date = d.day)::int AS tickets_opened,
      (SELECT COUNT(*) FROM tickets t
        WHERE t.deleted_at IS NULL AND t.type = ANY($1::text[]) AND t.resolved_at::date = d.day)::int AS tickets_closed,
      (SELECT COUNT(*) FROM reports r
        WHERE r.deleted_at IS NULL
          AND LOWER(COALESCE(r.target_type, r.type)) = ANY($2::text[])
          AND r.created_at::date = d.day)::int AS reports_filed
    FROM days d
    ORDER BY d.day
    `,
    [[...MARKETPLACE_TYPES], reportTypes]
  );
  return result.rows.map((row) => ({
    day: String(row.day),
    submitted: Number(row.submitted || 0),
    decided: Number(row.decided || 0),
    ticketsOpened: Number(row.tickets_opened || 0),
    ticketsClosed: Number(row.tickets_closed || 0),
    reportsFiled: Number(row.reports_filed || 0),
  }));
}

/**
 * The marketplace team's live load: open marketplace tickets and reports each person holds,
 * and what they closed in the last 7 days. Admins appear only while they hold marketplace work.
 */
async function getMarketplaceTeam(reportTypes) {
  const result = await pool.query(
    `
    WITH team AS (
      SELECT
        s.staff_id,
        s.role,
        COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name,
        a.handle,
        (SELECT COUNT(*) FROM tickets t
          WHERE t.handled_by_staff_id = s.staff_id AND ${OPEN_TICKET_SQL}
            AND t.deleted_at IS NULL AND t.type = ANY($1::text[]))::int AS open_tickets,
        (SELECT COUNT(*) FROM reports r
          WHERE r.assigned_staff_id = s.staff_id AND r.deleted_at IS NULL
            AND LOWER(COALESCE(r.status, 'open')) <> ALL($3::text[])
            AND LOWER(COALESCE(r.target_type, r.type)) = ANY($2::text[]))::int AS open_reports,
        (SELECT COUNT(*) FROM marketplace_listings l
          WHERE l.reviewed_by_staff_id = s.staff_id
            AND l.reviewed_at >= NOW() - INTERVAL '7 days')::int AS reviews_7d,
        (SELECT COUNT(*) FROM tickets t
          WHERE t.handled_by_staff_id = s.staff_id AND t.deleted_at IS NULL
            AND t.type = ANY($1::text[])
            AND t.resolved_at >= NOW() - INTERVAL '7 days')::int AS tickets_closed_7d
      FROM staff s
      INNER JOIN accounts a ON a.account_id = s.account_id
      WHERE a.deleted_at IS NULL
        AND LOWER(s.role::text) IN ('marketplace moderator', 'admin', 'administrator')
    )
    SELECT * FROM team
    WHERE LOWER(role::text) = 'marketplace moderator' OR open_tickets + open_reports > 0
    ORDER BY open_tickets + open_reports DESC, reviews_7d DESC, name
    `,
    [[...MARKETPLACE_TYPES], reportTypes, [...CLOSED_REPORT_STATUSES]]
  );
  return result.rows.map((row) => ({
    staffId: row.staff_id,
    name: row.name || 'Staff member',
    handle: row.handle || null,
    role: row.role,
    openTickets: Number(row.open_tickets || 0),
    openReports: Number(row.open_reports || 0),
    reviewsLast7d: Number(row.reviews_7d || 0),
    ticketsClosedLast7d: Number(row.tickets_closed_7d || 0),
  }));
}

/** Sellers with the most open marketplace reports against them — the repeat-offender signal. */
async function getSellersToWatch(reportTypes) {
  const result = await pool.query(
    `
    SELECT
      r.for_account_id AS account_id,
      COALESCE(a.display_name, u.first_name || ' ' || u.last_name, 'Unknown') AS name,
      a.handle,
      a.status,
      COUNT(*) FILTER (WHERE LOWER(COALESCE(r.status, 'open')) <> ALL($2::text[]))::int AS open_reports,
      COUNT(*)::int AS total_reports,
      COUNT(*) FILTER (WHERE LOWER(r.status) = 'sanctioned')::int AS sanctioned,
      MAX(r.created_at) AS last_reported_at,
      (SELECT COUNT(*) FROM marketplace_listings l
        WHERE l.submitted_by_account_id = r.for_account_id AND l.status = 'approved')::int AS live_listings,
      (SELECT COUNT(*) FROM marketplace_listings l
        WHERE l.submitted_by_account_id = r.for_account_id
          AND l.status IN ('rejected', 'delisted'))::int AS removed_listings
    FROM reports r
    INNER JOIN accounts a ON a.account_id = r.for_account_id
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE r.deleted_at IS NULL
      AND r.for_account_id IS NOT NULL
      AND r.for_account_id IS DISTINCT FROM r.by_account_id
      AND LOWER(COALESCE(r.target_type, r.type)) = ANY($1::text[])
    GROUP BY r.for_account_id, a.display_name, u.first_name, u.last_name, a.handle, a.status
    HAVING COUNT(*) FILTER (WHERE LOWER(COALESCE(r.status, 'open')) <> ALL($2::text[])) > 0
    ORDER BY open_reports DESC, total_reports DESC, last_reported_at DESC
    LIMIT 6
    `,
    [reportTypes, [...CLOSED_REPORT_STATUSES]]
  );
  return result.rows.map((row) => ({
    accountId: row.account_id,
    name: row.name,
    handle: row.handle || null,
    status: row.status || 'active',
    openReports: Number(row.open_reports || 0),
    totalReports: Number(row.total_reports || 0),
    sanctioned: Number(row.sanctioned || 0),
    liveListings: Number(row.live_listings || 0),
    removedListings: Number(row.removed_listings || 0),
    lastReportedAt: row.last_reported_at || null,
  }));
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
    ticketSla,
    activity,
    team,
    sellersToWatch,
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
    scopedTicketCounts(MARKETPLACE_TICKET_SCOPE),
    scopedTicketCategoryBreakdown(MARKETPLACE_TICKET_SCOPE),
    scopedReportCounts({ targetTypesIn: marketplaceTypes }),
    getMarketplaceReportBreakdown(marketplaceTypes),
    pool.query(`SELECT COUNT(*)::int AS count FROM accounts WHERE LOWER(status) IN ('suspended', 'banned')`),
    getMarketplaceTickets(),
    getMarketplaceReports(),
    fetchListings({ status: 'all', limit: 8 }),
    // Powers the handler filters on this console's report and dispute desks (disputes are
    // worked by Support, so this stays the full staff list).
    fetchStaffWorkload(),
    getListingQueueHealth(marketplaceTypes),
    getMarketplaceTicketSla(),
    getMarketplaceActivity(marketplaceTypes),
    getMarketplaceTeam(marketplaceTypes),
    getSellersToWatch(marketplaceTypes),
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
    { label: 'Denied', value: rb.dismissed, color: '#a1a1aa' },
  ].filter((x) => x.value > 0);

  const isOpenTicket = (t) => t.status !== 'Closed';
  const isOpenReport = (r) => !CLOSED_REPORT_STATUSES.includes(String(r.status || '').toLowerCase());
  // Work queues: active cases first (already priority-ordered), then the latest closed ones.
  const activeTickets = [...tickets.filter(isOpenTicket), ...tickets.filter((t) => !isOpenTicket(t))];
  const activeReports = [...reports.filter(isOpenReport), ...reports.filter((r) => !isOpenReport(r))];

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
      sanctionedReports: rb.sanctioned,
      deniedReports: rb.dismissed,
      restrictedAccounts: Number(restrictedCount.rows[0].count),
      ...queueHealth,
    },
    queueHealth,
    ticketSla,
    reportSla: {
      filedLast7d: rb.filedLast7d,
      decidedLast7d: rb.decidedLast7d,
      oldestOpenAt: rb.oldestOpenAt,
      avgResolutionHours: rb.avgResolutionHours,
    },
    activity,
    team,
    sellersToWatch,
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
      reportReasons: reportBreakdown.byReason,
    },
    recentListings: recentListings.slice(0, 8),
    recentTickets: activeTickets.slice(0, 10),
    flaggedReports: activeReports.slice(0, 10),
    staffWorkload,
    alerts: buildMarketplaceAlerts(lc, tc, reportBreakdown, queueHealth, ticketSla),
    dataSources: {
      tables: ['marketplace_listings', 'tickets', 'reports', 'accounts'],
      persisted: true,
    },
  };
}

const ALERT_RANK = { error: 0, warning: 1, info: 2, success: 3 };

function plural(count, one, many = `${one}s`) {
  return Number(count) === 1 ? one : many;
}

/**
 * The dashboard's "needs attention" list. Each entry carries a count, a one-line explanation
 * and a deep link (`action.tab` + `action.query`) into the desk that clears it. Ranked by
 * severity, so the most urgent work is always on top.
 */
function buildMarketplaceAlerts(lc, tc, reportBreakdown, queueHealth = {}, ticketSla = {}) {
  const alerts = [];
  const rb = reportBreakdown?.counts || {};
  const add = (id, count, severity, title, detail, tab, query) => {
    if (!(Number(count) > 0)) return;
    alerts.push({
      id,
      count: Number(count),
      severity,
      title,
      detail,
      message: `${title}: ${count}`,
      action: { tab, query: query || null, ticketFilters: tab === 'ticket-management' ? query || {} : undefined },
    });
  };

  add(
    'aging-listings',
    queueHealth.pendingOver48h,
    'error',
    `${plural(queueHealth.pendingOver48h, 'Listing')} past the 48h review target`,
    queueHealth.pendingOver7d > 0
      ? `${queueHealth.pendingOver7d} have waited more than 7 days.`
      : 'Oldest submissions first in Marketplace Control.',
    'marketplace-control'
  );
  add(
    'copyright-reports',
    queueHealth.copyrightReports,
    'error',
    `Open copyright ${plural(queueHealth.copyrightReports, 'report')}`,
    'Review the live asset and delist or send it back for re-approval.',
    'reports',
    { q: 'copyright' }
  );
  add(
    'overdue-tickets',
    ticketSla.overdue,
    'error',
    `Overdue ${plural(ticketSla.overdue, 'ticket')}`,
    'No staff reply in 24h, or open for more than 72h.',
    'ticket-management',
    { flag: 'overdue' }
  );
  add(
    'high-priority',
    tc.high_priority,
    'error',
    `High-priority ${plural(tc.high_priority, 'ticket')}`,
    'Open marketplace tickets marked high priority.',
    'ticket-management',
    { priority: 'High' }
  );
  add(
    'high-reports',
    rb.highPriority,
    'error',
    `High-priority ${plural(rb.highPriority, 'report')}`,
    'Open marketplace reports marked high priority.',
    'reports',
    { priority: 'high' }
  );
  add(
    'pending-listings',
    Number(lc.pending) - Number(queueHealth.pendingOver48h || 0),
    'warning',
    `${plural(Number(lc.pending) - Number(queueHealth.pendingOver48h || 0), 'Listing')} awaiting review`,
    'Submitted within the last 48 hours.',
    'marketplace-control'
  );
  add(
    'unassigned',
    tc.unassigned,
    'warning',
    `Unassigned ${plural(tc.unassigned, 'ticket')}`,
    'Claim one from the ticket desk to start working it.',
    'ticket-management',
    { assignee: 'unassigned' }
  );
  add(
    'awaiting-reply',
    tc.awaiting_reply,
    'warning',
    `${plural(tc.awaiting_reply, 'Ticket')} awaiting a staff reply`,
    'The member wrote last.',
    'ticket-management',
    { flag: 'awaiting' }
  );
  add(
    'unassigned-reports',
    rb.unassigned,
    'warning',
    `Unassigned ${plural(rb.unassigned, 'report')}`,
    'Claim a report before you sanction or deny it.',
    'reports',
    { assignee: 'unassigned' }
  );
  add(
    'escalated',
    tc.escalated,
    'info',
    `${plural(tc.escalated, 'Ticket')} moved into this desk`,
    'Sent here by another desk or by Admin.',
    'ticket-management',
    { flag: 'escalated' }
  );

  alerts.sort((a, b) => ALERT_RANK[a.severity] - ALERT_RANK[b.severity] || b.count - a.count);
  if (!alerts.length) {
    alerts.push({
      id: 'clear',
      count: 0,
      severity: 'success',
      title: 'Marketplace queue is clear',
      detail: 'No listings, tickets or reports need attention right now.',
      message: 'Marketplace queue is clear.',
      action: null,
    });
  }
  return alerts;
}

module.exports = {
  getMarketplaceOverview,
  getMarketplaceListings,
  getMarketplaceListingDetail,
  getListingMediaOriginal,
  hasRecentListingFileView,
  getSellerMarketplaceListings,
  reviewMarketplaceListing,
  getMarketplaceTickets,
  getMarketplaceReports,
};
