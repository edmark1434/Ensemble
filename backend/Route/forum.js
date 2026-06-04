const router = require('express').Router();
const {
	createForumGroup,
	getAllForumGroupsController,
	getForumGroupsByMemberIdController,
	getForumGroupByIdController,
	updateForumGroupController,
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
} = require('../Controllers/ForumDiscussionControllers');
const requireAuth = require('../middleware/requireAuth');
const checkSession = require('../middleware/checkSession');

router.post('/create-group', [checkSession, requireAuth], createForumGroup);
router.get('/groups', [checkSession, requireAuth], getAllForumGroupsController);
router.get('/groups/member/:memberId', [checkSession, requireAuth], getForumGroupsByMemberIdController);
router.get('/groups/:groupId', [checkSession, requireAuth], getForumGroupByIdController);
router.post('/discussions', createForumDiscussionController);
router.get('/discussions/group/:groupId', [checkSession, requireAuth], getForumDiscussionByGroupIdController);
router.get('/discussions/:discussionId', [checkSession, requireAuth], getForumDiscussionByIdController);
router.get('/discussions/user/:userId', [checkSession, requireAuth], getForumDiscussionsByUserIdController);
router.patch('/discussions/:discussionId', [checkSession, requireAuth], updateForumDiscussionController);
router.patch('/discussions/:discussionId/comments/:commentId', [checkSession, requireAuth], updateForumDiscussionCommentsController);
router.post('/discussions/:discussionId/comments', [checkSession, requireAuth], addForumDiscussionCommentController);
router.put('/groups/:groupId', [checkSession, requireAuth], updateForumGroupController);
router.put('/groups/delete/:groupId', [], deleteForumGroupController);
module.exports = router;