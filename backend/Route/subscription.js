const { getAllPlanControllers,
    getSubcriptionByUserIdControllers,
    getSubscriptionPlanDetailsByUserIdControllers
 } = require('../Controllers/SubscriptionControllers');
const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
router.get('/plans', [], getAllPlanControllers);
router.get('/', [checkSession, requireAuth], getSubcriptionByUserIdControllers);
router.get('/plan-details', [checkSession, requireAuth], getSubscriptionPlanDetailsByUserIdControllers);
module.exports = router;