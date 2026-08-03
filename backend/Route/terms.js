const express = require('express');
const router = express.Router();
const TermsControllers = require('../Controllers/TermsControllers');
const optionalAuth = require('../middleware/optionalAuth');
const requireAuth = require('../middleware/requireAuth');

router.get('/', requireAuth, TermsControllers.getAllTermsController);
router.post('/', requireAuth, TermsControllers.createTermsController);
router.put('/:id', requireAuth, TermsControllers.updateTermsController);
router.delete('/:id', requireAuth, TermsControllers.deleteTermsController);

module.exports = router;
