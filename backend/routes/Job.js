// backend/routes/job.js
const router = require('express').Router();
const {
    createJobController,
    getAllJobsController,
    getJobByIdController,
    updateJobController,
    createProposalController,
    getProposalsByJobController,
    getSentProposalsController,
    getProposalByIdController,
    withdrawProposalController,
    updateProposalStatusController,
    getTermsOfServiceController,
    toggleJobSaveController,
    deleteJobController,
    getActiveJobsByClientController,
    createJobInvitationController
} = require('../controllers/JobControllers');

const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const optionalAuth = require('../middleware/OptionalAuth');
const optionalSession = require('../middleware/OptionalSession');


// Job Invitations
router.get('/my-active-jobs', [checkSession, requireAuth], getActiveJobsByClientController);
router.post('/invite', [checkSession, requireAuth], createJobInvitationController);

// Terms of service
router.get('/tos', getTermsOfServiceController);

// Jobs
router.get('/', [optionalSession, optionalAuth], getAllJobsController);
router.post('/', [checkSession, requireAuth], createJobController);
router.put('/:jobId', [checkSession, requireAuth], updateJobController);
router.post('/:jobId/save', [checkSession, requireAuth], toggleJobSaveController);
router.delete('/:jobId', [checkSession, requireAuth], deleteJobController);

// Proposals
router.get('/proposals/sent', [checkSession, requireAuth], getSentProposalsController);
router.post('/:jobId/proposals', [checkSession, requireAuth], createProposalController);
router.get('/:jobId/proposals', [checkSession, requireAuth], getProposalsByJobController);
router.get('/proposals/:proposalId', [checkSession, requireAuth], getProposalByIdController);
router.delete('/proposals/:proposalId', [checkSession, requireAuth], withdrawProposalController);
router.put('/proposals/:proposalId/status', [checkSession, requireAuth], updateProposalStatusController);

// Single Job
router.get('/:jobId', [optionalSession, optionalAuth], getJobByIdController);

module.exports = router;
