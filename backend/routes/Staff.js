const router = require('express').Router();
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const { checkStaffRole } = require('../controllers/StaffControllers');
const {
  getTicketParticipantSearch,
  createStaffTicket,
  postTicketParticipant,
  deleteTicketParticipant,
  postTicketTranscript,
  postTicketScheduleClose,
  deleteTicketScheduleClose,
  postTicketAppealDecision,
  requireTicketInStaffQueue,
} = require('../controllers/AdminTicketsControllers');
const { getStaffAppealOptions } = require('../controllers/PenaltyAppealControllers');
const requireStaffRole = require('../middleware/RequireStaffRole');
const { createRateLimiter } = require('../middleware/RateLimiter');
const PlatformViewModeration = require('../controllers/PlatformViewModerationControllers');

/** Every role with User & Team access may moderate from platform view; the service applies each role's limits. */
const requirePlatformViewModeration = requireStaffRole([
  'Admin',
  'Support Moderator',
  'Forum Moderator',
  'Marketplace Moderator',
  'Jobs N Gigs Moderator',
]);
// Quick actions are one click away, so a stolen or careless staff session cannot fire a
// burst of penalties: 20 a minute is far above a real moderator's pace.
const platformViewActionLimiter = createRateLimiter('platformViewAction', {
  windowMs: 60 * 1000,
  accountLimit: 20,
  anonymousLimit: 5,
  networkLimit: 120,
  message: 'Too many quick actions in a minute. Wait a moment, then review the page again.',
});

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
// Console heartbeat: `checkSession` records staff presence; this only keeps idle open tabs online.
router.get('/presence/heartbeat', [checkSession, requireAnyStaff], (_req, res) => res.status(200).json({ success: true }));
router.get('/tickets/people', [checkSession, requireAnyStaff], getTicketParticipantSearch);
router.post('/tickets', [checkSession, requireAnyStaff], createStaffTicket);
// A member's penalties, so staff opening an appeal for them can pick which one it is about.
router.get('/tickets/appeal-options/:accountId', [checkSession, requireAnyStaff], getStaffAppealOptions);
// Specialist moderators may only act on tickets in their own desk's queue.
const ticketInQueue = [checkSession, requireAnyStaff, requireTicketInStaffQueue];
router.post('/tickets/:id/participants', ticketInQueue, postTicketParticipant);
router.post('/tickets/:id/transcript', ticketInQueue, postTicketTranscript);
router.post('/tickets/:id/schedule-close', ticketInQueue, postTicketScheduleClose);
router.post('/tickets/:id/appeal-decision', ticketInQueue, postTicketAppealDecision);
router.delete('/tickets/:id/schedule-close', ticketInQueue, deleteTicketScheduleClose);
router.delete('/tickets/:id/participants/:accountId', ticketInQueue, deleteTicketParticipant);

// Platform view moderation: the console asks what the framed member page is about, then acts.
router.get('/platform-view/context', [checkSession, requirePlatformViewModeration], PlatformViewModeration.getContext);
router.post(
  '/platform-view/actions',
  [checkSession, requirePlatformViewModeration, platformViewActionLimiter],
  PlatformViewModeration.postAction
);

module.exports = router;