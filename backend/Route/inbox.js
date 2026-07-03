const {
    createInboxController,
    createMessageController,
    updateMessageController,
    updateInboxController,
    getConversationByConvoIdController,
    getConversationByAccountIdController
} = require("../Controllers/InboxControllers");
const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
router.post('/', createInboxController);
router.post('/message', createMessageController);
router.patch('/message/:messageId', updateMessageController);
router.patch('/inbox/:inboxId', updateInboxController);
router.get('/conversation/:convoId', getConversationByConvoIdController);
router.get('/conversations', [checkSession,requireAuth], getConversationByAccountIdController);
module.exports = router;
