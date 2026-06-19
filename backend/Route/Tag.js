const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
const {
    getAllTagsController,
    getTagByIdController,
    getAllTagsByUserIdController,
    createUserTagController,
    deleteUserTagController
} = require('../Controllers/TagControllers');

router.get('/', [], getAllTagsController);
router.get('/tags/:tagId', [], getTagByIdController);
router.get('/users/:userId/tags', [], getAllTagsByUserIdController);
router.post('/users/:userId/tags', [], createUserTagController);
router.delete('/users/:userId/tags', [checkSession, requireAuth], deleteUserTagController);

module.exports = router;