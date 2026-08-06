const express = require('express');
const router = express.Router();
const ContractControllers = require('../Controllers/ContractControllers');
const requireAuth = require('../middleware/requireAuth'); 

// Get user's contracts
router.get('/', requireAuth, ContractControllers.getContractsController);

// Create a new job offer (Client action)
router.post('/job-offer', requireAuth, ContractControllers.sendJobOfferController);

// Accept a job offer (Applicant action)
router.post('/:contractId/accept', requireAuth, ContractControllers.acceptJobOfferController);

// Reject a job offer (Applicant action)
router.post('/:contractId/reject', requireAuth, ContractControllers.rejectJobOfferController);

module.exports = router;
