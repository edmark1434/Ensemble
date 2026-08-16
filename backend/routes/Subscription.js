const { getAllPlanControllers,
    getSubcriptionByUserIdControllers,
    getSubscriptionPlanDetailsByUserIdControllers,
    forceUpdateSubscriptionControllers
 } = require('../controllers/SubscriptionControllers');
const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
router.get('/plans', [], getAllPlanControllers);
router.get('/', [checkSession, requireAuth], getSubcriptionByUserIdControllers);
router.get('/plan-details', [checkSession, requireAuth], getSubscriptionPlanDetailsByUserIdControllers);
router.post('/force-update', [checkSession, requireAuth], forceUpdateSubscriptionControllers);
module.exports = router;