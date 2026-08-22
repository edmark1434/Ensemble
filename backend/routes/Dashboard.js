const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/DashboardControllers');
const requireAuth = require('../middleware/RequireAuth');

router.use(requireAuth);

router.get('/tasks', dashboardController.getTasks);
router.get('/tasks/:contractId', dashboardController.getContractTasks);
router.post('/tasks/:contractId/milestones/:milestoneId/submit', dashboardController.submitMilestone);
router.post('/tasks/:contractId/milestones/:milestoneId/review', dashboardController.reviewMilestone);
router.post('/tasks/:contractId/milestones/:milestoneId/buy-revision', dashboardController.buyRevision);
router.post('/contract/:contractId/review', dashboardController.reviewContract);

module.exports = router;
