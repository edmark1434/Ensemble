const express = require('express');
const router = express.Router();
const ContractControllers = require('../controllers/ContractControllers');
const requireAuth = require('../middleware/RequireAuth'); 

// Get user's contracts
router.get('/', requireAuth, ContractControllers.getContractsController);

// Create a new job offer (Client action)
router.post('/job-offer', requireAuth, ContractControllers.sendJobOfferController);

// Accept a job offer (Applicant action)
router.post('/:contractId/accept', requireAuth, ContractControllers.acceptJobOfferController);

// Reject a job offer (Applicant action)
router.post('/:contractId/reject', requireAuth, ContractControllers.rejectJobOfferController);

// Submit a dispute for a contract
router.post('/:contractId/dispute', requireAuth, ContractControllers.createContractDisputeController);

// Extend contract deadline (Client action)
router.post('/:contractId/extend', requireAuth, ContractControllers.extendContractDeadlineController);

// Cancel contract and refund unfinished milestones (Direct/Legacy action)
router.post('/:contractId/cancel', requireAuth, ContractControllers.cancelContractController);

// Mutual Cancellation Requests (Client & Freelancer)
router.get('/:contractId/cancellation-request', requireAuth, ContractControllers.getCancellationRequestController);
router.post('/:contractId/cancellation-request', requireAuth, ContractControllers.createCancellationRequestController);
router.post('/:contractId/cancellation-request/:requestId/respond', requireAuth, ContractControllers.respondCancellationRequestController);
router.post('/:contractId/cancellation-request/:requestId/withdraw', requireAuth, ContractControllers.withdrawCancellationRequestController);

module.exports = router;
