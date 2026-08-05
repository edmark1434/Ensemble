const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
const {
    getCreditTransactionsController,
} = require('../Controllers/TransactionControllers');

router.get('/credits', [checkSession, requireAuth], getCreditTransactionsController);

module.exports = router;
