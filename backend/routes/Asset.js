const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const {
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
} = require('../controllers/AssetControllers');

router.use(checkSession, requireAuth);

router.get('/', listAssetsController);
router.post('/', createAssetController);
router.post('/:assetId/purchase', purchaseAssetController);
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
