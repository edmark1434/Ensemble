const express = require('express');
const { createRateLimiter } = require('../middleware/RateLimiter');
const {
  createDocumentationChatResponse,
  generateGigDraftResponse,
  generateGigTiersResponse,
  generateJobDraftResponse,
  generateProposalPitchResponse,
  generateProposalMilestonesResponse,
  generateOrderBriefResponse,
  generateJobSkillsResponse,
  generateProfileIntroductionResponse,
} = require('../controllers/ChatControllers');
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');

const router = express.Router();
const chatLimiter = createRateLimiter('chat', {
  windowMs: 60 * 1000,
  accountLimit: 10,
  ipLimit: 20,
  message: 'Too many chatbot requests. Please wait a minute and try again.',
});

router.post('/', chatLimiter, createDocumentationChatResponse);
router.post('/generate-gig', [checkSession, requireAuth, chatLimiter], generateGigDraftResponse);
router.post('/generate-gig-tiers', [checkSession, requireAuth, chatLimiter], generateGigTiersResponse);
router.post('/generate-job', [checkSession, requireAuth, chatLimiter], generateJobDraftResponse);
router.post('/generate-proposal-pitch', [checkSession, requireAuth, chatLimiter], generateProposalPitchResponse);
router.post('/generate-order-brief', [checkSession, requireAuth, chatLimiter], generateOrderBriefResponse);
router.post('/generate-proposal-milestones', [checkSession, requireAuth, chatLimiter], generateProposalMilestonesResponse);
router.post('/generate-job-skills', [checkSession, requireAuth, chatLimiter], generateJobSkillsResponse);
router.post('/generate-profile-introduction', [checkSession, requireAuth, chatLimiter], generateProfileIntroductionResponse);

module.exports = router;
