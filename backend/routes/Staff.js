const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const { checkStaffRole } = require('../controllers/StaffControllers');

router.get('/check-staff-role', [checkSession, requireAuth], checkStaffRole);


module.exports = router;