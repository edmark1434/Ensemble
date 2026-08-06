const express = require('express');
const router = express.Router();
const TermsControllers = require('../controllers/TermsControllers');
const optionalAuth = require('../middleware/OptionalAuth');
const requireAuth = require('../middleware/RequireAuth');

router.get('/', requireAuth, TermsControllers.getAllTermsController);
router.post('/', requireAuth, TermsControllers.createTermsController);
router.put('/:id', requireAuth, TermsControllers.updateTermsController);
router.delete('/:id', requireAuth, TermsControllers.deleteTermsController);

module.exports = router;
