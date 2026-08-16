const {
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

async function listAssetsController(req, res) {
  try {
    return res.json({ success: true, ...(await listAssetsServices(req.user.account_id, req.query)) });
  } catch (error) { return handleAssetError(res, error); }
}

async function getAssetController(req, res) {
  try {
    return res.json({ success: true, asset: await getAssetServices(req.params.assetId, req.user.account_id) });
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
      ...(await getAssetDownloadServices(req.params.assetId, req.user.account_id)),
    });
  } catch (error) { return handleAssetError(res, error); }
}

async function getAssetOriginalPreviewController(req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      ...(await getAssetOriginalPreviewServices(req.params.assetId, req.user.account_id)),
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

async function listCommentsController(req, res) {
  try {
    return res.json({ success: true, comments: await listCommentsServices(req.params.assetId, req.user.account_id) });
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

module.exports = {
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
};
