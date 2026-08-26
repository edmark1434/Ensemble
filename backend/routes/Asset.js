const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const {
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
} = require('../controllers/AssetControllers');

router.use(checkSession, requireAuth);

router.get('/posting-eligibility', getAssetPostingEligibilityController);
router.get('/', listAssetsController);
router.post('/', createAssetController);
router.post('/:assetId/purchase', purchaseAssetController);
router.put('/:assetId/like', likeAssetController);
router.delete('/:assetId/like', unlikeAssetController);
router.put('/:assetId/save', saveAssetController);
router.delete('/:assetId/save', unsaveAssetController);
router.get('/:assetId/reviews', listAssetReviewsController);
router.post('/:assetId/reviews', createAssetReviewController);
router.patch('/:assetId/reviews/:reviewId', updateAssetReviewController);
router.delete('/:assetId/reviews/:reviewId', deleteAssetReviewController);
router.get('/:assetId/files/:bundleFileId/original-preview', getAssetOriginalPreviewController);
router.get('/:assetId/files/:bundleFileId/download', getAssetDownloadController);
router.get('/:assetId/original-preview', getAssetOriginalPreviewController);
router.get('/:assetId/download', getAssetDownloadController);
router.get('/:assetId', getAssetController);
router.patch('/:assetId', updateAssetController);
router.delete('/:assetId', deleteAssetController);
router.get('/:assetId/comments', listCommentsController);
router.post('/:assetId/comments', createCommentController);
router.patch('/:assetId/comments/:commentId', updateCommentController);
router.delete('/:assetId/comments/:commentId', deleteCommentController);
router.post('/:assetId/comments/:commentId/replies', createReplyController);
router.patch('/:assetId/comments/:commentId/replies/:replyId', updateReplyController);
router.delete('/:assetId/comments/:commentId/replies/:replyId', deleteReplyController);

module.exports = router;
