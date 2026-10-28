const {
  getAssetPostingEligibilityRepository,
  listAssetsRepository,
  getAssetRepository,
  createAssetRepository,
  updateAssetRepository,
  deleteAssetRepository,
  getAssetDownloadRepository,
  purchaseAssetRepository,
  listAssetLicensesRepository,
  assignAssetLicenseRepository,
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
  DEFAULT_MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT,
  calculateAssetTransactionFee,
} = require('../lib/AssetMarketplaceConstants');
const { getMarketplaceTransactionFeePercent } = require('../lib/PlatformFeeSettings');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSET_TYPES = new Set(['image', 'video', 'audio', 'template']);
const ASSET_STATUSES = new Set(['draft', 'published']);
const ASSET_VIEWS = new Set(['discover', 'mine', 'purchased', 'saved', 'liked']);
const MAX_CONTENT_FILES = 20;
const MAX_UPLOAD_FILE_BYTES = 1024 * 1024 * 1024;
const MAX_SHOWCASE_TOTAL_BYTES = 200 * 1024 * 1024;
const MAX_AUDIO_SHOWCASE_TOTAL_BYTES = 100 * 1024 * 1024;
const MAX_SHOWCASE_IMAGES = 6;
const MAX_AUDIO_SHOWCASE_IMAGES = 3;

function maxShowcaseImages(type) {
  return type === 'audio' ? MAX_AUDIO_SHOWCASE_IMAGES : MAX_SHOWCASE_IMAGES;
}

function maxShowcaseTotalBytes(type) {
  return type === 'audio' ? MAX_AUDIO_SHOWCASE_TOTAL_BYTES : MAX_SHOWCASE_TOTAL_BYTES;
}

class AssetError extends Error {
  constructor(message, statusCode = 400, code = 'ASSET_ERROR') {
    super(message);
    this.name = 'AssetError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function requireUuid(value, label = 'Asset ID') {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
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

function uuidList(value, label, max) {
  const input = value == null ? [] : value;
  if (!Array.isArray(input) || input.length > max) {
    throw new AssetError(`${label} list is invalid.`, 400, 'VALIDATION_ERROR');
  }
  return input.map((itemId, index) => requireUuid(itemId, `${label} ID ${index + 1}`));
}

function requireSnapshotId(value) {
  const text = String(value ?? '');
  if (!/^[1-9]\d{0,17}$/.test(text)) {
    throw new AssetError('A template needs a valid project snapshot.', 400, 'VALIDATION_ERROR');
  }
  return text;
}

function assertDistinct(ids, message) {
  const present = ids.filter((id) => id != null);
  if (new Set(present).size !== present.length) {
    throw new AssetError(message, 400, 'VALIDATION_ERROR');
  }
}

function normalizeShowcaseOrder(value, expectedKeys) {
  if (value == null) return expectedKeys;
  if (!Array.isArray(value) || value.length !== expectedKeys.length
    || value.some((key) => typeof key !== 'string')
    || new Set(value).size !== value.length) {
    throw new AssetError('Showcase image order is invalid.', 400, 'VALIDATION_ERROR');
  }
  const expected = new Set(expectedKeys);
  if (value.some((key) => !expected.has(key))) {
    throw new AssetError('Showcase image order is invalid.', 400, 'VALIDATION_ERROR');
  }
  return value;
}

function validateAssetPayload(payload, { creating = false } = {}) {
  const name = cleanText(payload?.name, 'Asset title', 50);
  const description = cleanText(payload?.description, 'Description', 5000);
  const priceCredits = Number(payload?.priceCredits);
  if (!Number.isInteger(priceCredits) || priceCredits < 0 || priceCredits > 100000000) {
    throw new AssetError('Price must be a whole number from 0 to 100,000,000 credits.', 400, 'VALIDATION_ERROR');
  }
  const status = payload?.status || 'published';
  if (!ASSET_STATUSES.has(status)) {
    throw new AssetError('Status must be draft or published.', 400, 'VALIDATION_ERROR');
  }

  const result = {
    name,
    description,
    priceCredits,
    status,
    tags: normalizeTags(payload?.tags, { creating }),
  };
  if (!creating && payload?.contentUpdate == null) return result;

  if (!creating) {
    const content = payload.contentUpdate;
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      throw new AssetError('Content update is invalid.', 400, 'VALIDATION_ERROR');
    }
    if (!ASSET_TYPES.has(content.type)) {
      throw new AssetError('Asset type must be image, video, audio, or template.', 400, 'VALIDATION_ERROR');
    }
    const isTemplate = content.type === 'template';
    const replaceMedia = content.replaceMedia === true;
    const replaceThumbnails = content.replaceThumbnails === true;
    const replaceYdoc = content.replaceYdoc === true;
    if (!replaceMedia && !replaceThumbnails && !replaceYdoc) {
      throw new AssetError('Choose asset content to update.', 400, 'VALIDATION_ERROR');
    }
    if (isTemplate && replaceMedia) {
      throw new AssetError('Templates do not have media files.', 400, 'VALIDATION_ERROR');
    }
    if (!isTemplate && replaceYdoc) {
      throw new AssetError('Only templates have a project snapshot.', 400, 'VALIDATION_ERROR');
    }

    const retainedMediaAssetIds = replaceMedia
      ? uuidList(content.retainedMediaAssetIds, 'Retained media asset', MAX_CONTENT_FILES) : [];
    const originalFileIds = replaceMedia
      ? uuidList(content.originalFileIds, 'Replacement asset file', MAX_CONTENT_FILES) : [];
    if (retainedMediaAssetIds.length + originalFileIds.length > MAX_CONTENT_FILES) {
      throw new AssetError(`Choose no more than ${MAX_CONTENT_FILES} files.`, 400, 'VALIDATION_ERROR');
    }
    const retainedThumbnailIds = replaceThumbnails
      ? uuidList(content.retainedThumbnailIds, 'Retained showcase image', MAX_SHOWCASE_IMAGES) : [];
    const thumbnailFileIds = replaceThumbnails
      ? uuidList(content.thumbnailFileIds, 'Replacement showcase image', MAX_SHOWCASE_IMAGES) : [];
    const showcaseMediaAssetIds = replaceThumbnails
      ? uuidList(content.showcaseMediaAssetIds, 'Showcase asset file', MAX_CONTENT_FILES) : [];
    const showcaseOriginalFileIds = replaceThumbnails
      ? uuidList(content.showcaseOriginalFileIds, 'Showcase asset file', MAX_CONTENT_FILES) : [];
    assertDistinct([...retainedThumbnailIds, ...showcaseMediaAssetIds, ...showcaseOriginalFileIds],
      'Showcase images cannot contain duplicate media assets.');
    const expectedShowcaseOrder = [
      ...retainedThumbnailIds.map((id) => `retained:${id}`),
      ...showcaseMediaAssetIds.map((id) => `media:${id}`),
      ...showcaseOriginalFileIds.map((id) => `assetFile:${id}`),
      ...thumbnailFileIds.map((id) => `upload:${id}`),
    ];
    const showcaseOrder = replaceThumbnails
      ? normalizeShowcaseOrder(content.showcaseOrder, expectedShowcaseOrder) : [];
    if (retainedThumbnailIds.length + thumbnailFileIds.length + showcaseMediaAssetIds.length
      + showcaseOriginalFileIds.length > maxShowcaseImages(content.type)) {
      throw new AssetError(`Choose no more than ${maxShowcaseImages(content.type)} showcase images.`, 400, 'VALIDATION_ERROR');
    }
    assertDistinct(retainedMediaAssetIds, 'Retained content cannot contain duplicates.');
    assertDistinct(retainedThumbnailIds, 'Retained content cannot contain duplicates.');
    assertDistinct([...thumbnailFileIds], 'Showcase image uploads cannot contain duplicates.');
    assertDistinct([...originalFileIds, ...thumbnailFileIds],
      'An uploaded asset file cannot also be uploaded as a separate showcase image.');
    assertDistinct([...showcaseMediaAssetIds, ...showcaseOriginalFileIds],
      'Showcase asset files cannot contain duplicates.');
    if (showcaseOriginalFileIds.some((fileId) => !originalFileIds.includes(fileId))
      || (showcaseOriginalFileIds.length > 0 && !replaceMedia)) {
      throw new AssetError('New showcase asset files must be part of the replacement files.', 400, 'VALIDATION_ERROR');
    }
    if (content.type === 'audio' && (showcaseMediaAssetIds.length || showcaseOriginalFileIds.length)) {
      throw new AssetError('Audio files cannot be used as showcase images.', 400, 'VALIDATION_ERROR');
    }

    return {
      ...result,
      contentUpdate: {
        type: content.type,
        replaceMedia,
        replaceThumbnails,
        replaceYdoc,
        retainedMediaAssetIds,
        retainedThumbnailIds,
        originalFileIds,
        thumbnailFileIds,
        showcaseMediaAssetIds,
        showcaseOriginalFileIds,
        showcaseOrder,
        ydocSnapshotId: replaceYdoc ? requireSnapshotId(content.ydocSnapshotId) : null,
        maxUploadFileBytes: MAX_UPLOAD_FILE_BYTES,
        maxShowcaseImages: maxShowcaseImages(content.type),
        maxShowcaseTotalBytes: maxShowcaseTotalBytes(content.type),
      },
    };
  }

  if (!ASSET_TYPES.has(payload?.type)) {
    throw new AssetError('Asset type must be image, video, audio, or template.', 400, 'VALIDATION_ERROR');
  }
  const type = payload.type;
  const isTemplate = type === 'template';
  const originalFileIds = uuidList(payload.originalFileIds, 'Asset file', MAX_CONTENT_FILES);
  if (isTemplate ? originalFileIds.length > 0 : originalFileIds.length < 1) {
    throw new AssetError(
      isTemplate
        ? 'Templates use a project snapshot and do not have asset files.'
        : `Choose between 1 and ${MAX_CONTENT_FILES} asset files.`,
      400,
      'VALIDATION_ERROR'
    );
  }
  const thumbnailInput = Array.isArray(payload.thumbnailFileIds)
    ? payload.thumbnailFileIds
    : payload.thumbnailFileId
      ? [payload.thumbnailFileId]
      : [];
  const maxShowcase = maxShowcaseImages(type);
  if (thumbnailInput.length > maxShowcase || (isTemplate && thumbnailInput.length < 1)) {
    throw new AssetError(isTemplate
      ? `Choose between 1 and ${maxShowcase} showcase images.`
      : `Choose no more than ${maxShowcase} showcase images.`, 400, 'VALIDATION_ERROR');
  }
  const thumbnailFileIds = uuidList(thumbnailInput, 'Showcase image', maxShowcase);
  const showcaseOriginalFileIds = uuidList(payload.showcaseOriginalFileIds, 'Showcase asset file', MAX_CONTENT_FILES);
  if (thumbnailFileIds.length + showcaseOriginalFileIds.length > maxShowcase) {
    throw new AssetError(`Choose no more than ${maxShowcase} showcase images.`, 400, 'VALIDATION_ERROR');
  }
  const showcaseOrder = normalizeShowcaseOrder(payload.showcaseOrder, [
    ...showcaseOriginalFileIds.map((id) => `assetFile:${id}`),
    ...thumbnailFileIds.map((id) => `upload:${id}`),
  ]);
  assertDistinct([...originalFileIds, ...thumbnailFileIds],
    'An uploaded asset file cannot also be uploaded as a separate showcase image.');
  if (!isTemplate && originalFileIds.length <= 1 && (thumbnailFileIds.length || showcaseOriginalFileIds.length)) {
    throw new AssetError('A single asset file does not use showcase images.', 400, 'VALIDATION_ERROR');
  }
  if (isTemplate && showcaseOriginalFileIds.length) {
    throw new AssetError('Template showcase images must be uploaded separately.', 400, 'VALIDATION_ERROR');
  }
  if (showcaseOriginalFileIds.some((fileId) => !originalFileIds.includes(fileId))) {
    throw new AssetError('Showcase asset files must be part of this asset.', 400, 'VALIDATION_ERROR');
  }
  assertDistinct(showcaseOriginalFileIds, 'Showcase asset files cannot contain duplicates.');
  if (type === 'audio' && showcaseOriginalFileIds.length) {
    throw new AssetError('Audio files cannot be used as showcase images.', 400, 'VALIDATION_ERROR');
  }

  return {
    ...result,
    type,
    originalFileIds,
    thumbnailFileIds,
    showcaseOriginalFileIds,
    showcaseOrder,
    ydocSnapshotId: isTemplate ? requireSnapshotId(payload.ydocSnapshotId) : null,
    maxUploadFileBytes: MAX_UPLOAD_FILE_BYTES,
    maxShowcaseImages: maxShowcase,
    maxShowcaseTotalBytes: maxShowcaseTotalBytes(type),
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

function publicAsset(asset, feePercent = DEFAULT_MARKETPLACE_ASSET_TRANSACTION_FEE_PERCENT) {
  if (!asset) return asset;
  const { owner_account_id: _ownerAccountId, total_count: _totalCount, ...safeAsset } = asset;
  const priceCredits = Number(safeAsset.price_credits);
  const transactionFeeCredits = calculateAssetTransactionFee(priceCredits, feePercent);
  return {
    ...safeAsset,
    owner_account_id: _ownerAccountId,
    review_status: safeAsset.is_owner ? (safeAsset.review_status || null) : undefined,
    rejection_reason: safeAsset.is_owner ? (safeAsset.rejection_reason || null) : undefined,
    like_count: Number(safeAsset.like_count || 0),
    save_count: Number(safeAsset.save_count || 0),
    review_count: Number(safeAsset.review_count || 0),
    purchase_count: Number(safeAsset.purchase_count || 0),
    average_rating: Number(safeAsset.average_rating || 0),
    creator_average_rating: Number(safeAsset.creator_average_rating || 0),
    creator_rating_count: Number(safeAsset.creator_rating_count || 0),
    transaction_fee_percent: feePercent,
    transaction_fee_credits: transactionFeeCredits,
    owner_net_credits: priceCredits - transactionFeeCredits,
  };
}

function assetPostingError(code, eligibility = {}) {
  if (code === 'ASSET_VERIFICATION_REQUIRED') {
    return new AssetError(
      'Verify your account before posting marketplace assets.',
      403,
      code
    );
  }
  if (code === 'ASSET_POST_LIMIT_REACHED') {
    const limit = Number(eligibility.limit);
    const limitMessage = Number.isSafeInteger(limit)
      ? `Your subscription allows ${limit} asset posting${limit === 1 ? '' : 's'}. You have reached this limit.`
      : 'Your subscription asset posting limit has been reached.';
    return new AssetError(
      limitMessage,
      409,
      code
    );
  }
  return new AssetError(
    'Asset posting is not available for your current subscription.',
    403,
    'ASSET_POSTING_UNAVAILABLE'
  );
}

function mapAssetContentError(error, { replacing = false } = {}) {
  const what = replacing ? 'The replacement' : 'The uploaded';
  if (error.code === 'ASSET_FILE_NOT_OWNED') {
    return new AssetError(`${what} file is unavailable or is not owned by this account.`, 400, error.code);
  }
  if (error.code === 'ASSET_FILE_ALREADY_USED') {
    return new AssetError('An upload is already attached to an asset.', 409, error.code);
  }
  if (error.code === 'ASSET_FILE_TYPE_MISMATCH') {
    return new AssetError('Every file must match the selected asset type.', 400, error.code);
  }
  if (error.code === 'ASSET_FILE_PLACEMENT_INVALID') {
    return new AssetError('Files were uploaded to invalid storage locations.', 400, error.code);
  }
  if (error.code === 'ASSET_THUMBNAIL_INVALID') {
    return new AssetError('Showcase images do not meet the requirements for this asset type.', 400, error.code);
  }
  if (error.code === 'ASSET_PREVIEW_INVALID') {
    return new AssetError('The preview for an image could not be generated.', 400, error.code);
  }
  if (error.code === 'ASSET_IMAGE_UNPROCESSABLE') {
    return new AssetError('One of the images could not be processed. Check the file and try again.', 400, error.code);
  }
  if (error.code === 'ASSET_ORIGINAL_FILE_TOO_LARGE') {
    return new AssetError('Each asset file must be no larger than 1GB.', 400, error.code);
  }
  if (error.code === 'ASSET_YDOC_INVALID') {
    return new AssetError('The template project snapshot is unavailable or already used by another listing.', 400, error.code);
  }
  return null;
}

async function getAssetPostingEligibilityServices(accountId) {
  const eligibility = await getAssetPostingEligibilityRepository(accountId);
  const message = eligibility.allowed ? null : assetPostingError(eligibility.code, eligibility).message;
  return { ...eligibility, message };
}
async function listAssetsServices(accountId, query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(48, Math.max(1, Number.parseInt(query.pageSize, 10) || 12));
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '';
  const type = !query.type || query.type === 'all' ? '' : String(query.type);
  if (type && !ASSET_TYPES.has(type)) {
    throw new AssetError('Unsupported asset type filter.', 400, 'VALIDATION_ERROR');
  }

  
  let view = query.view ? String(query.view) : String(query.mine) === 'true' ? 'mine' : 'discover';
  const creatorAccountId = query.creatorAccountId ? String(query.creatorAccountId) : '';
  if (creatorAccountId && view !== 'mine') {
    view = 'creator';
  }

  if (view !== 'creator' && !ASSET_VIEWS.has(view)) {
    throw new AssetError('Unsupported asset view.', 400, 'VALIDATION_ERROR');
  }
  const status = !query.status ? '' : String(query.status);
  const ALLOWED_MINE_STATUSES = new Set(['', 'all', 'published', 'draft', 'pending', 'rejected']);
  if (status && !ASSET_STATUSES.has(status) && !(view === 'mine' && ALLOWED_MINE_STATUSES.has(status))) {
    throw new AssetError('Unsupported asset status filter.', 400, 'VALIDATION_ERROR');
  }

  const rows = await listAssetsRepository({
    accountId,
    search,
    type,
    status: (view === 'mine' && status !== 'all') ? status : '',
    view,
    creatorAccountId,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const total = rows[0]?.total_count || 0;
  const feePercent = await getMarketplaceTransactionFeePercent();
  return {
    assets: rows.map((row) => publicAsset(row, feePercent)),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

async function getAssetServices(assetId, accountId) {
  requireUuid(assetId);
  const feePercent = await getMarketplaceTransactionFeePercent();
  const asset = await getAssetRepository(assetId, accountId);
  if (!asset) throw new AssetError('Asset not found.', 404, 'ASSET_NOT_FOUND');
  return publicAsset(asset, feePercent);
}

async function createAssetServices(accountId, payload) {
  const data = validateAssetPayload(payload, { creating: true });
  try {
    const { resolveMarketplacePublishStatus, getModerationSettings } = require('../lib/ModerationPolicy');
    const { assertWarningAllows, listingReviewForced } = require('./WarningBandServices');
    if (String(data.status).toLowerCase() === 'published') {
      await assertWarningAllows(accountId, 'publish_asset');
    }
    const settings = await getModerationSettings();
    const watchReview = String(data.status).toLowerCase() === 'published'
      && await listingReviewForced(accountId);
    const reviewRequired = (settings.marketplaceListingReview || watchReview) && String(data.status).toLowerCase() === 'published';

    // When review is required, asset is created as draft while awaiting moderator approval
    const requestedStatus = data.status;
    data.status = reviewRequired ? 'draft' : requestedStatus;

    // Save the listing and its processing jobs atomically; storage work runs afterwards.
    const assetId = await createAssetRepository(accountId, data);
    const asset = await getAssetServices(assetId, accountId);

    let reviewInfo = { queued: false };
    if (reviewRequired) {
      reviewInfo = await resolveMarketplacePublishStatus({
        accountId,
        marketAssetId: assetId,
        title: data.name,
        description: data.description,
        priceCredits: data.priceCredits,
        category: asset?.type || 'Assets',
        thumbnailUrl: asset?.thumbnails?.[0]?.path || asset?.thumbnail_path || null,
        requestedStatus,
        currentStatus: 'draft',
      });
    }

    if (reviewInfo.queued) {
      return { ...asset, reviewQueued: true, reviewMessage: reviewInfo.message };
    }
    if (String(asset?.status).toLowerCase() === 'published') {
      const { scheduleBadgeEvaluation } = require('./BadgeServices');
      scheduleBadgeEvaluation(accountId);
    }
    return asset;
  } catch (error) {
    if (error.code === 'WARNING_RESTRICTED') {
      throw new AssetError(error.message, 403, error.code);
    }
    if (['ASSET_VERIFICATION_REQUIRED', 'ASSET_POST_LIMIT_REACHED', 'ASSET_POSTING_UNAVAILABLE'].includes(error.code)) {
      throw assetPostingError(error.code, error.eligibility);
    }
    if (error.code === 'INSUFFICIENT_CREDITS') {
      throw new AssetError(`Insufficient credits for marketplace listing fee. Required: ${error.required}, Available: ${error.available}.`, 400, error.code);
    }
    throw mapAssetContentError(error) || error;
  }
}

async function getAssetDownloadServices(assetId, accountId, mediaAssetId = null, projectId = null) {
  requireUuid(assetId);
  if (mediaAssetId) requireUuid(mediaAssetId, 'Media asset ID');
  if (projectId !== null) requireUuid(projectId, 'Project ID');
  const download = await getAssetDownloadRepository(assetId, accountId, mediaAssetId, projectId);
  if (!download) throw new AssetError('Asset file not found.', 404, 'ASSET_FILE_NOT_FOUND');
  if (!download.is_owner && !download.is_purchased) {
    throw new AssetError('Purchase this asset before downloading the original file.', 403, 'ASSET_PURCHASE_REQUIRED');
  }
  return {
    downloadUrl: await generateProtectedAssetDownloadUrl(download.path, download.name, download.mime_type),
    expiresIn: 60,
  };
}

async function getAssetOriginalPreviewServices(assetId, accountId, mediaAssetId = null, projectId = null) {
  requireUuid(assetId);
  if (mediaAssetId) requireUuid(mediaAssetId, 'Media asset ID');
  if (projectId !== null) requireUuid(projectId, 'Project ID');
  const preview = await getAssetDownloadRepository(assetId, accountId, mediaAssetId, projectId);
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
  assetId = requireUuid(assetId).toLowerCase();
  try {
    const feePercent = await getMarketplaceTransactionFeePercent();
    const result = await purchaseAssetRepository(assetId, accountId, feePercent);
    const asset = await getAssetServices(assetId, accountId);
    emitPurchaseEvents(result);
    return {
      asset,
      transaction: result.transaction || null,
      alreadyPurchased: result.alreadyPurchased,
      license: result.license,
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

async function listAssetLicensesServices(assetId, accountId, query = {}) {
  requireUuid(assetId);
  const page = Number(query.page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) {
    throw new AssetError('Invalid license page.', 400, 'ASSET_LICENSE_PAGE_INVALID');
  }
  const licenses = await listAssetLicensesRepository(assetId, accountId, 51, (page - 1) * 50);
  return { licenses: licenses.slice(0, 50), page, hasMore: licenses.length > 50 };
}

async function assignAssetLicenseServices(assetId, licenseId, accountId, payload = {}) {
  assetId = requireUuid(assetId).toLowerCase();
  requireUuid(licenseId, 'License ID');
  requireUuid(payload?.projectId, 'Project ID');
  try {
    return await assignAssetLicenseRepository(assetId, licenseId, accountId, payload.projectId.toLowerCase());
  } catch (error) {
    const errors = {
      ASSET_LICENSE_NOT_FOUND: [404, 'License not found.'],
      ASSET_LICENSE_INACTIVE: [409, 'This license is no longer active.'],
      ASSET_LICENSE_ALREADY_ASSIGNED: [409, 'This license is already assigned to another project.'],
      ASSET_PROJECT_ALREADY_LICENSED: [409, 'This project already has a license for this asset.'],
      ASSET_LICENSE_PROJECT_FORBIDDEN: [403, 'You must be an owner, manager, or editor of this project to assign your license.'],
      ASSET_LICENSE_PROJECT_FROZEN: [409, 'This project is frozen.'],
    };
    if (errors[error.code]) throw new AssetError(errors[error.code][1], errors[error.code][0], error.code);
    throw error;
  }
}

async function updateAssetServices(assetId, accountId, payload) {
  requireUuid(assetId);
  const data = validateAssetPayload(payload);
  try {
    const currentAsset = await getAssetServices(assetId, accountId);
    const { resolveMarketplacePublishStatus } = require('../lib/ModerationPolicy');
    const publish = await resolveMarketplacePublishStatus({
      accountId,
      marketAssetId: assetId,
      title: data.name,
      description: data.description,
      priceCredits: data.priceCredits,
      category: currentAsset?.type || 'Assets',
      thumbnailUrl: currentAsset?.thumbnails?.[0]?.path || currentAsset?.thumbnail_path || null,
      requestedStatus: data.status,
      currentStatus: currentAsset?.status || 'draft',
    });
    data.status = publish.status;
    const updated = await updateAssetRepository(assetId, accountId, data);
    if (!updated) throw new AssetError('Asset not found or you cannot edit it.', 404, 'ASSET_NOT_FOUND');
    const asset = await getAssetServices(assetId, accountId);
    if (publish.queued) {
      return { ...asset, reviewQueued: true, reviewMessage: publish.message };
    }
    if (String(asset?.status).toLowerCase() === 'published') {
      const { scheduleBadgeEvaluation } = require('./BadgeServices');
      scheduleBadgeEvaluation(accountId);
    }
    return asset;
  } catch (error) {
    if (error.code === 'WARNING_RESTRICTED') {
      throw new AssetError(error.message, 403, error.code);
    }
    if (['ASSET_VERIFICATION_REQUIRED', 'ASSET_POST_LIMIT_REACHED', 'ASSET_POSTING_UNAVAILABLE'].includes(error.code)) {
      throw assetPostingError(error.code, error.eligibility);
    }
    if (error.code === 'ASSET_CONTENT_LOCKED_AFTER_PURCHASE') {
      throw new AssetError('Asset files, thumbnails, and the template snapshot cannot be changed after a purchase.', 409, error.code);
    }
    if (error.code === 'ASSET_TYPE_IMMUTABLE') {
      throw new AssetError('An existing asset type cannot be changed.', 409, error.code);
    }
    if (error.code === 'ASSET_RETAINED_CONTENT_INVALID') {
      throw new AssetError('One or more selected existing files no longer belongs to this asset.', 409, error.code);
    }
    if (error.code === 'ASSET_CONTENT_REQUIRED') {
      throw new AssetError('Keep at least one asset file.', 400, error.code);
    }
    throw mapAssetContentError(error, { replacing: true }) || error;
  }
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
  await require('./WarningBandServices').assertWarningAllows(accountId, 'asset_comment');
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
  await require('./WarningBandServices').assertWarningAllows(accountId, 'asset_comment');
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

async function performEditorAssetActionServices(assetId, accountId, payload) {
  const { action, enabled } = payload || {};
  if (action === 'report') return { report: await reportAssetServices(assetId, accountId, payload) };
  if (!['like', 'save'].includes(action) || typeof enabled !== 'boolean') {
    throw new AssetError('Choose a valid asset action.');
  }
  const service = action === 'like' ? setAssetLikeServices : setAssetSaveServices;
  return service(assetId, accountId, enabled);
}

async function reportAssetServices(assetId, accountId, payload) {
  const asset = await getAssetServices(assetId, accountId);
  if (asset.is_owner) throw new AssetError('You cannot report your own asset.', 403);
  const type = cleanText(payload?.type, 'Report reason', 100);
  const description = cleanText(payload?.description, 'Report details', 2000);
  if (description.length < 20) throw new AssetError('Report details must contain at least 20 characters.');
  const { randomUUID } = require('crypto');
  const { createReport } = require('../repositories/ModeratorSharedRepositories');
  return createReport({
    reportNumber: `RPT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`,
    reporterAccountId: accountId,
    targetAccountId: asset.owner_account_id,
    targetType: 'asset',
    targetId: assetId,
    referenceTable: 'market_assets',
    referencePrefix: 'asset',
    type,
    description: `${asset.name}\n${description}`,
  });
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
  listAssetLicensesServices,
  assignAssetLicenseServices,
  AssetError,
  reportAssetServices,
  performEditorAssetActionServices,
  getAssetPostingEligibilityServices,
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
