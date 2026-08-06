const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const {
    getCreditTransactionsController,
} = require('../controllers/TransactionControllers');

router.get('/credits', [checkSession, requireAuth], getCreditTransactionsController);

module.exports = router;
