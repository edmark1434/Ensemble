const router = require('express').Router();
const controller = require('../controllers/TeamProjectControllers');
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');

router.use(checkSession, requireAuth);

router.get('/:id', controller.getDetails);
router.patch('/:id', controller.updateProject);
router.delete('/:id', controller.deleteProject);

router.get('/:id/taskboard', controller.getTaskboard);
router.post('/:id/tasks', controller.createTask);
router.patch('/:id/tasks/:taskId', controller.updateTask);
router.delete('/:id/tasks/:taskId', controller.deleteTask);

router.get('/:id/contracts', controller.getContracts);
router.get('/:id/milestones', controller.getMilestones);
router.get('/:id/history', controller.getHistory);
router.get('/:id/members', controller.getMembers);

router.get('/:id/subcontracts/proposals', controller.getSubcontractProposals);
router.post('/:id/subcontracts/proposals', controller.createSubcontractProposal);
router.post('/:id/subcontracts/proposals/:proposalId/decision', controller.decideSubcontractProposal);
router.delete('/:id/subcontracts/proposals/:proposalId', controller.withdrawSubcontractProposal);

router.post('/:id/report', controller.reportProject);
router.post('/:id/chat', controller.getChat);

module.exports = router;
