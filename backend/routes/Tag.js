const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const {
    getAllTagsController,
    getTagByIdController,
    getAllTagsByUserIdController,
    // REMOVED: createUserTagController,
    // REMOVED: deleteUserTagController,
    // ADDED: New controllers
    checkUserTagExistsController,
    updateSkillsController,
    getUserSkillsController,
    hasSkillController
} = require('../controllers/TagControllers');

// ============= EXISTING ROUTES (KEPT AS IS) =============

// Get all tags
router.get('/', getAllTagsController);

// Get tag by ID
router.get('/tags/:tagId', getTagByIdController);

// Get all tags for a user
router.get('/users/:accountId/tags', getAllTagsByUserIdController);

// REMOVED: router.post('/users/:userId/tags', [], createUserTagController);
// REMOVED: router.delete('/users/:userId/tags', [checkSession, requireAuth], deleteUserTagController);

// ============= NEW ROUTES FOR SKILLS MANAGEMENT =============

// Check if user has a specific tag
router.get('/users/:userId/tags/:tagId/exists', [checkSession, requireAuth], checkUserTagExistsController);

// Update skills (add, remove, modify in bulk)
router.put('/skills', [checkSession, requireAuth], updateSkillsController);

// Check if user has a specific skill
router.get('/skills/:tagId', [checkSession, requireAuth], hasSkillController);

module.exports = router;