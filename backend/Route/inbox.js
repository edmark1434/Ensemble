const {
    createInboxController,
    createMessageController,
    updateMessageController,
    updateInboxController,
    getConversationByConvoIdController,
    getInboxByAccountIdController,
    checkInboxByTwoAccountIdsController
} = require("../Controllers/InboxControllers");
const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
router.post('/', createInboxController);
router.post('/message', createMessageController);
router.patch('/message/:messageId', updateMessageController);
router.patch('/inbox/:inboxId', updateInboxController);
router.get('/conversation/:convoId', getConversationByConvoIdController);
router.get('/:conversation_type', [checkSession,requireAuth], getInboxByAccountIdController);
router.post('/two-accounts', [checkSession,requireAuth], checkInboxByTwoAccountIdsController);
module.exports = router;
