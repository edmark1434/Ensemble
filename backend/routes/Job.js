// backend/routes/job.js
const router = require('express').Router();
const {
    createJobController,
    getAllJobsController,
    updateJobController,
    createProposalController,
    getProposalsByJobController,
    getSentProposalsController,
    getProposalByIdController,
    withdrawProposalController,
    updateProposalStatusController,
    getTermsOfServiceController,
    toggleJobSaveController,
    deleteJobController
} = require('../controllers/JobControllers');

const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const requireVerifiedAccount = require('../middleware/RequireVerifiedAccount');
const optionalAuth = require('../middleware/OptionalAuth');

// Terms of service
router.get('/tos', getTermsOfServiceController);

// Jobs
router.get('/', optionalAuth, getAllJobsController);
router.post('/', [checkSession, requireAuth, requireVerifiedAccount], createJobController);
router.put('/:jobId', [checkSession, requireAuth], updateJobController);
router.post('/:jobId/save', [checkSession, requireAuth], toggleJobSaveController);
router.delete('/:jobId', [checkSession, requireAuth], deleteJobController);

// Proposals
router.get('/proposals/sent', [checkSession, requireAuth], getSentProposalsController);
router.post('/:jobId/proposals', [checkSession, requireAuth, requireVerifiedAccount], createProposalController);
router.get('/:jobId/proposals', [checkSession, requireAuth], getProposalsByJobController);
router.get('/proposals/:proposalId', [checkSession, requireAuth], getProposalByIdController);
router.delete('/proposals/:proposalId', [checkSession, requireAuth], withdrawProposalController);
router.put('/proposals/:proposalId/status', [checkSession, requireAuth], updateProposalStatusController);

module.exports = router;
