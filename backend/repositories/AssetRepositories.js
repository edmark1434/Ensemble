const { pool } = require('../lib/Database');
const {
  MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT,
  calculateAssetTransactionFee,
} = require('../lib/AssetMarketplaceConstants');

const ORIGINAL_FILE_SIZE_LIMITS = {
  image: 25 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
};

function mediaTypeFromMime(mimeType) {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType?.startsWith('audio/')) return 'audio';
  return null;
}

const ASSET_SELECT = `
  SELECT ma.market_asset_id, ma.name, ma.description, ma.price_credits, ma.status,
         ma.created_at, ma.updated_at,
         media.media_asset_id, media.type, media.width, media.height,
         media.duration_seconds, media.proxy_path,
         media.thumbnail_path, media.mime_type, media.size_bytes,
         media.bundle_files, media.bundle_file_count,
         owner.display_name AS creator_name, owner.handle AS creator_handle,
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
           primary_preview.path AS proxy_path,
           thumbnail.path AS thumbnail_path, primary_original.mime_type,
           primary_original.size_bytes,
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
             FROM media_asset_bundle_files bundle
             JOIN files bundle_file ON bundle_file.file_id = bundle.file_id
             JOIN files bundle_preview ON bundle_preview.file_id = bundle.preview_file_id
             WHERE bundle.media_asset_id = m.media_asset_id
               AND bundle.deleted_at IS NULL
               AND bundle_file.deleted_at IS NULL
               AND bundle_preview.deleted_at IS NULL
           ), '[]'::json) AS bundle_files,
           (SELECT COUNT(*)::int
            FROM media_asset_bundle_files bundle_count
            JOIN files counted_file ON counted_file.file_id = bundle_count.file_id
            JOIN files counted_preview ON counted_preview.file_id = bundle_count.preview_file_id
            WHERE bundle_count.media_asset_id = m.media_asset_id
              AND bundle_count.deleted_at IS NULL
              AND counted_file.deleted_at IS NULL
              AND counted_preview.deleted_at IS NULL) AS bundle_file_count,
           m.owner_user_id
    FROM market_media_assets mma
    JOIN media_assets m ON m.media_asset_id = mma.media_asset_id
    JOIN media_asset_bundle_files primary_bundle
      ON primary_bundle.media_asset_id = m.media_asset_id
     AND primary_bundle.deleted_at IS NULL
    JOIN files primary_original ON primary_original.file_id = primary_bundle.file_id
    JOIN files primary_preview ON primary_preview.file_id = primary_bundle.preview_file_id
    JOIN files thumbnail ON thumbnail.file_id = m.thumbnail_file_id
    WHERE mma.market_asset_id = ma.market_asset_id
      AND m.deleted_at IS NULL
      AND primary_original.deleted_at IS NULL
      AND primary_preview.deleted_at IS NULL
      AND thumbnail.deleted_at IS NULL
    ORDER BY m.created_at, m.media_asset_id, primary_bundle.position,
             primary_bundle.media_asset_bundle_file_id
    LIMIT 1
  ) media ON TRUE
  JOIN users owner_user ON owner_user.user_id = media.owner_user_id
  JOIN accounts owner ON owner.account_id = owner_user.account_id
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

async function listAssetsRepository({ accountId, search, type, view, limit, offset }) {
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
     ORDER BY ma.created_at DESC, ma.market_asset_id DESC
     LIMIT $4 OFFSET $5`,
    [accountId, search, type, limit, offset]
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
    const fileIds = [...data.originalFileIds, ...data.previewFileIds, data.thumbnailFileId];
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
    const proxy = previews[0];
    const thumbnail = filesById.get(data.thumbnailFileId);
    if (originals.some((file) => !file) || previews.some((file) => !file) || !thumbnail) {
      const error = new Error('ASSET_FILE_NOT_OWNED');
      error.code = 'ASSET_FILE_NOT_OWNED';
      throw error;
    }
    const primaryOriginal = originals[0];
    const originalTypes = originals.map((file) => mediaTypeFromMime(file.mime_type));
    if (originalTypes.some((type) => !type)
      || previews.some((file) => !file.mime_type?.startsWith('image/'))
      || originalTypes[0] !== data.type
      || !thumbnail.mime_type?.startsWith('image/')) {
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
    if (!Number.isSafeInteger(Number(thumbnail.size_bytes))
      || Number(thumbnail.size_bytes) <= 0
      || Number(thumbnail.size_bytes) > 5 * 1024 * 1024) {
      const error = new Error('ASSET_THUMBNAIL_INVALID');
      error.code = 'ASSET_THUMBNAIL_INVALID';
      throw error;
    }
    if (originals.some((file) => !file.path.startsWith('asset-originals/'))
      || previews.some((file) => !file.path.startsWith('assets/'))
      || !thumbnail.path.startsWith('assets/')) {
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

    const media = await client.query(
      `INSERT INTO media_assets
         (name, type, width, height, duration_seconds, is_marketed, owner_user_id,
          proxy_file_id, thumbnail_file_id)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8)
       RETURNING media_asset_id`,
      [data.name, data.type, data.width, data.height, data.durationSeconds,
        primaryOriginal.user_id, data.previewFileIds[0], data.thumbnailFileId]
    );
    await client.query(
      `INSERT INTO media_asset_bundle_files
         (media_asset_id, file_id, preview_file_id, position)
       SELECT $1, original.file_id, preview.file_id, original.ordinality - 1
       FROM unnest($2::uuid[]) WITH ORDINALITY AS original(file_id, ordinality)
       JOIN unnest($3::uuid[]) WITH ORDINALITY AS preview(file_id, ordinality)
         ON preview.ordinality = original.ordinality`,
      [media.rows[0].media_asset_id, data.originalFileIds, data.previewFileIds]
    );
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

async function updateAssetRepository(assetId, accountId, data) {
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
      return null;
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
};
