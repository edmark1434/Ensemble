const {
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
  listAssetLicensesServices,
  assignAssetLicenseServices,
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
} = require('../services/AssetServices');

function handleAssetError(res, error) {
  const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  if (status >= 500) console.error('Asset request failed:', error);
  return res.status(status).json({
    success: false,
    error: status >= 500 ? 'Unable to process the asset request.' : error.message,
    code: status >= 500 ? 'ASSET_REQUEST_FAILED' : error.code,
  });
}

async function getAssetPostingEligibilityController(req, res) {
  try {
    return res.json({
      success: true,
      eligibility: await getAssetPostingEligibilityServices(req.user.account_id),
    });
  } catch (error) { return handleAssetError(res, error); }
}
async function listAssetsController(req, res) {
  try {
    return res.json({ success: true, ...(await listAssetsServices(req.user?.account_id, req.query)) });
  } catch (error) { return handleAssetError(res, error); }
}

async function getAssetController(req, res) {
  try {
    return res.json({ success: true, asset: await getAssetServices(req.params.assetId, req.user?.account_id) });
  } catch (error) { return handleAssetError(res, error); }
}

async function createAssetController(req, res) {
  try {
    const asset = await createAssetServices(req.user.account_id, req.body);
    return res.status(201).json({ success: true, asset });
  } catch (error) { return handleAssetError(res, error); }
}

async function updateAssetController(req, res) {
  try {
    return res.json({ success: true, asset: await updateAssetServices(req.params.assetId, req.user.account_id, req.body) });
  } catch (error) { return handleAssetError(res, error); }
}

async function deleteAssetController(req, res) {
  try {
    await deleteAssetServices(req.params.assetId, req.user.account_id);
    return res.json({ success: true });
  } catch (error) { return handleAssetError(res, error); }
}

async function getAssetDownloadController(req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      ...(await getAssetDownloadServices(
        req.params.assetId,
        req.user.account_id,
        req.params.mediaAssetId || null,
        req.query.projectId ?? null
      )),
    });
  } catch (error) { return handleAssetError(res, error); }
}

async function getAssetOriginalPreviewController(req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      ...(await getAssetOriginalPreviewServices(
        req.params.assetId,
        req.user.account_id,
        req.params.mediaAssetId || null,
        req.query.projectId ?? null
      )),
    });
  } catch (error) { return handleAssetError(res, error); }
}

async function purchaseAssetController(req, res) {
  try {
    return res.json({
      success: true,
      ...(await purchaseAssetServices(req.params.assetId, req.user.account_id)),
    });
  } catch (error) { return handleAssetError(res, error); }
}

async function listAssetLicensesController(req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, ...await listAssetLicensesServices(req.params.assetId, req.user.account_id, req.query) });
  } catch (error) { return handleAssetError(res, error); }
}

async function assignAssetLicenseController(req, res) {
  try {
    return res.json({ success: true, license: await assignAssetLicenseServices(
      req.params.assetId, req.params.licenseId, req.user.account_id, req.body
    ) });
  } catch (error) { return handleAssetError(res, error); }
}

async function listCommentsController(req, res) {
  try {
    return res.json({ success: true, comments: await listCommentsServices(req.params.assetId, req.user?.account_id) });
  } catch (error) { return handleAssetError(res, error); }
}

async function createCommentController(req, res) {
  try {
    const comment = await createCommentServices(req.params.assetId, req.user.account_id, req.body);
    return res.status(201).json({ success: true, comment });
  } catch (error) { return handleAssetError(res, error); }
}

async function updateCommentController(req, res) {
  try {
    const comment = await updateCommentServices(req.params.assetId, req.params.commentId, req.user.account_id, req.body);
    return res.json({ success: true, comment });
  } catch (error) { return handleAssetError(res, error); }
}

async function deleteCommentController(req, res) {
  try {
    await deleteCommentServices(req.params.assetId, req.params.commentId, req.user.account_id);
    return res.json({ success: true });
  } catch (error) { return handleAssetError(res, error); }
}

async function createReplyController(req, res) {
  try {
    const reply = await createReplyServices(
      req.params.assetId,
      req.params.commentId,
      req.user.account_id,
      req.body
    );
    return res.status(201).json({ success: true, reply });
  } catch (error) { return handleAssetError(res, error); }
}

async function updateReplyController(req, res) {
  try {
    const reply = await updateReplyServices(
      req.params.assetId,
      req.params.commentId,
      req.params.replyId,
      req.user.account_id,
      req.body
    );
    return res.json({ success: true, reply });
  } catch (error) { return handleAssetError(res, error); }
}

async function deleteReplyController(req, res) {
  try {
    await deleteReplyServices(
      req.params.assetId,
      req.params.commentId,
      req.params.replyId,
      req.user.account_id
    );
    return res.json({ success: true });
  } catch (error) { return handleAssetError(res, error); }
}

async function likeAssetController(req, res) {
  try {
    return res.json({ success: true, ...(await setAssetLikeServices(
      req.params.assetId, req.user.account_id, true
    )) });
  } catch (error) { return handleAssetError(res, error); }
}

async function unlikeAssetController(req, res) {
  try {
    return res.json({ success: true, ...(await setAssetLikeServices(
      req.params.assetId, req.user.account_id, false
    )) });
  } catch (error) { return handleAssetError(res, error); }
}

async function saveAssetController(req, res) {
  try {
    return res.json({ success: true, ...(await setAssetSaveServices(
      req.params.assetId, req.user.account_id, true
    )) });
  } catch (error) { return handleAssetError(res, error); }
}

async function unsaveAssetController(req, res) {
  try {
    return res.json({ success: true, ...(await setAssetSaveServices(
      req.params.assetId, req.user.account_id, false
    )) });
  } catch (error) { return handleAssetError(res, error); }
}

async function listAssetReviewsController(req, res) {
  try {
    return res.json({
      success: true,
      reviews: await listAssetReviewsServices(req.params.assetId, req.user?.account_id),
    });
  } catch (error) { return handleAssetError(res, error); }
}

async function createAssetReviewController(req, res) {
  try {
    const review = await createAssetReviewServices(
      req.params.assetId, req.user.account_id, req.body
    );
    return res.status(201).json({ success: true, review });
  } catch (error) { return handleAssetError(res, error); }
}

async function updateAssetReviewController(req, res) {
  try {
    const review = await updateAssetReviewServices(
      req.params.assetId, req.params.reviewId, req.user.account_id, req.body
    );
    return res.json({ success: true, review });
  } catch (error) { return handleAssetError(res, error); }
}

async function deleteAssetReviewController(req, res) {
  try {
    await deleteAssetReviewServices(
      req.params.assetId, req.params.reviewId, req.user.account_id
    );
    return res.json({ success: true });
  } catch (error) { return handleAssetError(res, error); }
}

async function reportAssetController(req, res) {
  try {
    const report = await reportAssetServices(req.params.assetId, req.user.account_id, req.body);
    return res.status(201).json({ success: true, report });
  } catch (error) { return handleAssetError(res, error); }
}

// Only the editor server can call this bridge; it supplies its verified session identity.
async function editorAssetActionController(req, res) {
  try {
    const { accountId, action, enabled, ...payload } = req.body || {};
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(accountId || ''))) {
      return res.status(400).json({ error: 'Invalid account ID.' });
    }
    req.user = { account_id: accountId };
    const { rejectRestrictedAccount, rejectSuspendedWrite } = require('../lib/AccountRestriction');
    if (await rejectRestrictedAccount(req, res) || rejectSuspendedWrite(req, res)) return;
    const result = await performEditorAssetActionServices(req.params.assetId, accountId, { action, enabled, ...payload });
    return res.status(action === 'report' ? 201 : 200).json({ success: true, ...result });
  } catch (error) { return handleAssetError(res, error); }
}

module.exports = {
  listAssetLicensesController,
  assignAssetLicenseController,
  reportAssetController,
  editorAssetActionController,
  getAssetPostingEligibilityController,
  listAssetsController,
  getAssetController,
  createAssetController,
  updateAssetController,
  deleteAssetController,
  getAssetDownloadController,
  getAssetOriginalPreviewController,
  purchaseAssetController,
  listCommentsController,
  createCommentController,
  updateCommentController,
  deleteCommentController,
  createReplyController,
  updateReplyController,
  deleteReplyController,
  likeAssetController,
  unlikeAssetController,
  saveAssetController,
  unsaveAssetController,
  listAssetReviewsController,
  createAssetReviewController,
  updateAssetReviewController,
  deleteAssetReviewController,
};
