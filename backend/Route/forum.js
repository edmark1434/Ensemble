const router = require('express').Router();
const { createForumGroup } = require('../Controllers/ForumGroupControllers');
const requireAuth = require('../middleware/requireAuth');
const checkSession = require('../middleware/checkSession');

router.post('/create-group', [checkSession, requireAuth], createForumGroup);

module.exports = router;