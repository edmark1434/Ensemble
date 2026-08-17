const {
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
} = require('../repositories/AssetRepositories');
const {
  generateProtectedAssetDownloadUrl,
  generateProtectedAssetPreviewUrl,
} = require('./FileServices');
const { getIo } = require('../lib/WebSocket');
const {
  MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT,
  calculateAssetTransactionFee,
} = require('../lib/AssetMarketplaceConstants');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSET_TYPES = new Set(['image', 'video', 'audio']);
const ASSET_STATUSES = new Set(['draft', 'published']);
const ASSET_VIEWS = new Set(['discover', 'mine', 'purchased', 'saved']);
const MAX_BUNDLE_FILES = 20;
const MAX_BUNDLE_BYTES = 500 * 1024 * 1024;

class AssetError extends Error {
  constructor(message, statusCode = 400, code = 'ASSET_ERROR') {
    super(message);
    this.name = 'AssetError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function requireUuid(value, label = 'Asset ID') {
  if (!UUID_PATTERN.test(String(value || ''))) {
    throw new AssetError(`${label} is invalid.`, 400, 'INVALID_ID');
  }
  return value;
}

function cleanText(value, label, maxLength, { required = true } = {}) {
  if (typeof value !== 'string') {
    if (!required && value == null) return '';
    throw new AssetError(`${label} is required.`, 400, 'VALIDATION_ERROR');
  }
  const result = value.trim();
  if (required && !result) throw new AssetError(`${label} is required.`, 400, 'VALIDATION_ERROR');
  if (result.length > maxLength) {
    throw new AssetError(`${label} must not exceed ${maxLength} characters.`, 400, 'VALIDATION_ERROR');
  }
  return result;
}

function optionalPositiveInteger(value, label, max) {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0 || number > max) {
    throw new AssetError(`${label} is invalid.`, 400, 'VALIDATION_ERROR');
  }
  return number;
}

function normalizeTags(value, { creating = false } = {}) {
  if (value == null) return creating ? [] : null;
  if (!Array.isArray(value)) {
    throw new AssetError('Tags must be provided as a list.', 400, 'VALIDATION_ERROR');
  }
  const normalized = [];
  const seen = new Set();
  for (const rawTag of value) {
    if (typeof rawTag !== 'string') {
      throw new AssetError('Each tag must be text.', 400, 'VALIDATION_ERROR');
    }
    const tag = rawTag.trim().replace(/^#+/, '').trim().replace(/\s+/g, ' ');
    if (!tag) throw new AssetError('Tags cannot be empty.', 400, 'VALIDATION_ERROR');
    if (tag.length > 50) {
      throw new AssetError('Each tag must not exceed 50 characters.', 400, 'VALIDATION_ERROR');
    }
    const key = tag.toLocaleLowerCase('en-US');
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(tag);
  }
  if (normalized.length > 10) {
    throw new AssetError('An asset can have at most 10 tags.', 400, 'VALIDATION_ERROR');
  }
  return normalized;
}

function validateAssetPayload(payload, { creating = false } = {}) {
  const name = cleanText(payload?.name, 'Asset title', 50);
  const description = cleanText(payload?.description, 'Description', 5000);
  const priceCredits = Number(payload?.priceCredits);
  if (!Number.isInteger(priceCredits) || priceCredits < 0 || priceCredits > 100000000) {
    throw new AssetError('Price must be a whole number from 0 to 100,000,000 credits.', 400, 'VALIDATION_ERROR');
  }
  if (!ASSET_STATUSES.has(payload?.status)) {
    throw new AssetError('Status must be draft or published.', 400, 'VALIDATION_ERROR');
  }

  const result = {
    name,
    description,
    priceCredits,
    status: payload.status,
    tags: normalizeTags(payload?.tags, { creating }),
  };
  if (!creating) return result;

  if (!Array.isArray(payload?.originalFileIds)
    || payload.originalFileIds.length < 1
    || payload.originalFileIds.length > MAX_BUNDLE_FILES) {
    throw new AssetError(`Choose between 1 and ${MAX_BUNDLE_FILES} original files.`, 400, 'VALIDATION_ERROR');
  }
  const originalFileIds = payload.originalFileIds.map((fileId, index) =>
    requireUuid(fileId, `Original file ID ${index + 1}`));
  if (!Array.isArray(payload?.previewFileIds)
    || payload.previewFileIds.length !== originalFileIds.length) {
    throw new AssetError('Each original file must have one derivative preview.', 400, 'VALIDATION_ERROR');
  }
  const previewFileIds = payload.previewFileIds.map((fileId, index) =>
    requireUuid(fileId, `Preview file ID ${index + 1}`));
  requireUuid(payload?.thumbnailFileId, 'Thumbnail file ID');
  if (new Set([...originalFileIds, ...previewFileIds, payload.thumbnailFileId]).size
    !== originalFileIds.length + previewFileIds.length + 1) {
    throw new AssetError('Every original, preview, and thumbnail must be a separate upload.', 400, 'VALIDATION_ERROR');
  }
  if (!ASSET_TYPES.has(payload?.type)) {
    throw new AssetError('Asset type must be image, video, or audio.', 400, 'VALIDATION_ERROR');
  }
  return {
    ...result,
    originalFileIds,
    previewFileIds,
    thumbnailFileId: payload.thumbnailFileId,
    type: payload.type,
    width: payload.type === 'audio' ? null : optionalPositiveInteger(payload.width, 'Width', 100000),
    height: payload.type === 'audio' ? null : optionalPositiveInteger(payload.height, 'Height', 100000),
    durationSeconds: payload.type === 'image'
      ? null
      : optionalPositiveInteger(payload.durationSeconds, 'Duration', 86400),
    maxBundleBytes: MAX_BUNDLE_BYTES,
  };
}

function validateReviewPayload(payload) {
  const rating = Number(payload?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AssetError('Rating must be a whole number from 1 to 5.', 400, 'VALIDATION_ERROR');
  }
  return {
    rating,
    review: cleanText(payload?.review, 'Review', 2000),
  };
}

function publicAsset(asset) {
  if (!asset) return asset;
  const { owner_account_id: _ownerAccountId, total_count: _totalCount, ...safeAsset } = asset;
  const priceCredits = Number(safeAsset.price_credits);
  const transactionFeeCredits = calculateAssetTransactionFee(priceCredits);
  return {
    ...safeAsset,
    like_count: Number(safeAsset.like_count || 0),
    save_count: Number(safeAsset.save_count || 0),
    review_count: Number(safeAsset.review_count || 0),
    average_rating: Number(safeAsset.average_rating || 0),
    transaction_fee_percent: MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT,
    transaction_fee_credits: transactionFeeCredits,
    owner_net_credits: priceCredits - transactionFeeCredits,
  };
}

async function listAssetsServices(accountId, query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(48, Math.max(1, Number.parseInt(query.pageSize, 10) || 12));
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '';
  const type = !query.type || query.type === 'all' ? '' : String(query.type);
  if (type && !ASSET_TYPES.has(type)) {
    throw new AssetError('Unsupported asset type filter.', 400, 'VALIDATION_ERROR');
  }
  const view = query.view
    ? String(query.view)
    : String(query.mine) === 'true'
      ? 'mine'
      : 'discover';
  if (!ASSET_VIEWS.has(view)) {
    throw new AssetError('Unsupported asset view.', 400, 'VALIDATION_ERROR');
  }
  const rows = await listAssetsRepository({
    accountId,
    search,
    type,
    view,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const total = rows[0]?.total_count || 0;
  return {
    assets: rows.map(publicAsset),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

async function getAssetServices(assetId, accountId) {
  requireUuid(assetId);
  const asset = await getAssetRepository(assetId, accountId);
  if (!asset) throw new AssetError('Asset not found.', 404, 'ASSET_NOT_FOUND');
  return publicAsset(asset);
}

async function createAssetServices(accountId, payload) {
  const data = validateAssetPayload(payload, { creating: true });
  try {
    const assetId = await createAssetRepository(accountId, data);
    return getAssetServices(assetId, accountId);
  } catch (error) {
    if (error.code === 'ASSET_FILE_NOT_OWNED') {
      throw new AssetError('The uploaded file is unavailable or is not owned by this account.', 400, error.code);
    }
    if (error.code === 'ASSET_FILE_ALREADY_USED') {
      throw new AssetError('This upload is already attached to an asset.', 409, error.code);
    }
    if (error.code === 'ASSET_FILE_TYPE_MISMATCH') {
      throw new AssetError('The selected asset type does not match the uploaded file.', 400, error.code);
    }
    if (error.code === 'ASSET_FILE_PLACEMENT_INVALID') {
      throw new AssetError('The original and preview files were uploaded to invalid storage locations.', 400, error.code);
    }
    if (error.code === 'ASSET_THUMBNAIL_INVALID') {
      throw new AssetError('The thumbnail must be a valid image no larger than 5MB.', 400, error.code);
    }
    if (error.code === 'ASSET_PREVIEW_INVALID') {
      throw new AssetError('Every asset preview must be a valid image no larger than 5MB.', 400, error.code);
    }
    if (error.code === 'ASSET_ORIGINAL_FILE_TOO_LARGE') {
      throw new AssetError('One or more original files exceeds its permitted size.', 400, error.code);
    }
    if (error.code === 'ASSET_BUNDLE_TOO_LARGE') {
      throw new AssetError('The combined original files must not exceed 500MB.', 400, error.code);
    }
    throw error;
  }
}

async function getAssetDownloadServices(assetId, accountId, bundleFileId = null) {
  requireUuid(assetId);
  if (bundleFileId) requireUuid(bundleFileId, 'Bundle file ID');
  const download = await getAssetDownloadRepository(assetId, accountId, bundleFileId);
  if (!download) throw new AssetError('Asset file not found.', 404, 'ASSET_FILE_NOT_FOUND');
  if (!download.is_owner && !download.is_purchased) {
    throw new AssetError('Purchase this asset before downloading the original file.', 403, 'ASSET_PURCHASE_REQUIRED');
  }
  return {
    downloadUrl: await generateProtectedAssetDownloadUrl(download.path, download.name, download.mime_type),
    expiresIn: 60,
  };
}

async function getAssetOriginalPreviewServices(assetId, accountId, bundleFileId = null) {
  requireUuid(assetId);
  if (bundleFileId) requireUuid(bundleFileId, 'Bundle file ID');
  const preview = await getAssetDownloadRepository(assetId, accountId, bundleFileId);
  if (!preview) throw new AssetError('Asset file not found.', 404, 'ASSET_FILE_NOT_FOUND');
  if (!preview.is_owner && !preview.is_purchased) {
    throw new AssetError('Purchase this asset before viewing the original file.', 403, 'ASSET_PURCHASE_REQUIRED');
  }
  return {
    previewUrl: await generateProtectedAssetPreviewUrl(preview.path, preview.name, preview.mime_type),
    mimeType: preview.mime_type,
    expiresIn: 60,
  };
}

function emitPurchaseEvents(result) {
  if (result.alreadyPurchased) return;
  try {
    const io = getIo();
    for (const notification of result.notifications) {
      io.to(String(notification.account_id)).emit('notification', notification);
    }
    io.to(String(result.buyerAccountId)).emit('walletBalanceUpdated', {
      balance_credits: result.buyerBalanceCredits,
      transaction_id: result.transactionId,
      asset_id: result.transaction.reference_id,
    });
    io.to(String(result.creatorAccountId)).emit('walletBalanceUpdated', {
      balance_credits: result.creatorBalanceCredits,
      transaction_id: result.transactionId,
      asset_id: result.transaction.reference_id,
    });
  } catch (error) {
    console.error('Unable to emit committed asset purchase events:', error.message);
  }
}

async function purchaseAssetServices(assetId, accountId) {
  requireUuid(assetId);
  try {
    const result = await purchaseAssetRepository(assetId, accountId);
    const asset = await getAssetServices(assetId, accountId);
    emitPurchaseEvents(result);
    return {
      asset,
      transaction: result.transaction || null,
      alreadyPurchased: result.alreadyPurchased,
      balanceCredits: result.buyerBalanceCredits,
    };
  } catch (error) {
    if (error.code === 'ASSET_NOT_FOUND') {
      throw new AssetError('Asset not found.', 404, error.code);
    }
    if (error.code === 'ASSET_NOT_PUBLISHED') {
      throw new AssetError('Only published assets can be purchased.', 409, error.code);
    }
    if (error.code === 'ASSET_SELF_PURCHASE') {
      throw new AssetError('You already own this asset as its creator.', 409, error.code);
    }
    if (error.code === 'ASSET_WALLET_NOT_FOUND') {
      throw new AssetError('An account wallet is unavailable for this purchase.', 409, error.code);
    }
    if (error.code === 'ASSET_PLATFORM_WALLET_NOT_FOUND') {
      throw new AssetError('The platform fee wallet is unavailable for this purchase.', 409, error.code);
    }
    if (error.code === 'ASSET_WALLET_INACTIVE') {
      throw new AssetError('The buyer or creator wallet is not active.', 409, error.code);
    }
    if (error.code === 'ASSET_INSUFFICIENT_BALANCE') {
      throw new AssetError('Your wallet does not have enough credits for this purchase.', 409, error.code);
    }
    if (error.code === 'ASSET_PRICE_INVALID') {
      throw new AssetError('This asset has an invalid price.', 409, error.code);
    }
    throw error;
  }
}

async function updateAssetServices(assetId, accountId, payload) {
  requireUuid(assetId);
  const data = validateAssetPayload(payload);
  const updated = await updateAssetRepository(assetId, accountId, data);
  if (!updated) throw new AssetError('Asset not found or you cannot edit it.', 404, 'ASSET_NOT_FOUND');
  return getAssetServices(assetId, accountId);
}

async function deleteAssetServices(assetId, accountId) {
  requireUuid(assetId);
  try {
    if (!await deleteAssetRepository(assetId, accountId)) {
      throw new AssetError('Asset not found or you cannot delete it.', 404, 'ASSET_NOT_FOUND');
    }
  } catch (error) {
    if (error.code === 'ASSET_HAS_PURCHASES') {
      throw new AssetError(
        'This asset has active purchases and cannot be deleted. Unpublish it instead.',
        409,
        error.code
      );
    }
    throw error;
  }
}

async function listCommentsServices(assetId, accountId) {
  await getAssetServices(assetId, accountId);
  return listCommentsRepository(assetId, accountId);
}

async function createCommentServices(assetId, accountId, payload) {
  await getAssetServices(assetId, accountId);
  const comment = cleanText(payload?.comment, 'Comment', 2000);
  return createCommentRepository(assetId, accountId, comment);
}

async function updateCommentServices(assetId, commentId, accountId, payload) {
  requireUuid(assetId);
  requireUuid(commentId, 'Comment ID');
  await getAssetServices(assetId, accountId);
  const comment = cleanText(payload?.comment, 'Comment', 2000);
  const updated = await updateCommentRepository(assetId, commentId, accountId, comment);
  if (!updated) throw new AssetError('Comment not found or you cannot edit it.', 404, 'COMMENT_NOT_FOUND');
  return updated;
}

async function deleteCommentServices(assetId, commentId, accountId) {
  requireUuid(assetId);
  requireUuid(commentId, 'Comment ID');
  await getAssetServices(assetId, accountId);
  if (!await deleteCommentRepository(assetId, commentId, accountId)) {
    throw new AssetError('Comment not found or you cannot delete it.', 404, 'COMMENT_NOT_FOUND');
  }
}

async function createReplyServices(assetId, commentId, accountId, payload) {
  requireUuid(assetId);
  requireUuid(commentId, 'Comment ID');
  await getAssetServices(assetId, accountId);
  const reply = cleanText(payload?.reply, 'Reply', 2000);
  const created = await createReplyRepository(assetId, commentId, accountId, reply);
  if (!created) throw new AssetError('Comment not found.', 404, 'COMMENT_NOT_FOUND');
  return created;
}

async function updateReplyServices(assetId, commentId, replyId, accountId, payload) {
  requireUuid(assetId);
  requireUuid(commentId, 'Comment ID');
  requireUuid(replyId, 'Reply ID');
  await getAssetServices(assetId, accountId);
  const reply = cleanText(payload?.reply, 'Reply', 2000);
  const updated = await updateReplyRepository(assetId, commentId, replyId, accountId, reply);
  if (!updated) throw new AssetError('Reply not found or you cannot edit it.', 404, 'REPLY_NOT_FOUND');
  return updated;
}

async function deleteReplyServices(assetId, commentId, replyId, accountId) {
  requireUuid(assetId);
  requireUuid(commentId, 'Comment ID');
  requireUuid(replyId, 'Reply ID');
  await getAssetServices(assetId, accountId);
  if (!await deleteReplyRepository(assetId, commentId, replyId, accountId)) {
    throw new AssetError('Reply not found or you cannot delete it.', 404, 'REPLY_NOT_FOUND');
  }
}

async function setAssetLikeServices(assetId, accountId, liked) {
  requireUuid(assetId);
  await getAssetServices(assetId, accountId);
  return setAssetLikeRepository(assetId, accountId, Boolean(liked));
}

async function setAssetSaveServices(assetId, accountId, saved) {
  requireUuid(assetId);
  await getAssetServices(assetId, accountId);
  return setAssetSaveRepository(assetId, accountId, Boolean(saved));
}

async function listAssetReviewsServices(assetId, accountId) {
  requireUuid(assetId);
  await getAssetServices(assetId, accountId);
  return listAssetReviewsRepository(assetId, accountId);
}

async function createAssetReviewServices(assetId, accountId, payload) {
  requireUuid(assetId);
  const asset = await getAssetServices(assetId, accountId);
  if (!asset.can_review) {
    throw new AssetError('Only users who purchased this asset can review it.', 403, 'ASSET_PURCHASE_REQUIRED');
  }
  const { rating, review } = validateReviewPayload(payload);
  const created = await createAssetReviewRepository(assetId, accountId, rating, review);
  if (!created) {
    throw new AssetError('You already reviewed this asset.', 409, 'ASSET_REVIEW_EXISTS');
  }
  return created;
}

async function updateAssetReviewServices(assetId, reviewId, accountId, payload) {
  requireUuid(assetId);
  requireUuid(reviewId, 'Review ID');
  const asset = await getAssetServices(assetId, accountId);
  if (!asset.can_review) {
    throw new AssetError('Only an active purchaser can update this review.', 403, 'ASSET_PURCHASE_REQUIRED');
  }
  const { rating, review } = validateReviewPayload(payload);
  const updated = await updateAssetReviewRepository(assetId, reviewId, accountId, rating, review);
  if (!updated) {
    throw new AssetError('Review not found or you cannot edit it.', 404, 'ASSET_REVIEW_NOT_FOUND');
  }
  return updated;
}

async function deleteAssetReviewServices(assetId, reviewId, accountId) {
  requireUuid(assetId);
  requireUuid(reviewId, 'Review ID');
  await getAssetServices(assetId, accountId);
  if (!await deleteAssetReviewRepository(assetId, reviewId, accountId)) {
    throw new AssetError('Review not found or you cannot delete it.', 404, 'ASSET_REVIEW_NOT_FOUND');
  }
}

module.exports = {
  AssetError,
  listAssetsServices,
  getAssetServices,
  createAssetServices,
  updateAssetServices,
  deleteAssetServices,
  getAssetDownloadServices,
  getAssetOriginalPreviewServices,
  purchaseAssetServices,
  listCommentsServices,
  createCommentServices,
  updateCommentServices,
  deleteCommentServices,
  createReplyServices,
  updateReplyServices,
  deleteReplyServices,
  setAssetLikeServices,
  setAssetSaveServices,
  listAssetReviewsServices,
  createAssetReviewServices,
  updateAssetReviewServices,
  deleteAssetReviewServices,
};
