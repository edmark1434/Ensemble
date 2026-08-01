const router = require('express').Router();

const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
const { getJobs } = require('../Controllers/JobControllers');
router.get('/', [checkSession, requireAuth], getJobs);
module.exports = router;