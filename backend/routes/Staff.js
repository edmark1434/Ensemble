const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const { checkStaffRole } = require('../controllers/StaffControllers');
const {
  getTicketParticipantSearch,
  postTicketParticipant,
  deleteTicketParticipant,
  postTicketTranscript,
  postTicketScheduleClose,
  deleteTicketScheduleClose,
} = require('../controllers/AdminTicketsControllers');

function requireAnyStaff(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ success: false, message: 'Session is required' });
  }
  if (req.session.type !== 'Staff') {
    return res.status(403).json({ success: false, message: 'Forbidden: Staff role required' });
  }
  return next();
}

router.get('/check-staff-role', [checkSession, requireAuth], checkStaffRole);
router.get('/tickets/people', [checkSession, requireAnyStaff], getTicketParticipantSearch);
router.post('/tickets/:id/participants', [checkSession, requireAnyStaff], postTicketParticipant);
router.post('/tickets/:id/transcript', [checkSession, requireAnyStaff], postTicketTranscript);
router.post('/tickets/:id/schedule-close', [checkSession, requireAnyStaff], postTicketScheduleClose);
router.delete('/tickets/:id/schedule-close', [checkSession, requireAnyStaff], deleteTicketScheduleClose);
router.delete('/tickets/:id/participants/:accountId', [checkSession, requireAnyStaff], deleteTicketParticipant);

module.exports = router;