const { pool } = require('../lib/Database');
const {
  MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT,
  calculateAssetTransactionFee,
} = require('../lib/AssetMarketplaceConstants');

const ORIGINAL_FILE_SIZE_LIMITS = {
  image: 25 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  document: 25 * 1024 * 1024,
  archive: 100 * 1024 * 1024,
};

function mediaTypeFromMime(mimeType) {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType?.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'document';
  if (['application/zip', 'application/x-zip-compressed'].includes(mimeType)) return 'archive';
  return null;
}

async function createSecondaryMediaAssets(
  client,
  { marketAssetId, primaryMediaAssetId, originalFileIds, previewFileIds }
) {
  if (originalFileIds.length <= 1) return;

  await client.query(
    `WITH input AS MATERIALIZED (
       SELECT gen_random_uuid() AS media_asset_id,
              original.file_id AS original_file_id,
              preview.file_id AS preview_file_id,
              original.ordinality::integer AS position
       FROM unnest($2::uuid[]) WITH ORDINALITY AS original(file_id, ordinality)
       JOIN unnest($3::uuid[]) WITH ORDINALITY AS preview(file_id, ordinality)
         ON preview.ordinality = original.ordinality
     ), inserted_media AS (
       INSERT INTO media_assets
         (media_asset_id, name, type, width, height, duration_seconds, is_marketed,
          owner_user_id, original_file_id, proxy_file_id, thumbnail_file_id, project_id)
       SELECT input.media_asset_id, primary_media.name, primary_media.type,
              primary_media.width, primary_media.height, primary_media.duration_seconds,
              TRUE, primary_media.owner_user_id, input.original_file_id,
              input.preview_file_id, primary_media.thumbnail_file_id,
              primary_media.project_id
       FROM media_assets primary_media
       CROSS JOIN input
       WHERE primary_media.media_asset_id = $1
       RETURNING media_asset_id
     ), inserted_bundle AS (
       INSERT INTO media_asset_bundle_files
         (media_asset_id, file_id, preview_file_id, position)
       SELECT input.media_asset_id, input.original_file_id,
              input.preview_file_id, input.position
       FROM input
       JOIN inserted_media USING (media_asset_id)
       RETURNING media_asset_id
     )
     INSERT INTO market_media_assets (market_asset_id, media_asset_id)
     SELECT $4, media_asset_id FROM inserted_bundle`,
    [primaryMediaAssetId, originalFileIds.slice(1), previewFileIds.slice(1), marketAssetId]
  );
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
       JOIN market_media_assets mma ON mma.market_asset_id = ma.market_asset_id
       JOIN media_assets media ON media.media_asset_id = mma.media_asset_id
       JOIN users owner_user ON owner_user.user_id = media.owner_user_id
       WHERE owner_user.account_id = $1
         AND ma.status = 'published'
         AND ($2::uuid IS NULL OR ma.market_asset_id <> $2::uuid)
         AND ma.deleted_at IS NULL
         AND media.deleted_at IS NULL
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
         media.media_asset_id, media.type, media.width, media.height,
         media.duration_seconds, media.proxy_path,
         media.thumbnail_path, media.mime_type, media.size_bytes,
         media.thumbnails, media.thumbnail_count,
         media.bundle_files, media.bundle_file_count,
         media.project_links, media.project_link_count,
         owner.display_name AS creator_name, owner.handle AS creator_handle, owner_avatar.path AS creator_avatar_path,
         owner.account_id AS owner_account_id,
         (owner.account_id = $1) AS is_owner,
         purchase_access.is_purchased,
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
              FROM user_market_assets review_ownership
              JOIN users reviewing_user ON reviewing_user.user_id = review_ownership.user_id
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
              FROM user_market_assets review_ownership
              JOIN users reviewing_user ON reviewing_user.user_id = review_ownership.user_id
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
         (SELECT COUNT(*)::int FROM asset_comments ac
          WHERE ac.market_asset_id = ma.market_asset_id AND ac.deleted_at IS NULL) AS comment_count
  FROM market_assets ma
  JOIN LATERAL (
    SELECT m.media_asset_id, m.type, m.width, m.height, m.duration_seconds,
           COALESCE(primary_content.preview_path, thumbnail.path) AS proxy_path,
           thumbnail.path AS thumbnail_path,
           primary_content.mime_type, primary_content.size_bytes,
           COALESCE((
             SELECT json_agg(json_build_object(
               'media_asset_thumbnail_id', asset_thumbnail.media_asset_thumbnail_id,
               'path', thumbnail_file.path,
               'position', asset_thumbnail.position
             ) ORDER BY asset_thumbnail.position, asset_thumbnail.media_asset_thumbnail_id)
             FROM market_media_assets thumbnail_media
             JOIN media_asset_thumbnails asset_thumbnail
               ON asset_thumbnail.media_asset_id = thumbnail_media.media_asset_id
             JOIN files thumbnail_file ON thumbnail_file.file_id = asset_thumbnail.file_id
             WHERE thumbnail_media.market_asset_id = ma.market_asset_id
               AND asset_thumbnail.deleted_at IS NULL
               AND thumbnail_file.deleted_at IS NULL
           ), '[]'::json) AS thumbnails,
           (SELECT COUNT(*)::int
            FROM market_media_assets thumbnail_count_media
            JOIN media_asset_thumbnails thumbnail_count
              ON thumbnail_count.media_asset_id = thumbnail_count_media.media_asset_id
            JOIN files counted_thumbnail ON counted_thumbnail.file_id = thumbnail_count.file_id
            WHERE thumbnail_count_media.market_asset_id = ma.market_asset_id
              AND thumbnail_count.deleted_at IS NULL
              AND counted_thumbnail.deleted_at IS NULL) AS thumbnail_count,
           COALESCE((
             SELECT json_agg(json_build_object(
               'media_asset_bundle_file_id', bundle.media_asset_bundle_file_id,
               'name', bundle_file.name,
               'mime_type', bundle_file.mime_type,
               'size_bytes', bundle_file.size_bytes,
               'preview_path', bundle_preview.path,
               'preview_mime_type', bundle_preview.mime_type,
               'position', bundle.position
             ) ORDER BY bundle.position, bundle.media_asset_bundle_file_id)
             FROM market_media_assets bundle_media
             JOIN media_asset_bundle_files bundle
               ON bundle.media_asset_id = bundle_media.media_asset_id
             JOIN files bundle_file ON bundle_file.file_id = bundle.file_id
             JOIN files bundle_preview ON bundle_preview.file_id = bundle.preview_file_id
             WHERE bundle_media.market_asset_id = ma.market_asset_id
               AND bundle.deleted_at IS NULL
               AND bundle_file.deleted_at IS NULL
               AND bundle_preview.deleted_at IS NULL
           ), '[]'::json) AS bundle_files,
           (SELECT COUNT(*)::int
            FROM market_media_assets bundle_count_media
            JOIN media_asset_bundle_files bundle_count
              ON bundle_count.media_asset_id = bundle_count_media.media_asset_id
            JOIN files counted_file ON counted_file.file_id = bundle_count.file_id
            JOIN files counted_preview ON counted_preview.file_id = bundle_count.preview_file_id
            WHERE bundle_count_media.market_asset_id = ma.market_asset_id
              AND bundle_count.deleted_at IS NULL
              AND counted_file.deleted_at IS NULL
              AND counted_preview.deleted_at IS NULL) AS bundle_file_count,
           COALESCE((
             SELECT json_agg(json_build_object(
               'media_asset_project_link_id', project_link.media_asset_project_link_id,
               'label', project_link.label,
               'provider', project_link.provider,
               'position', project_link.position
             ) ORDER BY project_link.position, project_link.media_asset_project_link_id)
             FROM market_media_assets project_link_media
             JOIN media_asset_project_links project_link
               ON project_link.media_asset_id = project_link_media.media_asset_id
             WHERE project_link_media.market_asset_id = ma.market_asset_id
               AND project_link.deleted_at IS NULL
           ), '[]'::json) AS project_links,
           (SELECT COUNT(*)::int
            FROM market_media_assets project_link_count_media
            JOIN media_asset_project_links project_link_count
              ON project_link_count.media_asset_id = project_link_count_media.media_asset_id
            WHERE project_link_count_media.market_asset_id = ma.market_asset_id
              AND project_link_count.deleted_at IS NULL) AS project_link_count,
           m.owner_user_id
    FROM market_media_assets mma
    JOIN media_assets m ON m.media_asset_id = mma.media_asset_id
    JOIN files thumbnail ON thumbnail.file_id = m.thumbnail_file_id
    LEFT JOIN LATERAL (
      SELECT original.mime_type, original.size_bytes, preview.path AS preview_path
      FROM media_asset_bundle_files primary_bundle
      JOIN files original ON original.file_id = primary_bundle.file_id
      JOIN files preview ON preview.file_id = primary_bundle.preview_file_id
      WHERE primary_bundle.media_asset_id = m.media_asset_id
        AND primary_bundle.deleted_at IS NULL
        AND original.deleted_at IS NULL
        AND preview.deleted_at IS NULL
      ORDER BY primary_bundle.position, primary_bundle.media_asset_bundle_file_id
      LIMIT 1
    ) primary_content ON TRUE
    WHERE mma.market_asset_id = ma.market_asset_id
      AND m.deleted_at IS NULL
      AND thumbnail.deleted_at IS NULL
    ORDER BY
      CASE WHEN EXISTS (
        SELECT 1 FROM media_asset_bundle_files primary_bundle_marker
        WHERE primary_bundle_marker.media_asset_id = m.media_asset_id
          AND primary_bundle_marker.deleted_at IS NULL
      ) THEN 0 ELSE 1 END,
      CASE WHEN EXISTS (
        SELECT 1 FROM media_asset_thumbnails primary_thumbnail_marker
        WHERE primary_thumbnail_marker.media_asset_id = m.media_asset_id
          AND primary_thumbnail_marker.deleted_at IS NULL
      ) THEN 0 ELSE 1 END,
      m.created_at, m.media_asset_id
    LIMIT 1
  ) media ON TRUE
  JOIN users owner_user ON owner_user.user_id = media.owner_user_id
  JOIN accounts owner ON owner.account_id = owner_user.account_id
    LEFT JOIN files owner_avatar ON owner_avatar.file_id = owner.avatar_file_id
  LEFT JOIN LATERAL (
    SELECT EXISTS (
      SELECT 1
      FROM user_market_assets owned_asset
      JOIN users purchasing_user ON purchasing_user.user_id = owned_asset.user_id
      WHERE owned_asset.market_asset_id = ma.market_asset_id
        AND purchasing_user.account_id = $1
        AND owned_asset.status = 'active'
        AND owned_asset.deleted_at IS NULL
    ) AS is_purchased
  ) purchase_access ON TRUE
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

async function listAssetsRepository({ accountId, search, type, status, view, limit, offset }) {
  const visibility = view === 'mine'
    ? 'owner.account_id = $1'
    : view === 'purchased'
      ? 'purchase_access.is_purchased'
      : view === 'saved'
        ? `ma.status = 'published' AND EXISTS (
            SELECT 1 FROM asset_saves saved_asset
            WHERE saved_asset.market_asset_id = ma.market_asset_id
              AND saved_asset.account_id = $1
              AND saved_asset.deleted_at IS NULL
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
       AND ($4 = '' OR ma.status = $4)
     ORDER BY ma.created_at DESC, ma.market_asset_id DESC
     LIMIT $5 OFFSET $6`,
    [accountId, search, type, status, limit, offset]
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

async function createAssetRepository(accountId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eligibility = await readAssetPostingEligibility(client, accountId, { lock: true });
    if (!eligibility.allowed) {
      const error = new Error(eligibility.code);
      error.code = eligibility.code;
      error.eligibility = eligibility;
      throw error;
    }

    const fileIds = [...data.originalFileIds, ...data.previewFileIds, ...data.thumbnailFileIds];
    const ownedFiles = await client.query(
      `SELECT f.file_id, f.name, f.path, f.mime_type, f.size_bytes, u.user_id
       FROM files f
       JOIN upload_intents ui ON ui.file_id = f.file_id
       JOIN users u ON u.account_id = $2
       WHERE f.file_id = ANY($1::uuid[]) AND ui.account_id = $2
         AND ui.status = 'consumed' AND ui.consumed_at IS NOT NULL
         AND f.deleted_at IS NULL
       FOR UPDATE OF f`,
      [fileIds, accountId]
    );
    const filesById = new Map(ownedFiles.rows.map((file) => [String(file.file_id), file]));
    const originals = data.originalFileIds.map((fileId) => filesById.get(fileId));
    const previews = data.previewFileIds.map((fileId) => filesById.get(fileId));
    const thumbnails = data.thumbnailFileIds.map((fileId) => filesById.get(fileId));
    if (originals.some((file) => !file) || previews.some((file) => !file)
      || thumbnails.some((file) => !file)) {
      const error = new Error('ASSET_FILE_NOT_OWNED');
      error.code = 'ASSET_FILE_NOT_OWNED';
      throw error;
    }

    const originalTypes = originals.map((file) => mediaTypeFromMime(file.mime_type));
    const hasInvalidOriginalType = originalTypes.some((type) => !type);
    const primaryTypeMismatch = data.type !== 'template'
      && originalTypes[0] !== data.type;
    if (hasInvalidOriginalType || primaryTypeMismatch
      || previews.some((file) => !file.mime_type?.startsWith('image/'))
      || thumbnails.some((file) => !file.mime_type?.startsWith('image/'))) {
      const error = new Error('ASSET_FILE_TYPE_MISMATCH');
      error.code = 'ASSET_FILE_TYPE_MISMATCH';
      throw error;
    }

    let aggregateOriginalBytes = 0;
    for (let index = 0; index < originals.length; index += 1) {
      const sizeBytes = Number(originals[index].size_bytes);
      const limit = ORIGINAL_FILE_SIZE_LIMITS[originalTypes[index]];
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > limit) {
        const error = new Error('ASSET_ORIGINAL_FILE_TOO_LARGE');
        error.code = 'ASSET_ORIGINAL_FILE_TOO_LARGE';
        throw error;
      }
      aggregateOriginalBytes += sizeBytes;
    }
    if (previews.some((file) => !Number.isSafeInteger(Number(file.size_bytes))
      || Number(file.size_bytes) <= 0
      || Number(file.size_bytes) > 5 * 1024 * 1024)) {
      const error = new Error('ASSET_PREVIEW_INVALID');
      error.code = 'ASSET_PREVIEW_INVALID';
      throw error;
    }
    if (!Number.isSafeInteger(aggregateOriginalBytes)
      || aggregateOriginalBytes > data.maxBundleBytes) {
      const error = new Error('ASSET_BUNDLE_TOO_LARGE');
      error.code = 'ASSET_BUNDLE_TOO_LARGE';
      throw error;
    }
    if (thumbnails.some((file) => !Number.isSafeInteger(Number(file.size_bytes))
      || Number(file.size_bytes) <= 0
      || Number(file.size_bytes) > 5 * 1024 * 1024)) {
      const error = new Error('ASSET_THUMBNAIL_INVALID');
      error.code = 'ASSET_THUMBNAIL_INVALID';
      throw error;
    }
    if (originals.some((file) => !file.path.startsWith('asset-originals/'))
      || previews.some((file) => !file.path.startsWith('assets/'))
      || thumbnails.some((file) => !file.path.startsWith('assets/'))) {
      const error = new Error('ASSET_FILE_PLACEMENT_INVALID');
      error.code = 'ASSET_FILE_PLACEMENT_INVALID';
      throw error;
    }

    const alreadyUsed = await client.query(
      `SELECT 1
       FROM (
         SELECT m.media_asset_id
         FROM media_assets m
         WHERE m.deleted_at IS NULL
           AND m.thumbnail_file_id = ANY($1::uuid[])
         UNION ALL
         SELECT asset_thumbnail.media_asset_id
         FROM media_asset_thumbnails asset_thumbnail
         JOIN media_assets m ON m.media_asset_id = asset_thumbnail.media_asset_id
         WHERE m.deleted_at IS NULL
           AND asset_thumbnail.deleted_at IS NULL
           AND asset_thumbnail.file_id = ANY($1::uuid[])
         UNION ALL
         SELECT bundle.media_asset_id
         FROM media_asset_bundle_files bundle
         JOIN media_assets m ON m.media_asset_id = bundle.media_asset_id
         WHERE m.deleted_at IS NULL
           AND bundle.deleted_at IS NULL
           AND (bundle.file_id = ANY($1::uuid[])
             OR bundle.preview_file_id = ANY($1::uuid[]))
       ) used_files
       LIMIT 1`,
      [fileIds]
    );
    if (alreadyUsed.rowCount) {
      const error = new Error('ASSET_FILE_ALREADY_USED');
      error.code = 'ASSET_FILE_ALREADY_USED';
      throw error;
    }

    const primaryThumbnail = thumbnails[0];
    const primaryOriginalFileId = data.originalFileIds[0] || data.thumbnailFileId;
    const media = await client.query(
      `INSERT INTO media_assets
         (name, type, width, height, duration_seconds, is_marketed, owner_user_id,
          proxy_file_id, thumbnail_file_id, original_file_id)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8, $9)
       RETURNING media_asset_id`,
      [data.name, data.type, data.width, data.height, data.durationSeconds,
        primaryThumbnail.user_id, data.previewFileIds[0] || data.thumbnailFileId,
        data.thumbnailFileId, primaryOriginalFileId]
    );

    if (data.originalFileIds.length > 0) {
      await client.query(
        `INSERT INTO media_asset_bundle_files
           (media_asset_id, file_id, preview_file_id, position)
         VALUES ($1, $2, $3, 0)`,
        [media.rows[0].media_asset_id, data.originalFileIds[0], data.previewFileIds[0]]
      );
    }

    await client.query(
      `INSERT INTO media_asset_thumbnails (media_asset_id, file_id, position)
       SELECT $1, thumbnail.file_id, thumbnail.ordinality - 1
       FROM unnest($2::uuid[]) WITH ORDINALITY AS thumbnail(file_id, ordinality)`,
      [media.rows[0].media_asset_id, data.thumbnailFileIds]
    );

    if (data.projectLinks.length > 0) {
      await client.query(
        `INSERT INTO media_asset_project_links
           (media_asset_id, label, provider, url, position)
         SELECT $1, link.label, link.provider, link.url, link.ordinality - 1
         FROM unnest($2::text[], $3::text[], $4::text[])
           WITH ORDINALITY AS link(label, provider, url, ordinality)`,
        [
          media.rows[0].media_asset_id,
          data.projectLinks.map((link) => link.label),
          data.projectLinks.map((link) => link.provider),
          data.projectLinks.map((link) => link.url),
        ]
      );
    }

    const market = await client.query(
      `INSERT INTO market_assets
         (name, description, price_credits, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING market_asset_id`,
      [data.name, data.description, data.priceCredits, data.status]
    );
    await client.query(
      `INSERT INTO market_media_assets (market_asset_id, media_asset_id)
       VALUES ($1, $2)`,
      [market.rows[0].market_asset_id, media.rows[0].media_asset_id]
    );
    await createSecondaryMediaAssets(client, {
      marketAssetId: market.rows[0].market_asset_id,
      primaryMediaAssetId: media.rows[0].media_asset_id,
      originalFileIds: data.originalFileIds,
      previewFileIds: data.previewFileIds,
    });
    await syncAssetTags(client, market.rows[0].market_asset_id, data.tags);
    await client.query('COMMIT');
    return market.rows[0].market_asset_id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getAssetDownloadRepository(assetId, accountId, bundleFileId = null) {
  const { rows } = await pool.query(
    `SELECT bundle.media_asset_bundle_file_id, bundle.position,
            original.path, original.name, original.mime_type, original.size_bytes,
            (owner.account_id = $2) AS is_owner,
            EXISTS (
              SELECT 1
              FROM user_market_assets owned_asset
              JOIN users purchasing_user ON purchasing_user.user_id = owned_asset.user_id
              WHERE owned_asset.market_asset_id = ma.market_asset_id
                AND purchasing_user.account_id = $2
                AND owned_asset.status = 'active'
                AND owned_asset.deleted_at IS NULL
            ) AS is_purchased
     FROM market_assets ma
     JOIN market_media_assets mma ON mma.market_asset_id = ma.market_asset_id
     JOIN media_assets media ON media.media_asset_id = mma.media_asset_id
     JOIN media_asset_bundle_files bundle ON bundle.media_asset_id = media.media_asset_id
     JOIN files original ON original.file_id = bundle.file_id
     JOIN users owner_user ON owner_user.user_id = media.owner_user_id
     JOIN accounts owner ON owner.account_id = owner_user.account_id
     WHERE ma.market_asset_id = $1
       AND ma.deleted_at IS NULL AND media.deleted_at IS NULL
       AND bundle.deleted_at IS NULL AND original.deleted_at IS NULL
       AND ($3::uuid IS NULL OR bundle.media_asset_bundle_file_id = $3)
     ORDER BY media.created_at, media.media_asset_id, bundle.position,
              bundle.media_asset_bundle_file_id
     LIMIT 1`,
    [assetId, accountId, bundleFileId]
  );
  return rows[0] || null;
}

async function getAssetProjectLinkAccessRepository(assetId, projectLinkId, accountId) {
  const { rows } = await pool.query(
    `SELECT project_link.url, project_link.label, project_link.provider,
            (owner.account_id = $3) AS is_owner,
            EXISTS (
              SELECT 1
              FROM user_market_assets owned_asset
              JOIN users purchasing_user ON purchasing_user.user_id = owned_asset.user_id
              WHERE owned_asset.market_asset_id = ma.market_asset_id
                AND purchasing_user.account_id = $3
                AND owned_asset.status = 'active'
                AND owned_asset.deleted_at IS NULL
            ) AS is_purchased
     FROM market_assets ma
     JOIN market_media_assets mma ON mma.market_asset_id = ma.market_asset_id
     JOIN media_assets media ON media.media_asset_id = mma.media_asset_id
     JOIN media_asset_project_links project_link
       ON project_link.media_asset_id = media.media_asset_id
     JOIN users owner_user ON owner_user.user_id = media.owner_user_id
     JOIN accounts owner ON owner.account_id = owner_user.account_id
     WHERE ma.market_asset_id = $1
       AND project_link.media_asset_project_link_id = $2
       AND ma.deleted_at IS NULL
       AND media.deleted_at IS NULL
       AND project_link.deleted_at IS NULL
       AND owner.deleted_at IS NULL
     LIMIT 1`,
    [assetId, projectLinkId, accountId]
  );
  return rows[0] || null;
}

async function purchaseAssetRepository(assetId, buyerAccountId) {
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
       JOIN market_media_assets mma ON mma.market_asset_id = ma.market_asset_id
       JOIN media_assets media ON media.media_asset_id = mma.media_asset_id
       JOIN users owner_user ON owner_user.user_id = media.owner_user_id
       JOIN accounts owner ON owner.account_id = owner_user.account_id
       JOIN accounts buyer ON buyer.account_id = $2
       JOIN users buyer_user ON buyer_user.account_id = buyer.account_id
       WHERE ma.market_asset_id = $1
         AND ma.deleted_at IS NULL
         AND media.deleted_at IS NULL
         AND owner.deleted_at IS NULL
         AND buyer.deleted_at IS NULL
       ORDER BY media.created_at, media.media_asset_id
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
    const transactionFeeCredits = calculateAssetTransactionFee(priceCredits);
    const creatorNetCredits = priceCredits - transactionFeeCredits;

    const existingPurchase = await client.query(
      `SELECT owned_asset.user_id
       FROM user_market_assets owned_asset
       WHERE owned_asset.user_id = $1
         AND owned_asset.market_asset_id = $2
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
        transactionId: null,
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
    await client.query(
      `INSERT INTO user_market_assets
         (user_id, market_asset_id, price, status, created_at, deleted_at)
       VALUES ($1, $2, $3, 'active', CURRENT_TIMESTAMP, NULL)
       ON CONFLICT (user_id, market_asset_id)
       DO UPDATE SET price = EXCLUDED.price,
                     status = 'active',
                     created_at = CURRENT_TIMESTAMP,
                     deleted_at = NULL`,
      [asset.buyer_user_id, assetId, priceCredits]
    );
    const purchaseLabel = priceCredits === 0 ? 'claimed' : 'purchased';
    const buyerMessage = priceCredits === 0
      ? `You claimed \"${asset.name}\".`
      : `You purchased \"${asset.name}\" for ${priceCredits.toLocaleString()} credits.`;
    const creatorMessage = priceCredits === 0
      ? `${asset.buyer_name} claimed \"${asset.name}\".`
      : `${asset.buyer_name} purchased \"${asset.name}\". You received ${creatorNetCredits.toLocaleString()} credits after the ${MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT}% marketplace fee (${transactionFeeCredits.toLocaleString()} credits).`;
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

async function validateAssetReplacementUploads(client, accountId, content) {
  const fileIds = [
    ...content.originalFileIds,
    ...content.previewFileIds,
    ...content.thumbnailFileIds,
  ];
  if (fileIds.length === 0) return;

  const ownedFiles = await client.query(
    `SELECT f.file_id, f.path, f.mime_type, f.size_bytes
     FROM files f
     JOIN upload_intents ui ON ui.file_id = f.file_id
     WHERE f.file_id = ANY($1::uuid[]) AND ui.account_id = $2
       AND ui.status = 'consumed' AND ui.consumed_at IS NOT NULL
       AND f.deleted_at IS NULL
     FOR UPDATE OF f`,
    [fileIds, accountId]
  );
  const filesById = new Map(ownedFiles.rows.map((file) => [String(file.file_id), file]));
  const originals = content.originalFileIds.map((fileId) => filesById.get(fileId));
  const previews = content.previewFileIds.map((fileId) => filesById.get(fileId));
  const thumbnails = content.thumbnailFileIds.map((fileId) => filesById.get(fileId));
  if (originals.some((file) => !file) || previews.some((file) => !file)
    || thumbnails.some((file) => !file)) {
    const error = new Error('ASSET_FILE_NOT_OWNED');
    error.code = 'ASSET_FILE_NOT_OWNED';
    throw error;
  }

  const originalTypes = originals.map((file) => mediaTypeFromMime(file.mime_type));
  if (originalTypes.some((type) => !type)
    || (content.type !== 'template' && originalTypes.length > 0 && originalTypes[0] !== content.type)
    || previews.some((file) => !file.mime_type?.startsWith('image/'))
    || thumbnails.some((file) => !file.mime_type?.startsWith('image/'))) {
    const error = new Error('ASSET_FILE_TYPE_MISMATCH');
    error.code = 'ASSET_FILE_TYPE_MISMATCH';
    throw error;
  }

  let aggregateOriginalBytes = 0;
  for (let index = 0; index < originals.length; index += 1) {
    const sizeBytes = Number(originals[index].size_bytes);
    const limit = ORIGINAL_FILE_SIZE_LIMITS[originalTypes[index]];
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > limit) {
      const error = new Error('ASSET_ORIGINAL_FILE_TOO_LARGE');
      error.code = 'ASSET_ORIGINAL_FILE_TOO_LARGE';
      throw error;
    }
    aggregateOriginalBytes += sizeBytes;
  }
  if (!Number.isSafeInteger(aggregateOriginalBytes) || aggregateOriginalBytes > content.maxBundleBytes) {
    const error = new Error('ASSET_BUNDLE_TOO_LARGE');
    error.code = 'ASSET_BUNDLE_TOO_LARGE';
    throw error;
  }
  if (previews.some((file) => !Number.isSafeInteger(Number(file.size_bytes))
    || Number(file.size_bytes) <= 0 || Number(file.size_bytes) > 5 * 1024 * 1024)) {
    const error = new Error('ASSET_PREVIEW_INVALID');
    error.code = 'ASSET_PREVIEW_INVALID';
    throw error;
  }
  if (thumbnails.some((file) => !Number.isSafeInteger(Number(file.size_bytes))
    || Number(file.size_bytes) <= 0 || Number(file.size_bytes) > 5 * 1024 * 1024)) {
    const error = new Error('ASSET_THUMBNAIL_INVALID');
    error.code = 'ASSET_THUMBNAIL_INVALID';
    throw error;
  }
  if (originals.some((file) => !file.path.startsWith('asset-originals/'))
    || previews.some((file) => !file.path.startsWith('assets/'))
    || thumbnails.some((file) => !file.path.startsWith('assets/'))) {
    const error = new Error('ASSET_FILE_PLACEMENT_INVALID');
    error.code = 'ASSET_FILE_PLACEMENT_INVALID';
    throw error;
  }

  const alreadyUsed = await client.query(
    `SELECT 1
     FROM (
       SELECT m.media_asset_id
       FROM media_assets m
       WHERE m.deleted_at IS NULL AND m.thumbnail_file_id = ANY($1::uuid[])
       UNION ALL
       SELECT asset_thumbnail.media_asset_id
       FROM media_asset_thumbnails asset_thumbnail
       JOIN media_assets m ON m.media_asset_id = asset_thumbnail.media_asset_id
       WHERE m.deleted_at IS NULL AND asset_thumbnail.deleted_at IS NULL
         AND asset_thumbnail.file_id = ANY($1::uuid[])
       UNION ALL
       SELECT bundle.media_asset_id
       FROM media_asset_bundle_files bundle
       JOIN media_assets m ON m.media_asset_id = bundle.media_asset_id
       WHERE m.deleted_at IS NULL AND bundle.deleted_at IS NULL
         AND (bundle.file_id = ANY($1::uuid[]) OR bundle.preview_file_id = ANY($1::uuid[]))
     ) used_files
     LIMIT 1`,
    [fileIds]
  );
  if (alreadyUsed.rowCount) {
    const error = new Error('ASSET_FILE_ALREADY_USED');
    error.code = 'ASSET_FILE_ALREADY_USED';
    throw error;
  }
}

async function replaceAssetContent(client, assetId, accountId, ownedAsset, content) {
  if (ownedAsset.type !== content.type) {
    const error = new Error('ASSET_TYPE_IMMUTABLE');
    error.code = 'ASSET_TYPE_IMMUTABLE';
    throw error;
  }
  const purchases = await client.query(
    `SELECT 1 FROM user_market_assets
     WHERE market_asset_id = $1 AND status = 'active' AND deleted_at IS NULL
     LIMIT 1`,
    [assetId]
  );
  if (purchases.rowCount) {
    const error = new Error('ASSET_CONTENT_LOCKED_AFTER_PURCHASE');
    error.code = 'ASSET_CONTENT_LOCKED_AFTER_PURCHASE';
    throw error;
  }

  let retainedBundles = [];
  if (content.replaceBundleFiles && content.retainedBundleFileIds.length > 0) {
    const retained = await client.query(
      `SELECT bundle.media_asset_bundle_file_id, bundle.file_id, bundle.preview_file_id
       FROM media_asset_bundle_files bundle
       JOIN market_media_assets bundle_media
         ON bundle_media.media_asset_id = bundle.media_asset_id
       WHERE bundle_media.market_asset_id = $1
         AND bundle.deleted_at IS NULL
         AND bundle.media_asset_bundle_file_id = ANY($2::uuid[])
       FOR UPDATE OF bundle`,
      [assetId, content.retainedBundleFileIds]
    );
    const byId = new Map(retained.rows.map((item) => [String(item.media_asset_bundle_file_id), item]));
    retainedBundles = content.retainedBundleFileIds.map((itemId) => byId.get(itemId));
    if (retainedBundles.some((item) => !item)) {
      const error = new Error('ASSET_RETAINED_CONTENT_INVALID');
      error.code = 'ASSET_RETAINED_CONTENT_INVALID';
      throw error;
    }
  }
  let retainedThumbnails = [];
  if (content.replaceThumbnails && content.retainedThumbnailIds.length > 0) {
    const retained = await client.query(
      `SELECT thumbnail.media_asset_thumbnail_id, thumbnail.file_id
       FROM media_asset_thumbnails thumbnail
       JOIN market_media_assets thumbnail_media
         ON thumbnail_media.media_asset_id = thumbnail.media_asset_id
       WHERE thumbnail_media.market_asset_id = $1
         AND thumbnail.deleted_at IS NULL
         AND thumbnail.media_asset_thumbnail_id = ANY($2::uuid[])
       FOR UPDATE OF thumbnail`,
      [assetId, content.retainedThumbnailIds]
    );
    const byId = new Map(retained.rows.map((item) => [String(item.media_asset_thumbnail_id), item]));
    retainedThumbnails = content.retainedThumbnailIds.map((itemId) => byId.get(itemId));
    if (retainedThumbnails.some((item) => !item)) {
      const error = new Error('ASSET_RETAINED_CONTENT_INVALID');
      error.code = 'ASSET_RETAINED_CONTENT_INVALID';
      throw error;
    }
  }
  const finalOriginalFileIds = [
    ...retainedBundles.map((item) => item.file_id),
    ...content.originalFileIds,
  ];
  const finalPreviewFileIds = [
    ...retainedBundles.map((item) => item.preview_file_id),
    ...content.previewFileIds,
  ];
  const finalThumbnailFileIds = [
    ...retainedThumbnails.map((item) => item.file_id),
    ...content.thumbnailFileIds,
  ];

  await validateAssetReplacementUploads(client, accountId, content);
  if (content.replaceBundleFiles && finalOriginalFileIds.length > 0) {
    const finalFiles = await client.query(
      `SELECT file_id, mime_type, size_bytes
       FROM files
       WHERE file_id = ANY($1::uuid[]) AND deleted_at IS NULL`,
      [finalOriginalFileIds]
    );
    const byId = new Map(finalFiles.rows.map((file) => [String(file.file_id), file]));
    const orderedFiles = finalOriginalFileIds.map((fileId) => byId.get(String(fileId)));
    if (orderedFiles.some((file) => !file)) {
      const error = new Error('ASSET_RETAINED_CONTENT_INVALID');
      error.code = 'ASSET_RETAINED_CONTENT_INVALID';
      throw error;
    }
    const orderedTypes = orderedFiles.map((file) => mediaTypeFromMime(file.mime_type));
    if (orderedTypes.some((type) => !type)
      || (content.type !== 'template' && orderedTypes[0] !== content.type)) {
      const error = new Error('ASSET_FILE_TYPE_MISMATCH');
      error.code = 'ASSET_FILE_TYPE_MISMATCH';
      throw error;
    }
    let finalAggregateBytes = 0;
    for (let index = 0; index < orderedFiles.length; index += 1) {
      const sizeBytes = Number(orderedFiles[index].size_bytes);
      const fileLimit = ORIGINAL_FILE_SIZE_LIMITS[orderedTypes[index]];
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > fileLimit) {
        const error = new Error('ASSET_ORIGINAL_FILE_TOO_LARGE');
        error.code = 'ASSET_ORIGINAL_FILE_TOO_LARGE';
        throw error;
      }
      finalAggregateBytes += sizeBytes;
    }
    if (!Number.isSafeInteger(finalAggregateBytes) || finalAggregateBytes > content.maxBundleBytes) {
      const error = new Error('ASSET_BUNDLE_TOO_LARGE');
      error.code = 'ASSET_BUNDLE_TOO_LARGE';
      throw error;
    }
  }
  const counts = await client.query(
    `SELECT
       (SELECT COUNT(*)::int
        FROM market_media_assets bundle_media
        JOIN media_asset_bundle_files bundle
          ON bundle.media_asset_id = bundle_media.media_asset_id
        WHERE bundle_media.market_asset_id = $1 AND bundle.deleted_at IS NULL) AS bundle_count,
       (SELECT COUNT(*)::int
        FROM market_media_assets thumbnail_media
        JOIN media_asset_thumbnails thumbnail
          ON thumbnail.media_asset_id = thumbnail_media.media_asset_id
        WHERE thumbnail_media.market_asset_id = $1 AND thumbnail.deleted_at IS NULL) AS thumbnail_count,
       (SELECT COUNT(*)::int
        FROM market_media_assets project_link_media
        JOIN media_asset_project_links project_link
          ON project_link.media_asset_id = project_link_media.media_asset_id
        WHERE project_link_media.market_asset_id = $1 AND project_link.deleted_at IS NULL) AS project_link_count`,
    [assetId]
  );
  const finalBundleCount = content.replaceBundleFiles
    ? finalOriginalFileIds.length
    : Number(counts.rows[0].bundle_count);
  const finalThumbnailCount = content.replaceThumbnails
    ? finalThumbnailFileIds.length
    : Number(counts.rows[0].thumbnail_count);

  if (finalThumbnailCount < 1 || finalThumbnailCount > 8) {
    const error = new Error('ASSET_THUMBNAIL_INVALID');
    error.code = 'ASSET_THUMBNAIL_INVALID';
    throw error;
  }
  if (content.type !== 'template' && finalBundleCount < 1) {
    const error = new Error('ASSET_CONTENT_REQUIRED');
    error.code = 'ASSET_CONTENT_REQUIRED';
    throw error;
  }

  if (content.replaceBundleFiles) {
    await client.query(
      `DELETE FROM media_asset_bundle_files
       WHERE media_asset_id IN (
         SELECT media_asset_id FROM market_media_assets WHERE market_asset_id = $1
       )`,
      [assetId]
    );
    if (finalOriginalFileIds.length > 0) {
      await client.query(
        `INSERT INTO media_asset_bundle_files
           (media_asset_id, file_id, preview_file_id, position)
         VALUES ($1, $2, $3, 0)`,
        [ownedAsset.media_asset_id, finalOriginalFileIds[0], finalPreviewFileIds[0]]
      );
    }
  }
  if (content.replaceThumbnails) {
    await client.query(
      `DELETE FROM media_asset_thumbnails
       WHERE media_asset_id IN (
         SELECT media_asset_id FROM market_media_assets WHERE market_asset_id = $1
       )`,
      [assetId]
    );
    await client.query(
      `INSERT INTO media_asset_thumbnails (media_asset_id, file_id, position)
       SELECT $1, thumbnail.file_id, thumbnail.ordinality - 1
       FROM unnest($2::uuid[]) WITH ORDINALITY AS thumbnail(file_id, ordinality)`,
      [ownedAsset.media_asset_id, finalThumbnailFileIds]
    );
  }
  if (content.replaceProjectLinks) {
    await client.query(
      `DELETE FROM media_asset_project_links
       WHERE media_asset_id IN (
         SELECT media_asset_id FROM market_media_assets WHERE market_asset_id = $1
       )`,
      [assetId]
    );
    if (content.projectLinks.length > 0) {
      await client.query(
        `INSERT INTO media_asset_project_links
           (media_asset_id, label, provider, url, position)
         SELECT $1, link.label, link.provider, link.url, link.ordinality - 1
         FROM unnest($2::text[], $3::text[], $4::text[])
           WITH ORDINALITY AS link(label, provider, url, ordinality)`,
        [ownedAsset.media_asset_id,
          content.projectLinks.map((link) => link.label),
          content.projectLinks.map((link) => link.provider),
          content.projectLinks.map((link) => link.url)]
      );
    }
  }

  const primaryFiles = await client.query(
    `SELECT
       (SELECT file_id FROM media_asset_thumbnails
        WHERE media_asset_id = $1 AND deleted_at IS NULL
        ORDER BY position, media_asset_thumbnail_id LIMIT 1) AS thumbnail_file_id,
       (SELECT file_id FROM media_asset_bundle_files
        WHERE media_asset_id = $1 AND deleted_at IS NULL
        ORDER BY position, media_asset_bundle_file_id LIMIT 1) AS original_file_id,
       (SELECT preview_file_id FROM media_asset_bundle_files
        WHERE media_asset_id = $1 AND deleted_at IS NULL
        ORDER BY position, media_asset_bundle_file_id LIMIT 1) AS preview_file_id`,
    [ownedAsset.media_asset_id]
  );
  await client.query(
    `UPDATE media_assets
     SET thumbnail_file_id = $2::uuid,
         proxy_file_id = COALESCE($3::uuid, $2::uuid),
         original_file_id = COALESCE($4::uuid, $2::uuid),
         width = CASE WHEN $5::boolean THEN $6::integer ELSE width END,
         height = CASE WHEN $5::boolean THEN $7::integer ELSE height END,
         duration_seconds = CASE WHEN $5::boolean THEN $8::integer ELSE duration_seconds END
     WHERE media_asset_id = $1::uuid`,
    [ownedAsset.media_asset_id,
      primaryFiles.rows[0].thumbnail_file_id,
      primaryFiles.rows[0].preview_file_id,
      primaryFiles.rows[0].original_file_id,
      content.replaceBundleFiles,
      content.width,
      content.height,
      content.durationSeconds]
  );

  if (content.replaceBundleFiles) {
    const removedSecondary = await client.query(
      `DELETE FROM market_media_assets
       WHERE market_asset_id = $1::uuid AND media_asset_id <> $2::uuid
       RETURNING media_asset_id`,
      [assetId, ownedAsset.media_asset_id]
    );
    const removedIds = removedSecondary.rows.map((row) => row.media_asset_id);
    if (removedIds.length > 0) {
      await client.query(
        `UPDATE media_assets
         SET is_marketed = FALSE, deleted_at = CURRENT_TIMESTAMP
         WHERE media_asset_id = ANY($1::uuid[])`,
        [removedIds]
      );
    }
    await createSecondaryMediaAssets(client, {
      marketAssetId: assetId,
      primaryMediaAssetId: ownedAsset.media_asset_id,
      originalFileIds: finalOriginalFileIds,
      previewFileIds: finalPreviewFileIds,
    });
  }

  await client.query(
    `UPDATE media_assets
     SET thumbnail_file_id = $2::uuid
     WHERE media_asset_id IN (
       SELECT media_asset_id FROM market_media_assets WHERE market_asset_id = $3::uuid
     )
       AND media_asset_id <> $1::uuid
       AND deleted_at IS NULL`,
    [ownedAsset.media_asset_id, primaryFiles.rows[0].thumbnail_file_id, assetId]
  );
}
async function updateAssetRepository(assetId, accountId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owned = await client.query(
      `SELECT ma.market_asset_id, ma.status AS current_status, m.media_asset_id, m.type
       FROM market_assets ma
       JOIN market_media_assets mma ON mma.market_asset_id = ma.market_asset_id
       JOIN media_assets m ON m.media_asset_id = mma.media_asset_id
       JOIN users u ON u.user_id = m.owner_user_id
       WHERE ma.market_asset_id = $1 AND u.account_id = $2
         AND ma.deleted_at IS NULL AND m.deleted_at IS NULL
       ORDER BY
         CASE WHEN EXISTS (
           SELECT 1 FROM media_asset_bundle_files primary_bundle_marker
           WHERE primary_bundle_marker.media_asset_id = m.media_asset_id
             AND primary_bundle_marker.deleted_at IS NULL
         ) THEN 0 ELSE 1 END,
         CASE WHEN EXISTS (
           SELECT 1 FROM media_asset_thumbnails primary_thumbnail_marker
           WHERE primary_thumbnail_marker.media_asset_id = m.media_asset_id
             AND primary_thumbnail_marker.deleted_at IS NULL
         ) THEN 0 ELSE 1 END,
         m.created_at, m.media_asset_id
       LIMIT 1
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
        const error = new Error(eligibility.code);
        error.code = eligibility.code;
        error.eligibility = eligibility;
        throw error;
      }
    }
    if (data.contentUpdate) {
      await replaceAssetContent(client, assetId, accountId, owned.rows[0], data.contentUpdate);
    }
    await client.query(
      `UPDATE market_assets
       SET name = $2, description = $3, price_credits = $4,
           status = $5, updated_at = CURRENT_TIMESTAMP
       WHERE market_asset_id = $1 AND deleted_at IS NULL`,
      [assetId, data.name, data.description, data.priceCredits, data.status]
    );
    await client.query(
      `UPDATE media_assets SET name = $2
       WHERE media_asset_id IN (
         SELECT media_asset_id FROM market_media_assets WHERE market_asset_id = $1
       ) AND deleted_at IS NULL`,
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
       JOIN market_media_assets mma ON mma.market_asset_id = ma.market_asset_id
       JOIN media_assets m ON m.media_asset_id = mma.media_asset_id
       JOIN users u ON u.user_id = m.owner_user_id
       WHERE ma.market_asset_id = $1 AND u.account_id = $2
         AND ma.deleted_at IS NULL AND m.deleted_at IS NULL
       FOR UPDATE OF ma`,
      [assetId, accountId]
    );
    if (!owned.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }
    const purchases = await client.query(
      `SELECT 1
       FROM user_market_assets owned_asset
       WHERE owned_asset.market_asset_id = $1
         AND owned_asset.status = 'active'
         AND owned_asset.deleted_at IS NULL
       LIMIT 1`,
      [assetId]
    );
    if (purchases.rowCount) {
      const error = new Error('ASSET_HAS_PURCHASES');
      error.code = 'ASSET_HAS_PURCHASES';
      throw error;
    }
    await client.query(
      `UPDATE market_assets SET deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP WHERE market_asset_id = $1`,
      [assetId]
    );
    await client.query(
      `UPDATE media_assets SET deleted_at = CURRENT_TIMESTAMP, is_marketed = FALSE
       WHERE media_asset_id IN (
         SELECT media_asset_id FROM market_media_assets WHERE market_asset_id = $1
       )`,
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
         FROM user_market_assets ownership
         JOIN users buyer ON buyer.user_id = ownership.user_id
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
         FROM user_market_assets ownership
         JOIN users buyer ON buyer.user_id = ownership.user_id
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
           FROM user_market_assets ownership
           JOIN users buyer ON buyer.user_id = ownership.user_id
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

module.exports = {
  getAssetPostingEligibilityRepository,
  listAssetsRepository,
  getAssetRepository,
  createAssetRepository,
  updateAssetRepository,
  deleteAssetRepository,
  getAssetDownloadRepository,
  getAssetProjectLinkAccessRepository,
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
};
