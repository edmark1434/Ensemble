const { getAllPlanControllers,
    getSubcriptionByUserIdControllers
 } = require('../Controllers/SubscriptionControllers');
const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
router.get('/plans', [], getAllPlanControllers);
router.get('/', [checkSession, requireAuth], getSubcriptionByUserIdControllers);
module.exports = router;