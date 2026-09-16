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

module.exports = router;
