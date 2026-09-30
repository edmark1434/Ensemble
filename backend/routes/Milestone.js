const express = require('express');
const router = express.Router({ mergeParams: true });
const MilestoneControllers = require('../controllers/MilestoneControllers');
const requireAuth = require('../middleware/RequireAuth');

// All routes are mounted under /api/contracts/:contractId/milestones

// Client cancels an overdue/stalled milestone → credits refunded
router.post('/:milestoneId/cancel', requireAuth, MilestoneControllers.cancelMilestoneController);

// Client extends the deadline on an overdue/stalled milestone
router.post('/:milestoneId/extend', requireAuth, MilestoneControllers.extendMilestoneController);

// Client approves a submission → credits released to freelancer
router.post('/:milestoneId/approve', requireAuth, MilestoneControllers.approveMilestoneController);

// Client requests a revision on the current submission
router.post('/:milestoneId/revision', requireAuth, MilestoneControllers.requestRevisionController);

module.exports = router;
