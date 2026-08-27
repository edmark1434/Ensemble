const {
    createInboxController,
    createGroupController,
    createEngagementChatController,
    createMarketplaceChatController,
    createRevisionChatController,
    createMessageController,
    replyMessageController,
    reactMessageController,
    removeMessageReactionController,
    reportMessageController,
    pinMessageController,
    unpinMessageController,
    updateMessageController,
    deleteMessageController,
    updateInboxController,
    updateGroupMemberController,
    removeGroupMemberController,
    getConversationByConvoIdController,
    getInboxByAccountIdController,
    getAllInboxesByAccountIdController,
    checkInboxByTwoAccountIdsController,
    getInboxByTwoAccountIdsController,
} = require('../controllers/InboxControllers');
const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');

router.use(checkSession, requireAuth);

router.get('/', getAllInboxesByAccountIdController);
router.post('/', createInboxController);
router.post('/group', createGroupController);
router.post('/engagement', createEngagementChatController);
router.post('/marketplace', createMarketplaceChatController);
router.post('/revision', createRevisionChatController);
router.post('/two-accounts', checkInboxByTwoAccountIdsController);

router.post('/message', createMessageController);
router.post('/message/:messageId/reply', replyMessageController);
router.patch('/message/:messageId', updateMessageController);
router.delete('/message/:messageId', deleteMessageController);
router.put('/message/:messageId/reaction', reactMessageController);
router.delete('/message/:messageId/reaction', removeMessageReactionController);
router.post('/message/:messageId/report', reportMessageController);

router.post(
    '/conversation/:conversationId/pin/:messageId',
    pinMessageController
);
router.delete(
    '/conversation/:conversationId/pin/:messageId',
    unpinMessageController
);
router.get(
    '/conversation/direct/:accountId',
    getInboxByTwoAccountIdsController
);
router.get('/conversation/:convoId', getConversationByConvoIdController);

router.patch('/inbox/:inboxId', updateInboxController);
router.put('/inbox/:inboxId/members/:accountId', updateGroupMemberController);
router.delete('/inbox/:inboxId/members/:accountId', removeGroupMemberController);
router.get('/:conversation_type', getInboxByAccountIdController);

module.exports = router;
