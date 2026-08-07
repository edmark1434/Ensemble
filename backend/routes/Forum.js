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
const {
	createGroupReportController,
	createMemberReportController,
	createDiscussionReportController,
} = require('../controllers/ForumReportControllers');

router.post('/create-group', [checkSession, requireAuth], createForumGroup);
router.get('/groups', [checkSession, requireAuth], getAllForumGroupsController);
router.get('/groups/joined', [checkSession, requireAuth], getJoinedForumGroupsController);
router.get('/groups/member/:memberId', [checkSession, requireAuth], getForumGroupsByMemberIdController);
router.get('/groups/:groupId', [checkSession, requireAuth], getForumGroupByIdController);

router.post('/discussions', [checkSession, requireAuth], createForumDiscussionController);
router.get('/discussions/feed', [checkSession, requireAuth], getForumDiscussionFeedController);
router.get('/discussions/group/:groupId', [checkSession, requireAuth], getForumDiscussionByGroupIdController);
router.get('/discussions/saved', [checkSession, requireAuth], getForumDiscussionSavedByUserIdController);
router.get('/user/discussions', [checkSession, requireAuth], getForumDiscussionsByUserIdController);
router.get('/users/:userId/discussions', [checkSession, requireAuth], getForumDiscussionsByUserIdController);
router.get('/discussions/:discussionId', [checkSession, requireAuth], getForumDiscussionByIdController);
router.patch('/discussions/:discussionId', [checkSession, requireAuth], updateForumDiscussionController);
router.patch('/discussions/:discussionId/comments/:commentId', [checkSession, requireAuth], updateForumDiscussionCommentsController);
router.post('/discussions/:discussionId/comments', [checkSession, requireAuth], addForumDiscussionCommentController);
router.put('/groups/:groupId', [checkSession, requireAuth], updateForumGroupController);
router.put('/groups/members/:groupId', [checkSession, requireAuth], updateForumGroupMembersController);
router.patch('/groups/:groupId/members/:memberId/role', [checkSession, requireAuth], updateForumGroupMemberRoleController);
router.patch('/groups/:groupId/members/:memberId/ban', [checkSession, requireAuth], updateForumGroupMemberBanController);
router.delete('/groups/:groupId/members/:memberId', [checkSession, requireAuth], removeForumGroupMemberController);
router.delete('/groups/:groupId', [checkSession, requireAuth], deleteForumGroupController);
router.delete('/discussions/:discussionId', [checkSession, requireAuth], deleteForumDiscussionController);
router.post('/reports/groups/:groupId', [checkSession, requireAuth], createGroupReportController);
router.post('/reports/groups/:groupId/members/:memberId', [checkSession, requireAuth], createMemberReportController);
router.post('/reports/discussions/:discussionId', [checkSession, requireAuth], createDiscussionReportController);
module.exports = router;
