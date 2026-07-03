const router = require('express').Router();
const {
	createForumGroup,
	getAllForumGroupsController,
	getForumGroupsByMemberIdController,
	getForumGroupByIdController,
	updateForumGroupController,
	updateForumGroupMembersController,
	deleteForumGroupController,
} = require('../Controllers/ForumGroupControllers');
const {
	createForumDiscussionController,
	getForumDiscussionByGroupIdController,
	getForumDiscussionByIdController,
	getForumDiscussionsByUserIdController,
	updateForumDiscussionController,
	updateForumDiscussionCommentsController,
	addForumDiscussionCommentController,
	getForumDiscussionSavedByUserIdController,
	deleteForumDiscussionController
} = require('../Controllers/ForumDiscussionControllers');
const requireAuth = require('../middleware/requireAuth');
const checkSession = require('../middleware/checkSession');

router.post('/create-group', [checkSession, requireAuth], createForumGroup);
router.get('/groups', [checkSession, requireAuth], getAllForumGroupsController);
router.get('/groups/member/:memberId', [checkSession, requireAuth], getForumGroupsByMemberIdController);
router.get('/groups/:groupId', [checkSession, requireAuth], getForumGroupByIdController);

router.post('/discussions', createForumDiscussionController);
router.get('/discussions/group/:groupId', [checkSession, requireAuth], getForumDiscussionByGroupIdController);
router.get('/discussions/saved', [checkSession, requireAuth], getForumDiscussionSavedByUserIdController);
router.get('/user/discussions', [checkSession, requireAuth], getForumDiscussionsByUserIdController);
router.get('/discussions/:discussionId', [checkSession, requireAuth], getForumDiscussionByIdController);
router.patch('/discussions/:discussionId', [checkSession, requireAuth], updateForumDiscussionController);
router.patch('/discussions/:discussionId/comments/:commentId', [checkSession, requireAuth], updateForumDiscussionCommentsController);
router.post('/discussions/:discussionId/comments', [checkSession, requireAuth], addForumDiscussionCommentController);
router.put('/groups/:groupId', [checkSession, requireAuth], updateForumGroupController);
router.put('/groups/members/:groupId', [checkSession, requireAuth], updateForumGroupMembersController);
router.delete('/groups/:groupId', [checkSession, requireAuth], deleteForumGroupController);
router.delete('/discussions/:discussionId', [checkSession, requireAuth], deleteForumDiscussionController);
module.exports = router;