const { pool } = require('../lib/Database');
const {
  DEFAULT_MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT,
  calculateAssetTransactionFee,
} = require('../lib/AssetMarketplaceConstants');

function mediaTypeFromMime(mimeType) {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType?.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'document';
  if (['application/zip', 'application/x-zip-compressed'].includes(mimeType)) return 'archive';
  return null;
}

const MAX_SHOWCASE_IMAGES = 6;
const MAX_CONTENT_FILES = 20;
const MAX_MARKET_MEDIA_NAME_LENGTH = 50;
const LINK_TABLES = new Set(['market_media_assets', 'market_asset_thumbnails']);

function formatMarketMediaName(name, suffix = '') {
  const nameCharacters = Array.from(name || '');
  const suffixLength = Array.from(suffix).length;
  const availableNameLength = Math.max(0, MAX_MARKET_MEDIA_NAME_LENGTH - suffixLength);
  const clippedName = nameCharacters.length > availableNameLength
    ? nameCharacters.slice(0, availableNameLength).join('').trimEnd()
    : name;
  return `${clippedName}${suffix}`;
}

function repoError(code, extra = {}) {
  const error = new Error(code);
  error.code = code;
  return Object.assign(error, extra);
}

async function insertFileRow(client, file) {
  const { rows: [row] } = await client.query(
    `INSERT INTO files (name, path, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4)
     RETURNING file_id`,
    [file.name, file.path, file.mimeType, file.sizeBytes]
  );
  return row.file_id;
}

// Loads the uploaded files of a create/update request under row locks and validates them.
// Proxies and thumbnails of the content files are always made by the server, never uploaded.
async function loadValidatedUploads(client, accountId, content) {
  const { originalFileIds, thumbnailFileIds } = content;
  const fileIds = [...originalFileIds, ...thumbnailFileIds];
  if (fileIds.length === 0) return { originals: [], thumbnails: [] };

  const ownedFiles = await client.query(
    `SELECT f.file_id, f.name, f.path, f.mime_type, f.size_bytes
     FROM files f
     JOIN upload_intents ui ON ui.file_id = f.file_id
     WHERE f.file_id = ANY($1::uuid[]) AND ui.account_id = $2
       AND ui.status = 'consumed' AND ui.consumed_at IS NOT NULL
       AND f.deleted_at IS NULL
     FOR UPDATE OF f`,
    [fileIds, accountId]
  );
  const filesById = new Map(ownedFiles.rows.map((file) => [String(file.file_id), file]));
  const originals = originalFileIds.map((fileId) => filesById.get(String(fileId)));
  const thumbnails = thumbnailFileIds.map((fileId) => filesById.get(String(fileId)));
  if (originals.some((file) => !file) || thumbnails.some((file) => !file)) {
    throw repoError('ASSET_FILE_NOT_OWNED');
  }

  const originalTypes = originals.map((file) => mediaTypeFromMime(file.mime_type));
  if (originalTypes.some((type) => type !== content.type)
    || thumbnails.some((file) => !file.mime_type?.startsWith('image/'))) {
    throw repoError('ASSET_FILE_TYPE_MISMATCH');
  }

  for (let index = 0; index < originals.length; index += 1) {
    const sizeBytes = Number(originals[index].size_bytes);
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > content.maxUploadFileBytes) {
      throw repoError('ASSET_ORIGINAL_FILE_TOO_LARGE');
    }
  }
  const totalShowcaseBytes = thumbnails.reduce((total, file) => total + Number(file.size_bytes), 0);
  if (thumbnails.some((file) => !Number.isSafeInteger(Number(file.size_bytes))
    || Number(file.size_bytes) <= 0) || totalShowcaseBytes > content.maxShowcaseTotalBytes) {
    throw repoError('ASSET_THUMBNAIL_INVALID');
  }
  if (originals.some((file) => !file.path.startsWith('asset-originals/'))
    || thumbnails.some((file) => !file.path.startsWith('assets/'))) {
    throw repoError('ASSET_FILE_PLACEMENT_INVALID');
  }

  const alreadyUsed = await client.query(
    `SELECT 1
     FROM media_assets m
     WHERE m.deleted_at IS NULL
       AND (m.original_file_id = ANY($1::uuid[])
         OR m.proxy_file_id = ANY($1::uuid[])
         OR m.thumbnail_file_id = ANY($1::uuid[]))
     LIMIT 1`,
    [fileIds]
  );
  if (alreadyUsed.rowCount) throw repoError('ASSET_FILE_ALREADY_USED');
  return { originals, thumbnails };
}

async function assertYdocSnapshot(client, snapshotId) {
  const { rowCount } = await client.query(
    `SELECT 1
     FROM yjs_snapshots snapshot
     WHERE snapshot.yjs_snapshot_id = $1::bigint
       AND NOT EXISTS (
         SELECT 1 FROM market_ydoc_assets used
         WHERE used.yjs_snapshot_id = snapshot.yjs_snapshot_id
       )`,
    [snapshotId]
  );
  if (!rowCount) throw repoError('ASSET_YDOC_INVALID');
}

async function setMarketYdoc(client, marketAssetId, snapshotId) {
  await assertYdocSnapshot(client, snapshotId);
  await client.query(
    `INSERT INTO market_ydoc_assets (market_asset_id, yjs_snapshot_id)
     VALUES ($1, $2::bigint)
     ON CONFLICT (market_asset_id)
     DO UPDATE SET yjs_snapshot_id = EXCLUDED.yjs_snapshot_id`,
    [marketAssetId, snapshotId]
  );
}

// Uploaded showcase images get their own media rows; selected content media rows are linked directly.
async function createThumbnailMediaAssets(client, { marketAssetId, name, ownerUserId, startPosition, thumbnails }) {
  for (let index = 0; index < thumbnails.length; index += 1) {
    const file = thumbnails[index];
    const position = startPosition + index;
    const { rows: [media] } = await client.query(
      `INSERT INTO media_assets
         (name, type, is_marketed, owner_user_id, original_file_id, proxy_file_id, thumbnail_file_id)
       VALUES ($1, 'image', TRUE, $2, $3, $3, $3)
       RETURNING media_asset_id`,
      [formatMarketMediaName(name, ` - Thumbnail ${position + 1}`), ownerUserId, file.file_id]
    );
    await client.query(
      `INSERT INTO market_asset_thumbnails (market_asset_id, media_asset_id, position)
       VALUES ($1, $2, $3)`,
      [marketAssetId, media.media_asset_id, position]
    );
    await client.query(
      `INSERT INTO media_asset_jobs (media_asset_id, market_asset_id, kind)
       VALUES ($1, $2, 'image')`, [media.media_asset_id, marketAssetId]
    );
  }
}

async function linkShowcaseMediaAssets(client, marketAssetId, mediaAssetIds, startPosition = 0) {
  for (let index = 0; index < mediaAssetIds.length; index += 1) {
    await client.query(
      `INSERT INTO market_asset_thumbnails (market_asset_id, media_asset_id, position)
       VALUES ($1, $2, $3) ON CONFLICT (market_asset_id, media_asset_id)
       DO UPDATE SET position = EXCLUDED.position`,
      [marketAssetId, mediaAssetIds[index], startPosition + index]
    );
  }
}

// One media asset per content file; only bundled files get a numbered suffix.
// All previews are generated by the durable worker after the listing is saved.
async function createContentMediaAssets(client, {
  marketAssetId, name, ownerUserId, type, startPosition,
  originals, derivatives, coverFileId, publishStatus = null,
}) {
  for (let index = 0; index < originals.length; index += 1) {
    const original = originals[index];
    let proxyFileId = null;
    let thumbnailFileId = type === 'audio' ? null : coverFileId;
    let width = null;
    let height = null;
    const derivative = type === 'image' && derivatives.get(String(original.file_id));
    if (derivative) {
      thumbnailFileId = await insertFileRow(client, derivative.thumbnail);
      proxyFileId = await insertFileRow(client, derivative.proxy);
      width = derivative.width;
      height = derivative.height;
    }
    const position = startPosition + index;
    const suffix = startPosition + originals.length > 1 ? ` - ${position + 1}` : '';
    const mediaName = formatMarketMediaName(name, suffix);
    const { rows: [media] } = await client.query(
      `INSERT INTO media_assets
         (name, type, width, height, is_marketed, owner_user_id,
          original_file_id, proxy_file_id, thumbnail_file_id)
       VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, $8)
       RETURNING media_asset_id`,
      [mediaName, type, width, height,
        ownerUserId, original.file_id, proxyFileId, thumbnailFileId]
    );
    await client.query(
      `INSERT INTO market_media_assets (market_asset_id, media_asset_id, position)
       VALUES ($1, $2, $3)`,
      [marketAssetId, media.media_asset_id, position]
    );
    if (!derivative) {
      await client.query(
        `INSERT INTO media_asset_jobs (media_asset_id, market_asset_id, kind, publish_status)
         VALUES ($1, $2, $3, $4)`,
        [media.media_asset_id, marketAssetId, type, publishStatus]
      );
    }
  }
}

async function readCoverFileId(client, marketAssetId) {
  const { rows: [row] } = await client.query(
    `SELECT m.thumbnail_file_id
     FROM market_asset_thumbnails link
     JOIN media_assets m ON m.media_asset_id = link.media_asset_id
     WHERE link.market_asset_id = $1 AND m.deleted_at IS NULL
     ORDER BY link.position, m.media_asset_id
     LIMIT 1`,
    [marketAssetId]
  );
  return row?.thumbnail_file_id || null;
}

async function retireMediaAssets(client, mediaAssetIds) {
  if (mediaAssetIds.length === 0) return;
  await client.query(
    `UPDATE media_assets
     SET is_marketed = FALSE, deleted_at = CURRENT_TIMESTAMP
     WHERE media_asset_id = ANY($1::uuid[])`,
    [mediaAssetIds]
  );
}

async function retireUnlinkedMediaAssets(client, mediaAssetIds) {
  if (mediaAssetIds.length === 0) return;
  await client.query(
    `UPDATE media_assets media
     SET is_marketed = FALSE, deleted_at = CURRENT_TIMESTAMP
     WHERE media.media_asset_id = ANY($1::uuid[])
       AND NOT EXISTS (
         SELECT 1 FROM market_media_assets content_link
         WHERE content_link.media_asset_id = media.media_asset_id
       )`,
    [mediaAssetIds]
  );
}

async function repositionLinks(client, table, marketAssetId, orderedMediaAssetIds) {
  if (!LINK_TABLES.has(table)) throw new Error('Unsupported link table');
  if (orderedMediaAssetIds.length === 0) return;
  await client.query(
    `UPDATE ${table} link
     SET position = ordered.ordinality::integer - 1
     FROM unnest($2::uuid[]) WITH ORDINALITY AS ordered(media_asset_id, ordinality)
     WHERE link.market_asset_id = $1 AND link.media_asset_id = ordered.media_asset_id`,
    [marketAssetId, orderedMediaAssetIds]
  );
}

async function resolveShowcaseOrder(client, marketAssetId, showcaseOrder) {
  if (showcaseOrder.length === 0) return [];
  const { rows } = await client.query(
    `SELECT link.media_asset_id, media.original_file_id, 'content' AS source
     FROM market_media_assets link
     JOIN media_assets media ON media.media_asset_id = link.media_asset_id
     WHERE link.market_asset_id = $1 AND media.deleted_at IS NULL
     UNION ALL
     SELECT link.media_asset_id, media.original_file_id, 'showcase' AS source
     FROM market_asset_thumbnails link
     JOIN media_assets media ON media.media_asset_id = link.media_asset_id
     WHERE link.market_asset_id = $1 AND media.deleted_at IS NULL`,
    [marketAssetId]
  );
  const contentByFileId = new Map();
  const showcaseByFileId = new Map();
  const showcaseByMediaId = new Map();
  for (const row of rows) {
    const mediaId = String(row.media_asset_id);
    if (row.source === 'content') contentByFileId.set(String(row.original_file_id), mediaId);
    else {
      showcaseByFileId.set(String(row.original_file_id), mediaId);
      showcaseByMediaId.set(mediaId, mediaId);
    }
  }
  const resolved = showcaseOrder.map((entry) => {
    const separator = entry.indexOf(':');
    const kind = entry.slice(0, separator);
    const id = entry.slice(separator + 1);
    if (kind === 'assetFile') return contentByFileId.get(id);
    if (kind === 'upload') return showcaseByFileId.get(id);
    if (kind === 'retained' || kind === 'media') return showcaseByMediaId.get(id);
    return undefined;
  });
  if (resolved.some((mediaId) => !mediaId) || new Set(resolved).size !== resolved.length) {
    throw repoError('ASSET_THUMBNAIL_INVALID');
  }
  return resolved;
}

function normalizeAssetPostingEligibility(row) {
  const used = Number(row?.posted_count || 0);
  const rawValue = typeof row?.feature_value === 'string' ? row.feature_value.trim() : '';
  const unlimited = rawValue.toLowerCase() === 'unlimited';
  const numericLimit = /^\d+$/.test(rawValue) ? Number(rawValue) : null;
  const validLimit = unlimited || (Number.isSafeInteger(numericLimit) && numericLimit >= 0);
  const limit = unlimited ? null : validLimit ? numericLimit : null;

  let code = null;
  if (!row?.user_id) code = 'ASSET_POSTING_UNAVAILABLE';
  else if (row.is_verified !== true) code = 'ASSET_VERIFICATION_REQUIRED';
  else if (!validLimit) code = 'ASSET_POSTING_UNAVAILABLE';
  else if (!unlimited && used >= limit) code = 'ASSET_POST_LIMIT_REACHED';

  return {
    allowed: code === null,
    code,
    isVerified: row?.is_verified === true,
    unlimited,
    limit,
    used,
    remaining: unlimited ? null : Math.max(0, (limit || 0) - used),
  };
}

async function readAssetPostingEligibility(db, accountId, { lock = false, excludeAssetId = null } = {}) {
  if (lock) {
    await db.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      ['asset-post-limit', accountId]
    );
  }
  const { rows } = await db.query(
    `WITH identity AS (
       SELECT u.user_id, COALESCE(v.is_verified, FALSE) AS is_verified
       FROM users u
       LEFT JOIN verifications v ON v.account_id = u.account_id
       WHERE u.account_id = $1
       LIMIT 1
     ), active_subscription AS (
       SELECT s.plan_id
       FROM subscriptions s
       JOIN identity ON identity.user_id = s.user_id
       WHERE UPPER(s.status) = 'ACTIVE'
       ORDER BY s.updated_at DESC, s.created_at DESC, s.subscription_id DESC
       LIMIT 1
     ), entitlement AS (
       SELECT pf.value
       FROM active_subscription subscription
       JOIN plan_features pf ON pf.plan_id = subscription.plan_id
       JOIN features feature ON feature.feature_id = pf.feature_id
       WHERE feature.feature_key IN ('asset_post', 'asset_posts')
       ORDER BY CASE WHEN feature.feature_key = 'asset_post' THEN 0 ELSE 1 END
       LIMIT 1
     ), usage AS (
       SELECT COUNT(DISTINCT ma.market_asset_id)::int AS posted_count
       FROM market_assets ma
       JOIN LATERAL (
         SELECT media.owner_user_id
         FROM market_media_assets link
         JOIN media_assets media ON media.media_asset_id = link.media_asset_id
         WHERE link.market_asset_id = ma.market_asset_id AND media.deleted_at IS NULL
         UNION ALL
         SELECT media.owner_user_id
         FROM market_asset_thumbnails link
         JOIN media_assets media ON media.media_asset_id = link.media_asset_id
         WHERE link.market_asset_id = ma.market_asset_id AND media.deleted_at IS NULL
         LIMIT 1
       ) listing_owner ON TRUE
       JOIN users owner_user ON owner_user.user_id = listing_owner.owner_user_id
       WHERE owner_user.account_id = $1
         AND ma.status = 'published'
         AND ($2::uuid IS NULL OR ma.market_asset_id <> $2::uuid)
         AND ma.deleted_at IS NULL
     )
     SELECT identity.user_id, identity.is_verified,
            entitlement.value AS feature_value, usage.posted_count
     FROM identity
     CROSS JOIN usage
     LEFT JOIN entitlement ON TRUE`,
    [accountId, excludeAssetId]
  );
  return normalizeAssetPostingEligibility(rows[0]);
}

async function getAssetPostingEligibilityRepository(accountId) {
  return readAssetPostingEligibility(pool, accountId);
}

const ASSET_SELECT = `
  SELECT ma.market_asset_id, ma.name, ma.description, ma.price_credits, ma.status,
         ma.created_at, ma.updated_at,
         latest_listing.status AS review_status,
         latest_listing.rejection_reason,
         media.media_asset_id, media.type, media.width, media.height,
         media.duration_seconds, media.proxy_path,
         media.thumbnail_path, media.mime_type, media.size_bytes,
         media.thumbnails, media.thumbnail_count,
         media.media_assets, media.media_asset_count,
         media.has_ydoc, media.processing_status,
         owner.display_name AS creator_name, owner.handle AS creator_handle, owner_avatar.path AS creator_avatar_path,
         owner.account_id AS owner_account_id,
         (owner.account_id = $1) AS is_owner,
         purchase_access.is_purchased,
         purchase_access.available_license_count,
         ((owner.account_id = $1) OR purchase_access.is_purchased) AS can_download,
         (purchase_access.is_purchased AND owner.account_id <> $1) AS can_review,
         EXISTS (
           SELECT 1 FROM asset_likes likes
           WHERE likes.market_asset_id = ma.market_asset_id
             AND likes.account_id = $1 AND likes.deleted_at IS NULL
         ) AS is_liked,
         EXISTS (
           SELECT 1 FROM asset_saves saves
           WHERE saves.market_asset_id = ma.market_asset_id
             AND saves.account_id = $1 AND saves.deleted_at IS NULL
         ) AS is_saved,
         (SELECT COUNT(*)::int FROM asset_likes likes
          WHERE likes.market_asset_id = ma.market_asset_id
            AND likes.deleted_at IS NULL) AS like_count,
         (SELECT COUNT(*)::int FROM asset_saves saves
          WHERE saves.market_asset_id = ma.market_asset_id
            AND saves.deleted_at IS NULL) AS save_count,
         (SELECT COUNT(*)::int FROM asset_reviews reviews
          WHERE reviews.market_asset_id = ma.market_asset_id
            AND reviews.deleted_at IS NULL
            AND EXISTS (
              SELECT 1
              FROM market_asset_licenses review_ownership
              JOIN users reviewing_user ON reviewing_user.user_id = review_ownership.buyer_user_id
              WHERE review_ownership.market_asset_id = reviews.market_asset_id
                AND reviewing_user.account_id = reviews.account_id
                AND review_ownership.status = 'active'
                AND review_ownership.deleted_at IS NULL
            )) AS review_count,
         COALESCE((SELECT ROUND(AVG(reviews.rating)::numeric, 1)
          FROM asset_reviews reviews
          WHERE reviews.market_asset_id = ma.market_asset_id
            AND reviews.deleted_at IS NULL
            AND EXISTS (
              SELECT 1
              FROM market_asset_licenses review_ownership
              JOIN users reviewing_user ON reviewing_user.user_id = review_ownership.buyer_user_id
              WHERE review_ownership.market_asset_id = reviews.market_asset_id
                AND reviewing_user.account_id = reviews.account_id
                AND review_ownership.status = 'active'
                AND review_ownership.deleted_at IS NULL
            )), 0) AS average_rating,
         COALESCE((
           SELECT array_agg(t.name ORDER BY t.name)
           FROM market_asset_tags mat
           JOIN tags t ON t.tag_id = mat.tag_id
           WHERE mat.market_asset_id = ma.market_asset_id
             AND mat.deleted_at IS NULL AND t.deleted_at IS NULL
         ), ARRAY[]::varchar[]) AS tags,
         (SELECT COUNT(*)::int FROM asset_reviews ar
          WHERE ar.deleted_at IS NULL AND EXISTS (
            SELECT 1 FROM market_asset_licenses license
            JOIN users u ON u.user_id = license.buyer_user_id
            WHERE license.market_asset_id = ar.market_asset_id
              AND u.account_id = owner.account_id
              AND license.status = 'active' AND license.deleted_at IS NULL)) AS creator_rating_count,
         COALESCE((SELECT ROUND(AVG(ar.rating)::numeric, 1) FROM asset_reviews ar
          WHERE ar.deleted_at IS NULL AND EXISTS (
            SELECT 1 FROM market_asset_licenses license
            JOIN users u ON u.user_id = license.buyer_user_id
            WHERE license.market_asset_id = ar.market_asset_id
              AND u.account_id = owner.account_id
              AND license.status = 'active' AND license.deleted_at IS NULL)), 0) AS creator_average_rating,
         (SELECT COUNT(*)::int FROM asset_comments ac
          WHERE ac.market_asset_id = ma.market_asset_id AND ac.deleted_at IS NULL) AS comment_count,
         (SELECT COUNT(*)::int
          FROM market_asset_licenses uma
          WHERE uma.market_asset_id = ma.market_asset_id
            AND uma.status = 'active'
            AND uma.deleted_at IS NULL) AS purchase_count
  FROM market_assets ma
  JOIN LATERAL (
    SELECT content.media_asset_id,
           COALESCE(content.type, 'template') AS type,
           content.width, content.height, content.duration_seconds,
           COALESCE(content.proxy_path, cover.thumbnail_path) AS proxy_path,
           COALESCE(cover.thumbnail_path, content.thumbnail_path) AS thumbnail_path,
           content.mime_type, content.size_bytes,
           COALESCE((
             SELECT json_agg(json_build_object(
               'media_asset_id', thumbnail_media.media_asset_id,
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
               AND (NOT EXISTS (
                 SELECT 1 FROM market_media_assets any_content
                 WHERE any_content.market_asset_id = ma.market_asset_id
               ) OR (SELECT COUNT(*) FROM market_media_assets bundle_content
                     WHERE bundle_content.market_asset_id = ma.market_asset_id) > 1)
           ), '[]'::json) AS thumbnails,
           (SELECT COUNT(*)::int
            FROM market_asset_thumbnails thumbnail_count_link
            JOIN media_assets thumbnail_count_media
              ON thumbnail_count_media.media_asset_id = thumbnail_count_link.media_asset_id
            WHERE thumbnail_count_link.market_asset_id = ma.market_asset_id
              AND thumbnail_count_media.deleted_at IS NULL
              AND (NOT EXISTS (
                SELECT 1 FROM market_media_assets any_content
                WHERE any_content.market_asset_id = ma.market_asset_id
              ) OR (SELECT COUNT(*) FROM market_media_assets bundle_content
                    WHERE bundle_content.market_asset_id = ma.market_asset_id) > 1)) AS thumbnail_count,
           COALESCE((
             SELECT json_agg(json_build_object(
               'media_asset_id', item.media_asset_id,
               'name', item.name,
               'type', item.type,
               'mime_type', item_original.mime_type,
               'size_bytes', item_original.size_bytes,
               'width', item.width,
               'height', item.height,
               'duration_seconds', item.duration_seconds,
               'proxy_path', item_proxy.path,
               'thumbnail_path', item_thumbnail.path,
               'processing_status', CASE WHEN item_job.status = 'failed' THEN 'failed'
                                         WHEN item_job.status IN ('pending', 'running') THEN 'processing'
                                         ELSE 'ready' END,
               'position', item_link.position
             ) ORDER BY item_link.position, item.media_asset_id)
             FROM market_media_assets item_link
             JOIN media_assets item ON item.media_asset_id = item_link.media_asset_id
             JOIN files item_original ON item_original.file_id = item.original_file_id
             LEFT JOIN files item_proxy ON item_proxy.file_id = item.proxy_file_id
               AND item_proxy.deleted_at IS NULL
             LEFT JOIN files item_thumbnail ON item_thumbnail.file_id = item.thumbnail_file_id
               AND item_thumbnail.deleted_at IS NULL
               AND item_thumbnail.mime_type LIKE 'image/%'
             LEFT JOIN media_asset_jobs item_job ON item_job.media_asset_id = item.media_asset_id
             WHERE item_link.market_asset_id = ma.market_asset_id
               AND item.deleted_at IS NULL
               AND item_original.deleted_at IS NULL
           ), '[]'::json) AS media_assets,
           (SELECT COUNT(*)::int
            FROM market_media_assets item_count_link
            JOIN media_assets item_count ON item_count.media_asset_id = item_count_link.media_asset_id
            WHERE item_count_link.market_asset_id = ma.market_asset_id
              AND item_count.deleted_at IS NULL) AS media_asset_count,
           EXISTS (
             SELECT 1 FROM market_ydoc_assets ydoc
             WHERE ydoc.market_asset_id = ma.market_asset_id
           ) AS has_ydoc,
           (SELECT CASE WHEN bool_or(job.status = 'failed') THEN 'failed'
                        WHEN bool_or(job.status IN ('pending', 'running')) THEN 'processing'
                        ELSE 'ready' END
            FROM market_media_assets job_link
            JOIN media_asset_jobs job ON job.media_asset_id = job_link.media_asset_id
            WHERE job_link.market_asset_id = ma.market_asset_id) AS processing_status,
           COALESCE(content.owner_user_id, cover.owner_user_id) AS owner_user_id
    FROM (SELECT 1) anchor
    LEFT JOIN LATERAL (
      SELECT cover_media.owner_user_id, cover_file.path AS thumbnail_path
      FROM market_asset_thumbnails cover_link
      JOIN media_assets cover_media ON cover_media.media_asset_id = cover_link.media_asset_id
      JOIN files cover_file ON cover_file.file_id = cover_media.thumbnail_file_id
      WHERE cover_link.market_asset_id = ma.market_asset_id
        AND cover_media.deleted_at IS NULL
        AND cover_file.deleted_at IS NULL
        AND (NOT EXISTS (
          SELECT 1 FROM market_media_assets any_content
          WHERE any_content.market_asset_id = ma.market_asset_id
        ) OR (SELECT COUNT(*) FROM market_media_assets bundle_content
              WHERE bundle_content.market_asset_id = ma.market_asset_id) > 1)
      ORDER BY cover_link.position, cover_media.media_asset_id
      LIMIT 1
    ) cover ON TRUE
    LEFT JOIN LATERAL (
      SELECT m.media_asset_id, m.type, m.width, m.height, m.duration_seconds,
             proxy.path AS proxy_path, poster.path AS thumbnail_path,
             original.mime_type, original.size_bytes, m.owner_user_id
      FROM market_media_assets content_link
      JOIN media_assets m ON m.media_asset_id = content_link.media_asset_id
      JOIN files original ON original.file_id = m.original_file_id
      LEFT JOIN files proxy ON proxy.file_id = m.proxy_file_id AND proxy.deleted_at IS NULL
      LEFT JOIN files poster ON poster.file_id = m.thumbnail_file_id AND poster.deleted_at IS NULL
        AND poster.mime_type LIKE 'image/%'
      WHERE content_link.market_asset_id = ma.market_asset_id
        AND m.deleted_at IS NULL
        AND original.deleted_at IS NULL
      ORDER BY content_link.position, m.media_asset_id
      LIMIT 1
    ) content ON TRUE
  ) media ON TRUE
  JOIN users owner_user ON owner_user.user_id = media.owner_user_id
  JOIN accounts owner ON owner.account_id = owner_user.account_id
    LEFT JOIN files owner_avatar ON owner_avatar.file_id = owner.avatar_file_id
  LEFT JOIN LATERAL (
    SELECT EXISTS (
      SELECT 1
      FROM market_asset_licenses owned_asset
      JOIN users purchasing_user ON purchasing_user.user_id = owned_asset.buyer_user_id
      WHERE owned_asset.market_asset_id = ma.market_asset_id
        AND purchasing_user.account_id = $1
        AND owned_asset.status = 'active'
        AND owned_asset.deleted_at IS NULL
    ) AS is_purchased,
    (SELECT COUNT(*)::int FROM market_asset_licenses available
     JOIN users buyer ON buyer.user_id = available.buyer_user_id
     WHERE available.market_asset_id = ma.market_asset_id AND buyer.account_id = $1
       AND available.project_id IS NULL AND available.status = 'active'
       AND available.deleted_at IS NULL) AS available_license_count
  ) purchase_access ON TRUE
  LEFT JOIN LATERAL (
    SELECT ml.status, ml.rejection_reason
    FROM marketplace_listings ml
    WHERE ml.market_asset_id = ma.market_asset_id
    ORDER BY ml.created_at DESC
    LIMIT 1
  ) latest_listing ON TRUE
`;
const ASSET_SELECT_WITH_TOTAL = ASSET_SELECT.replace(
  '\n  FROM market_assets',
  ', COUNT(*) OVER()::int AS total_count\n  FROM market_assets'
);

async function syncAssetTags(client, marketAssetId, tagNames) {
  await client.query(
    `UPDATE market_asset_tags
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE market_asset_id = $1 AND deleted_at IS NULL`,
    [marketAssetId]
  );

  const orderedTags = [...tagNames].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
  for (const tagName of orderedTags) {
    const normalizedName = tagName.toLocaleLowerCase('en-US');
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext('asset-tag'), hashtext($1))`,
      [normalizedName]
    );
    const existingTag = await client.query(
      `SELECT tag_id
       FROM tags
       WHERE LOWER(name) = $1 AND deleted_at IS NULL
       ORDER BY created_at, tag_id
       LIMIT 1`,
      [normalizedName]
    );
    const tagId = existingTag.rows[0]?.tag_id || (await client.query(
      `INSERT INTO tags (name) VALUES ($1) RETURNING tag_id`,
      [tagName]
    )).rows[0].tag_id;

    await client.query(
      `INSERT INTO market_asset_tags (market_asset_id, tag_id, deleted_at)
       VALUES ($1, $2, NULL)
       ON CONFLICT (market_asset_id, tag_id)
       DO UPDATE SET deleted_at = NULL`,
      [marketAssetId, tagId]
    );
  }
}

async function listAssetsRepository({ accountId, search, type, status, view, creatorAccountId, limit, offset }) {
  const visibility = view === 'mine'
    ? 'owner.account_id = $1'
    : view === 'creator'
      ? `owner.account_id = $7 AND ma.status = 'published'`
      : view === 'purchased'
        ? 'purchase_access.is_purchased'
        : view === 'saved'
          ? `ma.status = 'published' AND EXISTS (
              SELECT 1 FROM asset_saves saved_asset
              WHERE saved_asset.market_asset_id = ma.market_asset_id
                AND saved_asset.account_id = $1
                AND saved_asset.deleted_at IS NULL
            )`
        : view === 'liked'
          ? `ma.status = 'published' AND EXISTS (
              SELECT 1 FROM asset_likes liked_asset
              WHERE liked_asset.market_asset_id = ma.market_asset_id
                AND liked_asset.account_id = $1
                AND liked_asset.deleted_at IS NULL
            )`
        : `ma.status = 'published'`;
  const { rows } = await pool.query(
    `${ASSET_SELECT_WITH_TOTAL}
     WHERE ma.deleted_at IS NULL
       AND owner.deleted_at IS NULL
       AND ${visibility}
       AND ($2 = '' OR ma.name ILIKE '%' || $2 || '%'
         OR ma.description ILIKE '%' || $2 || '%'
         OR owner.display_name ILIKE '%' || $2 || '%'
         OR owner.handle ILIKE '%' || $2 || '%'
         OR EXISTS (
           SELECT 1
           FROM market_asset_tags search_mat
           JOIN tags search_tag ON search_tag.tag_id = search_mat.tag_id
           WHERE search_mat.market_asset_id = ma.market_asset_id
             AND search_mat.deleted_at IS NULL
             AND search_tag.deleted_at IS NULL
             AND search_tag.name ILIKE '%' || $2 || '%'
         ))
       AND ($3 = '' OR media.type = $3)
       AND (
         $4 = '' OR $4 = 'all'
         OR ($4 = 'published' AND ma.status = 'published')
         OR ($4 = 'pending' AND ma.status = 'draft' AND latest_listing.status = 'pending')
         OR ($4 = 'rejected' AND ma.status = 'draft' AND latest_listing.status = 'rejected')
         OR ($4 = 'draft' AND ma.status = 'draft' AND (latest_listing.status IS NULL OR latest_listing.status NOT IN ('pending', 'rejected')))
         OR (ma.status = $4)
       )
       AND ($7::text IS NULL OR $7::text IS NOT NULL)
     ORDER BY ma.created_at DESC, ma.market_asset_id DESC
     LIMIT $5 OFFSET $6`,
    [accountId, search, type, status, limit, offset, creatorAccountId || null]
  );
  return rows;
}

async function getAssetRepository(assetId, accountId) {
  const { rows } = await pool.query(
    `${ASSET_SELECT}
     WHERE ma.market_asset_id = $2
       AND ma.deleted_at IS NULL
       AND owner.deleted_at IS NULL
       AND (ma.status = 'published' OR owner.account_id = $1 OR purchase_access.is_purchased)`,
    [accountId, assetId]
  );
  return rows[0] || null;
}

async function createAssetRepository(accountId, data, derivatives = new Map()) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eligibility = await readAssetPostingEligibility(client, accountId, { lock: true });
    if (!eligibility.allowed) {
      throw repoError(eligibility.code, { eligibility });
    }
    const { rows: [ownerUser] } = await client.query(
      'SELECT user_id FROM users WHERE account_id = $1 LIMIT 1',
      [accountId]
    );
    if (!ownerUser) throw repoError('ASSET_POSTING_UNAVAILABLE');

    const { originals, thumbnails } = await loadValidatedUploads(client, accountId, data);

    const needsProcessing = data.type !== 'template'
      && originals.some((original) => !derivatives.has(String(original.file_id)));
    const market = await client.query(
      `INSERT INTO market_assets
         (name, description, price_credits, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING market_asset_id`,
      [data.name, data.description, data.priceCredits, needsProcessing ? 'draft' : data.status]
    );
    const marketAssetId = market.rows[0].market_asset_id;

    if (data.type === 'template') {
      if (thumbnails.length < 1 || thumbnails.length > MAX_SHOWCASE_IMAGES) {
        throw repoError('ASSET_THUMBNAIL_INVALID');
      }
      await createThumbnailMediaAssets(client, {
        marketAssetId, name: data.name, ownerUserId: ownerUser.user_id,
        startPosition: 0, thumbnails,
      });
      const orderedShowcaseIds = await resolveShowcaseOrder(client, marketAssetId, data.showcaseOrder);
      await repositionLinks(client, 'market_asset_thumbnails', marketAssetId, orderedShowcaseIds);
      await setMarketYdoc(client, marketAssetId, data.ydocSnapshotId);
    } else {
      if (originals.length < 1 || originals.length > MAX_CONTENT_FILES) {
        throw repoError('ASSET_CONTENT_REQUIRED');
      }
      const showcaseCount = thumbnails.length + data.showcaseOriginalFileIds.length;
      const showcaseLimit = data.type === 'audio' ? 3 : MAX_SHOWCASE_IMAGES;
      const totalShowcaseBytes = thumbnails.reduce((total, file) => total + Number(file.size_bytes), 0);
      if ((originals.length === 1 && showcaseCount > 0) || showcaseCount > showcaseLimit
        || totalShowcaseBytes > data.maxShowcaseTotalBytes) {
        throw repoError('ASSET_THUMBNAIL_INVALID');
      }
      await createThumbnailMediaAssets(client, {
        marketAssetId, name: data.name, ownerUserId: ownerUser.user_id,
        startPosition: 0, thumbnails,
      });
      await createContentMediaAssets(client, {
        marketAssetId,
        name: data.name,
        ownerUserId: ownerUser.user_id,
        type: data.type,
        startPosition: 0,
        originals,
        derivatives,
        coverFileId: thumbnails[0]?.file_id || null,
        publishStatus: needsProcessing ? data.status : null,
      });
      const selectedContentMedia = await client.query(
        `SELECT link.media_asset_id, media.original_file_id
         FROM market_media_assets link
         JOIN media_assets media ON media.media_asset_id = link.media_asset_id
         WHERE link.market_asset_id = $1
           AND media.original_file_id = ANY($2::uuid[])
           AND media.type = $3
         ORDER BY link.position, media.media_asset_id`,
        [marketAssetId, data.showcaseOriginalFileIds, data.type]
      );
      if (selectedContentMedia.rowCount !== data.showcaseOriginalFileIds.length) {
        throw repoError('ASSET_THUMBNAIL_INVALID');
      }
      await linkShowcaseMediaAssets(client, marketAssetId,
        selectedContentMedia.rows.map((row) => row.media_asset_id), thumbnails.length);
      const orderedShowcaseIds = await resolveShowcaseOrder(client, marketAssetId, data.showcaseOrder);
      await repositionLinks(client, 'market_asset_thumbnails', marketAssetId, orderedShowcaseIds);
    }
    await syncAssetTags(client, marketAssetId, data.tags);

    const { getMarketplaceListingFeeCredits } = require('../lib/PlatformFeeSettings');
    const listingFeeCredits = await getMarketplaceListingFeeCredits();
    if (listingFeeCredits > 0) {
      const walletsResult = await client.query(
        `SELECT aw.account_id, w.wallet_id, w.type, w.status, w.balance_credits
         FROM wallets w
         LEFT JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
         WHERE (w.type = 'account wallets' AND aw.account_id = $1)
            OR w.type = 'platform wallets'
         ORDER BY w.wallet_id
         FOR UPDATE OF w`,
        [accountId]
      );
      const creatorWallet = walletsResult.rows.find((w) => String(w.account_id) === String(accountId));
      const platformWallet = walletsResult.rows.find((w) => w.type === 'platform wallets');
      if (!creatorWallet) {
        const error = new Error('ASSET_WALLET_NOT_FOUND');
        error.code = 'ASSET_WALLET_NOT_FOUND';
        throw error;
      }
      if (Number(creatorWallet.balance_credits) < listingFeeCredits) {
        const error = new Error('Insufficient credits for marketplace listing fee.');
        error.code = 'INSUFFICIENT_CREDITS';
        error.required = listingFeeCredits;
        error.available = Number(creatorWallet.balance_credits);
        throw error;
      }
      if (platformWallet) {
        await client.query(
          `UPDATE wallets SET balance_credits = balance_credits - $1 WHERE wallet_id = $2`,
          [listingFeeCredits, creatorWallet.wallet_id]
        );
        await client.query(
          `UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2`,
          [listingFeeCredits, platformWallet.wallet_id]
        );
        await client.query(
          `INSERT INTO credit_transactions (
             type, amount_credits, status, source_wallet_id, destination_wallet_id,
             reference_table, reference_id
           ) VALUES ('Fee', $1, 'completed', $2, $3, 'market_assets', $4)`,
          [listingFeeCredits, creatorWallet.wallet_id, platformWallet.wallet_id, market.rows[0].market_asset_id]
        );
      }
    }

    await client.query('COMMIT');
    return market.rows[0].market_asset_id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getAssetDownloadRepository(assetId, accountId, mediaAssetId = null, projectId = null) {
  const { rows } = await pool.query(
    `SELECT media.media_asset_id, link.position,
            original.path, original.name, original.mime_type, original.size_bytes,
            (owner.account_id = $2) AS is_owner,
            EXISTS (
              SELECT 1
              FROM market_asset_licenses owned_asset
              JOIN users purchasing_user ON purchasing_user.user_id = owned_asset.buyer_user_id
              WHERE owned_asset.market_asset_id = ma.market_asset_id
                AND ($4::uuid IS NULL AND purchasing_user.account_id = $2
                  OR $4::uuid IS NOT NULL AND owned_asset.project_id = $4
                    AND EXISTS (
                      SELECT 1 FROM project_members member
                      JOIN users collaborator ON collaborator.user_id = member.user_id
                      JOIN projects project ON project.project_id = member.project_id
                      WHERE member.project_id = $4 AND collaborator.account_id = $2
                        AND member.deleted_at IS NULL AND project.deleted_at IS NULL
                        AND member.role IN ('Owner', 'Manager', 'Editor')
                    ))
                AND owned_asset.status = 'active'
                AND owned_asset.deleted_at IS NULL
            ) AS is_purchased
     FROM market_assets ma
     JOIN market_media_assets link ON link.market_asset_id = ma.market_asset_id
     JOIN media_assets media ON media.media_asset_id = link.media_asset_id
     JOIN files original ON original.file_id = media.original_file_id
     JOIN users owner_user ON owner_user.user_id = media.owner_user_id
     JOIN accounts owner ON owner.account_id = owner_user.account_id
     WHERE ma.market_asset_id = $1
       AND ma.deleted_at IS NULL AND media.deleted_at IS NULL
       AND original.deleted_at IS NULL
       AND ($3::uuid IS NULL OR media.media_asset_id = $3)
     ORDER BY link.position, media.media_asset_id
     LIMIT 1`,
    [assetId, accountId, mediaAssetId, projectId]
  );
  return rows[0] || null;
}

async function purchaseAssetRepository(assetId, buyerAccountId, feePercent = DEFAULT_MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [buyerAccountId, assetId]
    );

    const assetResult = await client.query(
      `SELECT ma.market_asset_id, ma.name, ma.price_credits, ma.status,
              owner.account_id AS owner_account_id,
              owner.display_name AS creator_name,
              buyer.display_name AS buyer_name,
              buyer_user.user_id AS buyer_user_id
       FROM market_assets ma
       JOIN LATERAL (
         SELECT candidate.owner_user_id
         FROM (
           SELECT media.owner_user_id, 0 AS source_order
           FROM market_media_assets link
           JOIN media_assets media ON media.media_asset_id = link.media_asset_id
           WHERE link.market_asset_id = ma.market_asset_id AND media.deleted_at IS NULL
           UNION ALL
           SELECT media.owner_user_id, 1 AS source_order
           FROM market_asset_thumbnails link
           JOIN media_assets media ON media.media_asset_id = link.media_asset_id
           WHERE link.market_asset_id = ma.market_asset_id AND media.deleted_at IS NULL
         ) candidate
         ORDER BY candidate.source_order
         LIMIT 1
       ) asset_owner ON TRUE
       JOIN users owner_user ON owner_user.user_id = asset_owner.owner_user_id
       JOIN accounts owner ON owner.account_id = owner_user.account_id
       JOIN accounts buyer ON buyer.account_id = $2
       JOIN users buyer_user ON buyer_user.account_id = buyer.account_id
       WHERE ma.market_asset_id = $1
         AND ma.deleted_at IS NULL
         AND owner.deleted_at IS NULL
         AND buyer.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE OF ma`,
      [assetId, buyerAccountId]
    );
    const asset = assetResult.rows[0];
    if (!asset) {
      const error = new Error('ASSET_NOT_FOUND');
      error.code = 'ASSET_NOT_FOUND';
      throw error;
    }
    if (asset.status !== 'published') {
      const error = new Error('ASSET_NOT_PUBLISHED');
      error.code = 'ASSET_NOT_PUBLISHED';
      throw error;
    }
    if (String(asset.owner_account_id) === String(buyerAccountId)) {
      const error = new Error('ASSET_SELF_PURCHASE');
      error.code = 'ASSET_SELF_PURCHASE';
      throw error;
    }

    const priceCredits = Number(asset.price_credits);
    if (!Number.isSafeInteger(priceCredits) || priceCredits < 0) {
      const error = new Error('ASSET_PRICE_INVALID');
      error.code = 'ASSET_PRICE_INVALID';
      throw error;
    }
    const transactionFeeCredits = calculateAssetTransactionFee(priceCredits, feePercent);
    const creatorNetCredits = priceCredits - transactionFeeCredits;

    const existingPurchase = await client.query(
      `SELECT owned_asset.*
       FROM market_asset_licenses owned_asset
       WHERE owned_asset.buyer_user_id = $1
         AND owned_asset.market_asset_id = $2
         AND owned_asset.project_id IS NULL
         AND owned_asset.status = 'active'
         AND owned_asset.deleted_at IS NULL
       FOR UPDATE`,
      [asset.buyer_user_id, assetId]
    );

    const walletsResult = await client.query(
      `SELECT aw.account_id, w.wallet_id, w.type, w.status, w.balance_credits
       FROM wallets w
       LEFT JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
       WHERE (w.type = 'account wallets' AND aw.account_id = ANY($1::uuid[]))
          OR w.type = 'platform wallets'
       ORDER BY w.wallet_id
       FOR UPDATE OF w`,
      [[buyerAccountId, asset.owner_account_id]]
    );
    const wallets = new Map(walletsResult.rows
      .filter((wallet) => wallet.account_id)
      .map((wallet) => [String(wallet.account_id), wallet]));
    const buyerWallet = wallets.get(String(buyerAccountId));
    const creatorWallet = wallets.get(String(asset.owner_account_id));
    const platformWallet = walletsResult.rows.find((wallet) => wallet.type === 'platform wallets');
    if (!buyerWallet || !creatorWallet) {
      const error = new Error('ASSET_WALLET_NOT_FOUND');
      error.code = 'ASSET_WALLET_NOT_FOUND';
      throw error;
    }
    if (transactionFeeCredits > 0 && !platformWallet) {
      const error = new Error('ASSET_PLATFORM_WALLET_NOT_FOUND');
      error.code = 'ASSET_PLATFORM_WALLET_NOT_FOUND';
      throw error;
    }
    if (String(buyerWallet.status).toLowerCase() !== 'active'
      || String(creatorWallet.status).toLowerCase() !== 'active'
      || (transactionFeeCredits > 0 && String(platformWallet.status).toLowerCase() !== 'active')) {
      const error = new Error('ASSET_WALLET_INACTIVE');
      error.code = 'ASSET_WALLET_INACTIVE';
      throw error;
    }

    if (existingPurchase.rowCount) {
      await client.query('COMMIT');
      return {
        alreadyPurchased: true,
        license: existingPurchase.rows[0],
        transactionId: existingPurchase.rows[0].credit_transaction_id,
        buyerAccountId,
        creatorAccountId: asset.owner_account_id,
        buyerBalanceCredits: Number(buyerWallet.balance_credits),
        creatorBalanceCredits: Number(creatorWallet.balance_credits),
        notifications: [],
      };
    }

    if (Number(buyerWallet.balance_credits) < priceCredits) {
      const error = new Error('ASSET_INSUFFICIENT_BALANCE');
      error.code = 'ASSET_INSUFFICIENT_BALANCE';
      throw error;
    }

    const buyerBalanceResult = await client.query(
      `UPDATE wallets
       SET balance_credits = balance_credits - $1
       WHERE wallet_id = $2 AND balance_credits >= $1
       RETURNING balance_credits`,
      [priceCredits, buyerWallet.wallet_id]
    );
    if (!buyerBalanceResult.rowCount) {
      const error = new Error('ASSET_INSUFFICIENT_BALANCE');
      error.code = 'ASSET_INSUFFICIENT_BALANCE';
      throw error;
    }
    const creatorBalanceResult = await client.query(
      `UPDATE wallets
      SET balance_credits = balance_credits + $1
       WHERE wallet_id = $2
       RETURNING balance_credits`,
      [creatorNetCredits, creatorWallet.wallet_id]
    );

    let feeTransaction = null;
    if (transactionFeeCredits > 0) {
      await client.query(
        `UPDATE wallets
         SET balance_credits = balance_credits + $1
         WHERE wallet_id = $2`,
        [transactionFeeCredits, platformWallet.wallet_id]
      );
      const feeResult = await client.query(
        `INSERT INTO credit_transactions
           (type, amount_credits, status, source_wallet_id, destination_wallet_id,
            fee_transaction_id, reference_table, reference_id)
         VALUES ('Fee', $1, 'completed', $2, $3, NULL, 'market_assets', $4)
         RETURNING credit_transaction_id, type, amount_credits, status, created_at,
                   reference_table, reference_id`,
        [transactionFeeCredits, creatorWallet.wallet_id, platformWallet.wallet_id, assetId]
      );
      feeTransaction = feeResult.rows[0];
    }

    const transactionResult = await client.query(
      `INSERT INTO credit_transactions
         (type, amount_credits, status, source_wallet_id, destination_wallet_id,
          fee_transaction_id, reference_table, reference_id)
       VALUES ('Asset Purchase', $1, 'completed', $2, $3, $4, 'market_assets', $5)
       RETURNING credit_transaction_id, type, amount_credits, status, created_at,
                 fee_transaction_id, reference_table, reference_id`,
      [priceCredits, buyerWallet.wallet_id, creatorWallet.wallet_id,
        feeTransaction?.credit_transaction_id || null, assetId]
    );
    const transaction = transactionResult.rows[0];
    const licenseResult = await client.query(
      `INSERT INTO market_asset_licenses
         (buyer_user_id, market_asset_id, price_credits, credit_transaction_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [asset.buyer_user_id, assetId, priceCredits, transaction.credit_transaction_id]
    );
    const purchaseLabel = priceCredits === 0 ? 'claimed' : 'purchased';
    const buyerMessage = priceCredits === 0
      ? `You claimed \"${asset.name}\".`
      : `You purchased \"${asset.name}\" for ${priceCredits.toLocaleString()} credits.`;
    const creatorMessage = priceCredits === 0
      ? `${asset.buyer_name} claimed \"${asset.name}\".`
      : `${asset.buyer_name} purchased \"${asset.name}\". You received ${creatorNetCredits.toLocaleString()} credits after the ${feePercent}% marketplace fee (${transactionFeeCredits.toLocaleString()} credits).`;
    const notificationsResult = await client.query(
      `INSERT INTO notifications
         (message, is_read, reference_table, reference_prefix, reference_path,
          reference_id, account_id)
       VALUES
         ($1, FALSE, 'market_assets', $3, $4, $5, $6),
         ($2, FALSE, 'market_assets', $3, $4, $5, $7)
       RETURNING *`,
      [buyerMessage, creatorMessage, `ASSET_${purchaseLabel.toUpperCase()}`,
        `/assets/${assetId}`, assetId, buyerAccountId, asset.owner_account_id]
    );

    await client.query('COMMIT');
    return {
      alreadyPurchased: false,
      license: licenseResult.rows[0],
      transaction,
      transactionId: transaction.credit_transaction_id,
      buyerAccountId,
      creatorAccountId: asset.owner_account_id,
      buyerBalanceCredits: Number(buyerBalanceResult.rows[0].balance_credits),
      creatorBalanceCredits: Number(creatorBalanceResult.rows[0].balance_credits),
      transactionFeeCredits,
      creatorNetCredits,
      notifications: notificationsResult.rows,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Licenses belong to the buyer until assigned, then grant use to that project.
async function listAssetLicensesRepository(assetId, accountId, limit, offset) {
  const { rows } = await pool.query(
    `SELECT license.market_asset_license_id, license.market_asset_id, license.project_id,
            license.credit_transaction_id, license.price_credits, license.status,
            license.purchased_at, license.assigned_at
     FROM market_asset_licenses license
     JOIN users buyer ON buyer.user_id = license.buyer_user_id
     WHERE license.market_asset_id = $1 AND buyer.account_id = $2
       AND license.deleted_at IS NULL
     ORDER BY license.purchased_at DESC, license.market_asset_license_id DESC
     LIMIT $3 OFFSET $4`,
    [assetId, accountId, limit, offset]
  );
  return rows;
}

async function assignAssetLicenseRepository(assetId, licenseId, accountId, projectId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Same order as purchase: buyer/asset, then project/asset. Different buyers
    // assigning to the same project must not consume two paid uses.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [accountId, assetId]);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [projectId, assetId]);
    const { rows: [membership] } = await client.query(
      `SELECT member.role, project.status
       FROM project_members member
       JOIN users buyer ON buyer.user_id = member.user_id
       JOIN projects project ON project.project_id = member.project_id
       WHERE member.project_id = $1 AND buyer.account_id = $2
         AND member.deleted_at IS NULL AND project.deleted_at IS NULL
       FOR SHARE OF member, project`,
      [projectId, accountId]
    );
    if (!membership || !['Owner', 'Manager', 'Editor'].includes(membership.role)) {
      throw repoError('ASSET_LICENSE_PROJECT_FORBIDDEN');
    }
    if (String(membership.status).toLowerCase() === 'frozen') throw repoError('ASSET_LICENSE_PROJECT_FROZEN');
    const { rows: [license] } = await client.query(
      `SELECT license.* FROM market_asset_licenses license
       JOIN users buyer ON buyer.user_id = license.buyer_user_id
       WHERE license.market_asset_license_id = $1 AND license.market_asset_id = $2
         AND buyer.account_id = $3 AND license.deleted_at IS NULL
       FOR UPDATE OF license`,
      [licenseId, assetId, accountId]
    );
    if (!license) throw repoError('ASSET_LICENSE_NOT_FOUND');
    if (license.status !== 'active') throw repoError('ASSET_LICENSE_INACTIVE');
    if (license.project_id && String(license.project_id) !== projectId) {
      throw repoError('ASSET_LICENSE_ALREADY_ASSIGNED');
    }
    if (license.project_id) {
      await client.query('COMMIT');
      return license;
    }
    const existing = await client.query(
      `SELECT 1 FROM market_asset_licenses WHERE project_id = $1 AND market_asset_id = $2
         AND status = 'active' AND deleted_at IS NULL`,
      [projectId, assetId]
    );
    if (existing.rowCount) throw repoError('ASSET_PROJECT_ALREADY_LICENSED');
    const { rows: [assigned] } = await client.query(
      `UPDATE market_asset_licenses SET project_id = $2, assigned_at = CURRENT_TIMESTAMP
       WHERE market_asset_license_id = $1 RETURNING *`,
      [licenseId, projectId]
    );
    await client.query('COMMIT');
    return assigned;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function replaceAssetContent(client, assetId, accountId, ownedAsset, content, derivatives, name) {
  if (ownedAsset.type !== content.type) throw repoError('ASSET_TYPE_IMMUTABLE');
  const purchases = await client.query(
    `SELECT 1 FROM market_asset_licenses
     WHERE market_asset_id = $1 AND status = 'active' AND deleted_at IS NULL
     LIMIT 1`,
    [assetId]
  );
  if (purchases.rowCount) throw repoError('ASSET_CONTENT_LOCKED_AFTER_PURCHASE');

  if (content.replaceMedia && content.retainedMediaAssetIds.length > 0) {
    const retained = await client.query(
      `SELECT link.media_asset_id
       FROM market_media_assets link
       JOIN media_assets m ON m.media_asset_id = link.media_asset_id
       WHERE link.market_asset_id = $1
         AND m.deleted_at IS NULL
         AND link.media_asset_id = ANY($2::uuid[])
       FOR UPDATE OF link`,
      [assetId, content.retainedMediaAssetIds]
    );
    if (retained.rowCount !== content.retainedMediaAssetIds.length) {
      throw repoError('ASSET_RETAINED_CONTENT_INVALID');
    }
  }
  if (content.replaceThumbnails && content.retainedThumbnailIds.length > 0) {
    const retained = await client.query(
      `SELECT link.media_asset_id
       FROM market_asset_thumbnails link
       JOIN media_assets m ON m.media_asset_id = link.media_asset_id
       WHERE link.market_asset_id = $1
         AND m.deleted_at IS NULL
         AND link.media_asset_id = ANY($2::uuid[])
       FOR UPDATE OF link`,
      [assetId, content.retainedThumbnailIds]
    );
    if (retained.rowCount !== content.retainedThumbnailIds.length) {
      throw repoError('ASSET_RETAINED_CONTENT_INVALID');
    }
  }

  const { originals, thumbnails } = await loadValidatedUploads(client, accountId, content);

  const counts = await client.query(
    `SELECT
       (SELECT COUNT(*)::int
        FROM market_media_assets link
        JOIN media_assets m ON m.media_asset_id = link.media_asset_id
        WHERE link.market_asset_id = $1 AND m.deleted_at IS NULL) AS media_count,
       (SELECT COUNT(*)::int
        FROM market_asset_thumbnails link
        JOIN media_assets m ON m.media_asset_id = link.media_asset_id
        WHERE link.market_asset_id = $1 AND m.deleted_at IS NULL) AS thumbnail_count`,
    [assetId]
  );
  const finalMediaCount = content.replaceMedia
    ? content.retainedMediaAssetIds.length + originals.length
    : Number(counts.rows[0].media_count);
  const finalThumbnailCount = content.replaceThumbnails
    ? content.retainedThumbnailIds.length + thumbnails.length
      + content.showcaseMediaAssetIds.length + content.showcaseOriginalFileIds.length
    : Number(counts.rows[0].thumbnail_count);
  const showcaseLimit = content.type === 'audio' ? 3 : MAX_SHOWCASE_IMAGES;
  if ((content.type === 'template' && (finalThumbnailCount < 1 || finalThumbnailCount > showcaseLimit))
    || (content.type !== 'template' && finalMediaCount === 1 && finalThumbnailCount !== 0)
    || (content.type !== 'template' && finalMediaCount > 1 && finalThumbnailCount > showcaseLimit)) {
    throw repoError('ASSET_THUMBNAIL_INVALID');
  }
  if (content.replaceThumbnails) {
    const retainedBytes = await client.query(
      `SELECT COALESCE(SUM(original.size_bytes), 0)::bigint AS total_bytes
       FROM market_asset_thumbnails link
       JOIN media_assets media ON media.media_asset_id = link.media_asset_id
       JOIN files original ON original.file_id = media.original_file_id
       WHERE link.market_asset_id = $1
         AND media.media_asset_id = ANY($2::uuid[])
         AND media.deleted_at IS NULL AND original.deleted_at IS NULL`,
      [assetId, content.retainedThumbnailIds]
    );
    const newThumbnailBytes = thumbnails.reduce((total, file) => total + Number(file.size_bytes), 0);
    if (Number(retainedBytes.rows[0]?.total_bytes || 0) + newThumbnailBytes > content.maxShowcaseTotalBytes) {
      throw repoError('ASSET_THUMBNAIL_INVALID');
    }
  }
  if (content.type !== 'template' && finalMediaCount < 1) {
    throw repoError('ASSET_CONTENT_REQUIRED');
  }

  if (content.replaceThumbnails && content.showcaseMediaAssetIds.length > 0) {
    const selected = await client.query(
      `SELECT media.media_asset_id
       FROM market_media_assets link
       JOIN media_assets media ON media.media_asset_id = link.media_asset_id
       WHERE link.market_asset_id = $1
         AND media.deleted_at IS NULL
         AND media.type = $5
         AND media.media_asset_id = ANY($2::uuid[])
         AND ($3::boolean = FALSE OR link.media_asset_id = ANY($4::uuid[]))
       FOR UPDATE OF link`,
      [assetId, content.showcaseMediaAssetIds, content.replaceMedia, content.retainedMediaAssetIds, content.type]
    );
    if (selected.rowCount !== content.showcaseMediaAssetIds.length) {
      throw repoError('ASSET_THUMBNAIL_INVALID');
    }
  }

  let nextShowcasePosition = 0;
  if (content.replaceThumbnails) {
    const removed = await client.query(
      `DELETE FROM market_asset_thumbnails
       WHERE market_asset_id = $1 AND NOT (media_asset_id = ANY($2::uuid[]))
       RETURNING media_asset_id`,
      [assetId, content.retainedThumbnailIds]
    );
    await retireUnlinkedMediaAssets(client, removed.rows.map((row) => row.media_asset_id));
    await repositionLinks(client, 'market_asset_thumbnails', assetId, content.retainedThumbnailIds);
    await linkShowcaseMediaAssets(client, assetId, content.showcaseMediaAssetIds, content.retainedThumbnailIds.length);
    nextShowcasePosition = content.retainedThumbnailIds.length
      + content.showcaseMediaAssetIds.length + content.showcaseOriginalFileIds.length;
    await createThumbnailMediaAssets(client, {
      marketAssetId: assetId,
      name,
      ownerUserId: ownedAsset.owner_user_id,
      startPosition: nextShowcasePosition,
      thumbnails,
    });
  }

  const coverFileId = await readCoverFileId(client, assetId);

  if (content.replaceMedia) {
    const removed = await client.query(
      `DELETE FROM market_media_assets
       WHERE market_asset_id = $1 AND NOT (media_asset_id = ANY($2::uuid[]))
       RETURNING media_asset_id`,
      [assetId, content.retainedMediaAssetIds]
    );
    await retireMediaAssets(client, removed.rows.map((row) => row.media_asset_id));
    await repositionLinks(client, 'market_media_assets', assetId, content.retainedMediaAssetIds);
    await createContentMediaAssets(client, {
      marketAssetId: assetId,
      name,
      ownerUserId: ownedAsset.owner_user_id,
      type: content.type,
      startPosition: content.retainedMediaAssetIds.length,
      originals,
      derivatives,
      coverFileId,
    });
    if (content.replaceThumbnails && content.showcaseOriginalFileIds.length) {
      const selectedNew = await client.query(
        `SELECT media_asset_id, original_file_id
         FROM market_media_assets link
         JOIN media_assets media ON media.media_asset_id = link.media_asset_id
         WHERE link.market_asset_id = $1
           AND media.original_file_id = ANY($2::uuid[])
           AND media.deleted_at IS NULL
           AND media.type = $3`,
        [assetId, content.showcaseOriginalFileIds, content.type]
      );
      const mediaByOriginal = new Map(selectedNew.rows.map((row) => [String(row.original_file_id), row.media_asset_id]));
      const orderedMediaIds = content.showcaseOriginalFileIds.map((fileId) => mediaByOriginal.get(String(fileId)));
      if (orderedMediaIds.some((mediaId) => !mediaId)) throw repoError('ASSET_THUMBNAIL_INVALID');
      await linkShowcaseMediaAssets(client, assetId, orderedMediaIds,
        content.retainedThumbnailIds.length + content.showcaseMediaAssetIds.length);
    }
  }

  if (content.replaceThumbnails) {
    const orderedShowcaseIds = await resolveShowcaseOrder(client, assetId, content.showcaseOrder);
    await repositionLinks(client, 'market_asset_thumbnails', assetId, orderedShowcaseIds);
  }

  if (content.replaceYdoc) {
    await setMarketYdoc(client, assetId, content.ydocSnapshotId);
  }

  // A pending video can use the selected showcase as a temporary poster.
  // Audio thumbnails are playable preview files and must survive listing edits.
  await client.query(
    `UPDATE media_assets m
     SET thumbnail_file_id = $2::uuid
     FROM market_media_assets link
     LEFT JOIN media_asset_jobs job ON job.media_asset_id = link.media_asset_id
     WHERE link.market_asset_id = $1::uuid
       AND link.media_asset_id = m.media_asset_id
       AND m.deleted_at IS NULL
       AND m.type = 'video' AND job.status IN ('pending', 'running', 'failed')`,
    [assetId, coverFileId]
  );
}

async function updateAssetRepository(assetId, accountId, data, derivatives = new Map()) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owned = await client.query(
      `SELECT ma.market_asset_id, ma.status AS current_status, listing_owner.owner_user_id,
              COALESCE(content.type, 'template') AS type
       FROM market_assets ma
       JOIN LATERAL (
         SELECT candidate.owner_user_id
         FROM (
           SELECT media.owner_user_id, 0 AS source_order
           FROM market_media_assets link
           JOIN media_assets media ON media.media_asset_id = link.media_asset_id
           WHERE link.market_asset_id = ma.market_asset_id AND media.deleted_at IS NULL
           UNION ALL
           SELECT media.owner_user_id, 1 AS source_order
           FROM market_asset_thumbnails link
           JOIN media_assets media ON media.media_asset_id = link.media_asset_id
           WHERE link.market_asset_id = ma.market_asset_id AND media.deleted_at IS NULL
         ) candidate
         ORDER BY candidate.source_order
         LIMIT 1
       ) listing_owner ON TRUE
       LEFT JOIN LATERAL (
         SELECT m.type
         FROM market_media_assets content_link
         JOIN media_assets m ON m.media_asset_id = content_link.media_asset_id
         WHERE content_link.market_asset_id = ma.market_asset_id
           AND m.deleted_at IS NULL
         ORDER BY content_link.position, m.media_asset_id
         LIMIT 1
       ) content ON TRUE
       JOIN users u ON u.user_id = listing_owner.owner_user_id
       WHERE ma.market_asset_id = $1 AND u.account_id = $2
         AND ma.deleted_at IS NULL
       FOR UPDATE OF ma`,
      [assetId, accountId]
    );
    if (!owned.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }
    if (owned.rows[0].current_status === 'draft' && data.status === 'published') {
      const eligibility = await readAssetPostingEligibility(client, accountId, {
        lock: true,
        excludeAssetId: assetId,
      });
      if (!eligibility.allowed) {
        throw repoError(eligibility.code, { eligibility });
      }
    }
    if (data.contentUpdate) {
      await replaceAssetContent(
        client, assetId, accountId, owned.rows[0], data.contentUpdate, derivatives, data.name
      );
    }
    const pending = await client.query(
      `UPDATE media_asset_jobs job SET publish_status = $2, updated_at = CURRENT_TIMESTAMP
       FROM market_media_assets link, media_assets media
       WHERE link.market_asset_id = $1 AND job.media_asset_id = link.media_asset_id
         AND media.media_asset_id = link.media_asset_id AND media.deleted_at IS NULL
         AND job.status <> 'done'
       RETURNING job.media_asset_job_id`,
      [assetId, data.status]
    );
    await client.query(
      `UPDATE market_assets
       SET name = $2, description = $3, price_credits = $4,
           status = $5, updated_at = CURRENT_TIMESTAMP
       WHERE market_asset_id = $1 AND deleted_at IS NULL`,
      [assetId, data.name, data.description, data.priceCredits, pending.rowCount ? 'draft' : data.status]
    );
    // Keep media names within the editor's 50-character limit, reserving space for bundle numbering.
    await client.query(
      `UPDATE media_assets m
       SET name = rtrim(left($2::text, greatest(0, 50 - char_length(name_suffix.suffix)))) || name_suffix.suffix
       FROM market_media_assets link
       CROSS JOIN LATERAL (SELECT CASE WHEN (
             SELECT COUNT(*) FROM market_media_assets count_link
             JOIN media_assets count_media ON count_media.media_asset_id = count_link.media_asset_id
             WHERE count_link.market_asset_id = $1 AND count_media.deleted_at IS NULL
           ) > 1
           THEN ' - ' || (link.position + 1)::text ELSE '' END AS suffix) name_suffix
       WHERE link.market_asset_id = $1 AND link.media_asset_id = m.media_asset_id
         AND m.deleted_at IS NULL`,
      [assetId, data.name]
    );
    await client.query(
      `UPDATE media_assets m
       SET name = rtrim(left($2::text, greatest(0, 50 - char_length(name_suffix.suffix)))) || name_suffix.suffix
       FROM market_asset_thumbnails link
       CROSS JOIN LATERAL (SELECT ' - Thumbnail ' || (link.position + 1)::text AS suffix) name_suffix
       WHERE link.market_asset_id = $1 AND link.media_asset_id = m.media_asset_id
         AND m.deleted_at IS NULL`,
      [assetId, data.name]
    );
    if (Array.isArray(data.tags)) {
      await syncAssetTags(client, assetId, data.tags);
    }
    await client.query('COMMIT');
    return assetId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteAssetRepository(assetId, accountId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owned = await client.query(
      `SELECT ma.market_asset_id
       FROM market_assets ma
       JOIN LATERAL (
         SELECT candidate.owner_user_id
         FROM (
           SELECT media.owner_user_id, 0 AS source_order
           FROM market_media_assets content_link
           JOIN media_assets media ON media.media_asset_id = content_link.media_asset_id
           WHERE content_link.market_asset_id = ma.market_asset_id AND media.deleted_at IS NULL
           UNION ALL
           SELECT media.owner_user_id, 1 AS source_order
           FROM market_asset_thumbnails showcase_link
           JOIN media_assets media ON media.media_asset_id = showcase_link.media_asset_id
           WHERE showcase_link.market_asset_id = ma.market_asset_id AND media.deleted_at IS NULL
         ) candidate
         ORDER BY candidate.source_order
         LIMIT 1
       ) asset_owner ON TRUE
       JOIN users u ON u.user_id = asset_owner.owner_user_id
       WHERE ma.market_asset_id = $1 AND u.account_id = $2
         AND ma.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE OF ma`,
      [assetId, accountId]
    );
    if (!owned.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }
    const purchases = await client.query(
      `SELECT 1
       FROM market_asset_licenses owned_asset
       WHERE owned_asset.market_asset_id = $1
         AND owned_asset.status = 'active'
         AND owned_asset.deleted_at IS NULL
       LIMIT 1`,
      [assetId]
    );
    if (purchases.rowCount) throw repoError('ASSET_HAS_PURCHASES');
    await client.query(
      `UPDATE market_assets SET deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP WHERE market_asset_id = $1`,
      [assetId]
    );
    await client.query(
      `UPDATE media_assets SET deleted_at = CURRENT_TIMESTAMP, is_marketed = FALSE
       WHERE media_asset_id IN (
         SELECT media_asset_id FROM market_media_assets WHERE market_asset_id = $1
         UNION
         SELECT media_asset_id FROM market_asset_thumbnails WHERE market_asset_id = $1
       )`,
      [assetId]
    );
    await client.query(
      `DELETE FROM marketplace_listings WHERE market_asset_id = $1`,
      [assetId]
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listCommentsRepository(assetId, accountId) {
  const { rows } = await pool.query(
    `SELECT ac.asset_comment_id, ac.comment, ac.created_at, ac.updated_at,
            author.display_name AS author_name, author.handle AS author_handle,
            avatar.path AS author_avatar_path,
            (ac.account_id = $2) AS is_owner,
            COALESCE((
              SELECT json_agg(json_build_object(
                'asset_reply_id', ar.asset_reply_id,
                'reply', ar.reply,
                'created_at', ar.created_at,
                'updated_at', ar.updated_at,
                'author_name', reply_author.display_name,
                'author_handle', reply_author.handle,
                'author_avatar_path', reply_avatar.path,
                'is_owner', ar.account_id = $2
              ) ORDER BY ar.created_at, ar.asset_reply_id)
              FROM asset_replies ar
              JOIN accounts reply_author ON reply_author.account_id = ar.account_id
              LEFT JOIN files reply_avatar ON reply_avatar.file_id = reply_author.avatar_file_id
              WHERE ar.asset_comment_id = ac.asset_comment_id AND ar.deleted_at IS NULL
            ), '[]'::json) AS replies
     FROM asset_comments ac
     JOIN accounts author ON author.account_id = ac.account_id
     LEFT JOIN files avatar ON avatar.file_id = author.avatar_file_id
     WHERE ac.market_asset_id = $1 AND ac.deleted_at IS NULL
     ORDER BY ac.created_at ASC, ac.asset_comment_id ASC`,
    [assetId, accountId]
  );
  return rows;
}

async function createCommentRepository(assetId, accountId, comment) {
  const { rows } = await pool.query(
    `WITH inserted AS (
       INSERT INTO asset_comments (comment, market_asset_id, account_id)
       VALUES ($1, $2, $3)
       RETURNING asset_comment_id, comment, created_at, updated_at, account_id
     )
     SELECT i.asset_comment_id, i.comment, i.created_at, i.updated_at,
            a.display_name AS author_name, a.handle AS author_handle,
            f.path AS author_avatar_path, TRUE AS is_owner, '[]'::json AS replies
     FROM inserted i
     JOIN accounts a ON a.account_id = i.account_id
     LEFT JOIN files f ON f.file_id = a.avatar_file_id`,
    [comment, assetId, accountId]
  );
  return rows[0];
}

async function updateCommentRepository(assetId, commentId, accountId, comment) {
  const { rows } = await pool.query(
    `UPDATE asset_comments SET comment = $4, updated_at = CURRENT_TIMESTAMP
     WHERE asset_comment_id = $2 AND market_asset_id = $1
       AND account_id = $3 AND deleted_at IS NULL
     RETURNING asset_comment_id, comment, created_at, updated_at, TRUE AS is_owner`,
    [assetId, commentId, accountId, comment]
  );
  return rows[0] || null;
}

async function deleteCommentRepository(assetId, commentId, accountId) {
  const result = await pool.query(
    `UPDATE asset_comments SET deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
     WHERE asset_comment_id = $2 AND market_asset_id = $1
       AND account_id = $3 AND deleted_at IS NULL`,
    [assetId, commentId, accountId]
  );
  return result.rowCount === 1;
}

async function createReplyRepository(assetId, commentId, accountId, reply) {
  const { rows } = await pool.query(
    `WITH inserted AS (
       INSERT INTO asset_replies (reply, asset_comment_id, account_id)
       SELECT $4, ac.asset_comment_id, $3
       FROM asset_comments ac
       WHERE ac.asset_comment_id = $2
         AND ac.market_asset_id = $1
         AND ac.deleted_at IS NULL
       RETURNING asset_reply_id, reply, created_at, updated_at, account_id
     )
     SELECT i.asset_reply_id, i.reply, i.created_at, i.updated_at,
            author.display_name AS author_name, author.handle AS author_handle,
            avatar.path AS author_avatar_path, TRUE AS is_owner
     FROM inserted i
     JOIN accounts author ON author.account_id = i.account_id
     LEFT JOIN files avatar ON avatar.file_id = author.avatar_file_id`,
    [assetId, commentId, accountId, reply]
  );
  return rows[0] || null;
}

async function updateReplyRepository(assetId, commentId, replyId, accountId, reply) {
  const { rows } = await pool.query(
    `WITH updated AS (
       UPDATE asset_replies ar
       SET reply = $5, updated_at = CURRENT_TIMESTAMP
       FROM asset_comments ac
       WHERE ar.asset_reply_id = $3
         AND ar.asset_comment_id = $2
         AND ar.account_id = $4
         AND ar.deleted_at IS NULL
         AND ac.asset_comment_id = ar.asset_comment_id
         AND ac.market_asset_id = $1
         AND ac.deleted_at IS NULL
       RETURNING ar.asset_reply_id, ar.reply, ar.created_at, ar.updated_at, ar.account_id
     )
     SELECT u.asset_reply_id, u.reply, u.created_at, u.updated_at,
            author.display_name AS author_name, author.handle AS author_handle,
            avatar.path AS author_avatar_path, TRUE AS is_owner
     FROM updated u
     JOIN accounts author ON author.account_id = u.account_id
     LEFT JOIN files avatar ON avatar.file_id = author.avatar_file_id`,
    [assetId, commentId, replyId, accountId, reply]
  );
  return rows[0] || null;
}

async function deleteReplyRepository(assetId, commentId, replyId, accountId) {
  const result = await pool.query(
    `UPDATE asset_replies ar
     SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     FROM asset_comments ac
     WHERE ar.asset_reply_id = $3
       AND ar.asset_comment_id = $2
       AND ar.account_id = $4
       AND ar.deleted_at IS NULL
       AND ac.asset_comment_id = ar.asset_comment_id
       AND ac.market_asset_id = $1
       AND ac.deleted_at IS NULL`,
    [assetId, commentId, replyId, accountId]
  );
  return result.rowCount === 1;
}

async function setAssetLikeRepository(assetId, accountId, liked) {
  if (liked) {
    await pool.query(
      `INSERT INTO asset_likes (market_asset_id, account_id, created_at, deleted_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, NULL)
       ON CONFLICT (market_asset_id, account_id)
       DO UPDATE SET deleted_at = NULL,
                     created_at = CASE WHEN asset_likes.deleted_at IS NULL
                       THEN asset_likes.created_at ELSE CURRENT_TIMESTAMP END`,
      [assetId, accountId]
    );
  } else {
    await pool.query(
      `UPDATE asset_likes SET deleted_at = CURRENT_TIMESTAMP
       WHERE market_asset_id = $1 AND account_id = $2 AND deleted_at IS NULL`,
      [assetId, accountId]
    );
  }
  const { rows: [result] } = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM asset_likes
       WHERE market_asset_id = $1 AND account_id = $2 AND deleted_at IS NULL
     ) AS is_liked,
     (SELECT COUNT(*)::int FROM asset_likes
      WHERE market_asset_id = $1 AND deleted_at IS NULL) AS like_count`,
    [assetId, accountId]
  );
  return result;
}

async function setAssetSaveRepository(assetId, accountId, saved) {
  if (saved) {
    await pool.query(
      `INSERT INTO asset_saves (market_asset_id, account_id, created_at, deleted_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, NULL)
       ON CONFLICT (market_asset_id, account_id)
       DO UPDATE SET deleted_at = NULL,
                     created_at = CASE WHEN asset_saves.deleted_at IS NULL
                       THEN asset_saves.created_at ELSE CURRENT_TIMESTAMP END`,
      [assetId, accountId]
    );
  } else {
    await pool.query(
      `UPDATE asset_saves SET deleted_at = CURRENT_TIMESTAMP
       WHERE market_asset_id = $1 AND account_id = $2 AND deleted_at IS NULL`,
      [assetId, accountId]
    );
  }
  const { rows: [result] } = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM asset_saves
       WHERE market_asset_id = $1 AND account_id = $2 AND deleted_at IS NULL
     ) AS is_saved,
     (SELECT COUNT(*)::int FROM asset_saves
      WHERE market_asset_id = $1 AND deleted_at IS NULL) AS save_count`,
    [assetId, accountId]
  );
  return result;
}

async function listAssetReviewsRepository(assetId, accountId) {
  const { rows } = await pool.query(
    `SELECT review.asset_review_id, review.rating, review.review,
            review.created_at, review.updated_at,
            author.display_name AS author_name,
            author.handle AS author_handle,
            avatar.path AS author_avatar_path,
            (review.account_id = $2) AS is_owner
     FROM asset_reviews review
     JOIN accounts author ON author.account_id = review.account_id
     LEFT JOIN files avatar ON avatar.file_id = author.avatar_file_id
     WHERE review.market_asset_id = $1
       AND review.deleted_at IS NULL
       AND author.deleted_at IS NULL
       AND EXISTS (
         SELECT 1
         FROM market_asset_licenses ownership
         JOIN users buyer ON buyer.user_id = ownership.buyer_user_id
         WHERE ownership.market_asset_id = review.market_asset_id
           AND buyer.account_id = review.account_id
           AND ownership.status = 'active'
           AND ownership.deleted_at IS NULL
       )
     ORDER BY review.created_at DESC, review.asset_review_id DESC`,
    [assetId, accountId]
  );
  return rows;
}

async function createAssetReviewRepository(assetId, accountId, rating, reviewText) {
  const { rows } = await pool.query(
    `WITH inserted AS (
       INSERT INTO asset_reviews
         (market_asset_id, account_id, rating, review, created_at, updated_at, deleted_at)
       SELECT $1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL
       WHERE EXISTS (
         SELECT 1
         FROM market_asset_licenses ownership
         JOIN users buyer ON buyer.user_id = ownership.buyer_user_id
         WHERE ownership.market_asset_id = $1
           AND buyer.account_id = $2
           AND ownership.status = 'active'
           AND ownership.deleted_at IS NULL
       )
       ON CONFLICT (market_asset_id, account_id)
       DO UPDATE SET rating = EXCLUDED.rating,
                     review = EXCLUDED.review,
                     created_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP,
                     deleted_at = NULL
       WHERE asset_reviews.deleted_at IS NOT NULL
       RETURNING asset_review_id, rating, review, created_at, updated_at, account_id
     )
     SELECT inserted.asset_review_id, inserted.rating, inserted.review,
            inserted.created_at, inserted.updated_at,
            author.display_name AS author_name,
            author.handle AS author_handle,
            avatar.path AS author_avatar_path,
            TRUE AS is_owner
     FROM inserted
     JOIN accounts author ON author.account_id = inserted.account_id
     LEFT JOIN files avatar ON avatar.file_id = author.avatar_file_id`,
    [assetId, accountId, rating, reviewText]
  );
  return rows[0] || null;
}

async function updateAssetReviewRepository(assetId, reviewId, accountId, rating, reviewText) {
  const { rows } = await pool.query(
    `WITH updated AS (
       UPDATE asset_reviews review
       SET rating = $4, review = $5, updated_at = CURRENT_TIMESTAMP
       WHERE review.asset_review_id = $2
         AND review.market_asset_id = $1
         AND review.account_id = $3
         AND review.deleted_at IS NULL
         AND EXISTS (
           SELECT 1
           FROM market_asset_licenses ownership
           JOIN users buyer ON buyer.user_id = ownership.buyer_user_id
           WHERE ownership.market_asset_id = review.market_asset_id
             AND buyer.account_id = review.account_id
             AND ownership.status = 'active'
             AND ownership.deleted_at IS NULL
         )
       RETURNING review.asset_review_id, review.rating, review.review,
                 review.created_at, review.updated_at, review.account_id
     )
     SELECT updated.asset_review_id, updated.rating, updated.review,
            updated.created_at, updated.updated_at,
            author.display_name AS author_name,
            author.handle AS author_handle,
            avatar.path AS author_avatar_path,
            TRUE AS is_owner
     FROM updated
     JOIN accounts author ON author.account_id = updated.account_id
     LEFT JOIN files avatar ON avatar.file_id = author.avatar_file_id`,
    [assetId, reviewId, accountId, rating, reviewText]
  );
  return rows[0] || null;
}

async function deleteAssetReviewRepository(assetId, reviewId, accountId) {
  const result = await pool.query(
    `UPDATE asset_reviews
     SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE asset_review_id = $2 AND market_asset_id = $1
       AND account_id = $3 AND deleted_at IS NULL`,
    [assetId, reviewId, accountId]
  );
  return result.rowCount === 1;
}

async function validateAssetRefundEligibility(marketAssetId, buyerAccountId, licenseId = null) {
  const { getMarketplaceRefundWindowDays } = require('../lib/PlatformFeeSettings');
  const refundWindowDays = await getMarketplaceRefundWindowDays();
  const purchaseRes = await pool.query(
    `SELECT uma.market_asset_license_id, uma.credit_transaction_id,
            uma.purchased_at, uma.status, uma.price_credits, uma.project_id
     FROM market_asset_licenses uma
     JOIN users u ON u.user_id = uma.buyer_user_id
     JOIN market_assets ma ON ma.market_asset_id = uma.market_asset_id
     WHERE uma.market_asset_id = $1 AND u.account_id = $2
       AND uma.deleted_at IS NULL
       AND ($3::uuid IS NULL OR uma.market_asset_license_id = $3)
     ORDER BY uma.purchased_at DESC, uma.market_asset_license_id DESC
     LIMIT 2`,
    [marketAssetId, buyerAccountId, licenseId]
  );
  if (!purchaseRes.rows.length) {
    return { allowed: false, reason: 'No active purchase found for this asset.' };
  }
  if (purchaseRes.rows.length > 1) {
    return { allowed: false, reason: 'Select the specific license purchase to refund.' };
  }
  const purchase = purchaseRes.rows[0];
  if (purchase.status === 'refunded') {
    return { allowed: false, reason: 'This purchase has already been refunded.' };
  }
  const purchaseDate = new Date(purchase.purchased_at);
  const now = new Date();
  const ageInDays = (now - purchaseDate) / (1000 * 60 * 60 * 24);
  if (ageInDays > refundWindowDays) {
    return {
      allowed: false,
      reason: `Refund window of ${refundWindowDays} days has expired (${Math.floor(ageInDays)} days since purchase).`,
      refundWindowDays,
      ageInDays,
    };
  }
  return {
    allowed: true,
    purchase,
    refundWindowDays,
    ageInDays,
  };
}

module.exports = {
  listAssetLicensesRepository,
  assignAssetLicenseRepository,
  getAssetPostingEligibilityRepository,
  listAssetsRepository,
  getAssetRepository,
  createAssetRepository,
  updateAssetRepository,
  deleteAssetRepository,
  getAssetDownloadRepository,
  purchaseAssetRepository,
  listCommentsRepository,
  createCommentRepository,
  updateCommentRepository,
  deleteCommentRepository,
  createReplyRepository,
  updateReplyRepository,
  deleteReplyRepository,
  setAssetLikeRepository,
  setAssetSaveRepository,
  listAssetReviewsRepository,
  createAssetReviewRepository,
  updateAssetReviewRepository,
  deleteAssetReviewRepository,
  validateAssetRefundEligibility,
};
