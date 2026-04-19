const router = require('express').Router();
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
const { checkStaffRole } = require('../controllers/StaffControllers');

router.get('/check-staff-role', [checkSession, requireAuth], checkStaffRole);


module.exports = router;