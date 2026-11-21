const router = require('express').Router();
const {
	createForumGroup,
	getAllForumGroupsController,
	getForumGroupsByMemberIdController,
	getJoinedForumGroupsController,
	getForumGroupByIdController,
	updateForumGroupController,
	updateForumGroupMembersController,
	deleteForumGroupController,
	updateForumGroupMemberRoleController,
	updateForumGroupMemberBanController,
	removeForumGroupMemberController,
} = require('../controllers/ForumGroupControllers');
const {
	createForumDiscussionController,
	getForumDiscussionByGroupIdController,
	getForumDiscussionFeedController,
	getForumDiscussionByIdController,
	getForumDiscussionsByUserIdController,
	updateForumDiscussionController,
	updateForumDiscussionCommentsController,
	addForumDiscussionCommentController,
	getForumDiscussionSavedByUserIdController,
	deleteForumDiscussionController
} = require('../controllers/ForumDiscussionControllers');
const requireAuth = require('../middleware/RequireAuth');
const checkSession = require('../middleware/CheckSession');
const optionalSession = require('../middleware/OptionalSession');
const { createRateLimiter } = require('../middleware/RateLimiter');

const forumCommentLimiter = createRateLimiter('forumComment', {
	windowMs: 60 * 1000,
	accountLimit: 10,
	anonymousLimit: 5,
	networkLimit: 120,
	message: 'You are commenting too fast. Please wait a moment before posting another reply.',
});
// Reports already dedupe per item; this stops one account from flooding the forum queue.
const forumReportLimiter = createRateLimiter('forumReport', {
	windowMs: 10 * 60 * 1000,
	accountLimit: 10,
	anonymousLimit: 3,
	networkLimit: 60,
	message: 'You have sent several reports in a short time. Please wait a few minutes before reporting again.',
});
const {
	createGroupReportController,
	createMemberReportController,
	createDiscussionReportController,
	createCommentReportController,
} = require('../controllers/ForumReportControllers');

router.post('/create-group', [checkSession, requireAuth], createForumGroup);
router.get('/groups', optionalSession, getAllForumGroupsController);
router.get('/groups/joined', [checkSession, requireAuth], getJoinedForumGroupsController);
router.get('/groups/member/:memberId', [checkSession, requireAuth], getForumGroupsByMemberIdController);
router.get('/groups/:groupId', optionalSession, getForumGroupByIdController);

router.post('/discussions', [checkSession, requireAuth], createForumDiscussionController);
router.get('/discussions/feed', optionalSession, getForumDiscussionFeedController);
router.get('/discussions/group/:groupId', optionalSession, getForumDiscussionByGroupIdController);
router.get('/discussions/saved', [checkSession, requireAuth], getForumDiscussionSavedByUserIdController);
router.get('/user/discussions', [checkSession, requireAuth], getForumDiscussionsByUserIdController);
router.get('/users/:userId/discussions', [checkSession, requireAuth], getForumDiscussionsByUserIdController);
router.get('/discussions/:discussionId', [checkSession, requireAuth], getForumDiscussionByIdController);
router.patch('/discussions/:discussionId', [checkSession, requireAuth], updateForumDiscussionController);
router.patch('/discussions/:discussionId/comments/:commentId', [checkSession, requireAuth], updateForumDiscussionCommentsController);
router.post('/discussions/:discussionId/comments', [checkSession, requireAuth, forumCommentLimiter], addForumDiscussionCommentController);
router.put('/groups/:groupId', [checkSession, requireAuth], updateForumGroupController);
router.put('/groups/members/:groupId', [checkSession, requireAuth], updateForumGroupMembersController);
router.patch('/groups/:groupId/members/:memberId/role', [checkSession, requireAuth], updateForumGroupMemberRoleController);
router.patch('/groups/:groupId/members/:memberId/ban', [checkSession, requireAuth], updateForumGroupMemberBanController);
router.delete('/groups/:groupId/members/:memberId', [checkSession, requireAuth], removeForumGroupMemberController);
router.delete('/groups/:groupId', [checkSession, requireAuth], deleteForumGroupController);
router.delete('/discussions/:discussionId', [checkSession, requireAuth], deleteForumDiscussionController);
router.post('/reports/groups/:groupId', [checkSession, requireAuth, forumReportLimiter], createGroupReportController);
router.post('/reports/groups/:groupId/members/:memberId', [checkSession, requireAuth, forumReportLimiter], createMemberReportController);
router.post('/reports/discussions/:discussionId', [checkSession, requireAuth, forumReportLimiter], createDiscussionReportController);
router.post('/reports/discussions/:discussionId/comments/:commentId', [checkSession, requireAuth, forumReportLimiter], createCommentReportController);
module.exports = router;
