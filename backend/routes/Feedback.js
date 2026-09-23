const express = require('express');
const router = express.Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const { submitFeedback, getUserRating, upsertUserRating } = require('../controllers/FeedbackControllers');

router.post('/', [checkSession, requireAuth], submitFeedback);
router.get('/rating', [checkSession, requireAuth], getUserRating);
router.put('/rating', [checkSession, requireAuth], upsertUserRating);

module.exports = router;