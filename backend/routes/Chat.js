const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  createDocumentationChatResponse,
  generateJobDraftResponse,
  generateProposalPitchResponse,
} = require('../controllers/ChatControllers');
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');

const router = express.Router();
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    success: false,
    message: 'Too many chatbot requests. Please wait a minute and try again.',
  }),
});

router.post('/', chatLimiter, createDocumentationChatResponse);
router.post('/generate-job', [checkSession, requireAuth, chatLimiter], generateJobDraftResponse);
router.post('/generate-proposal-pitch', [checkSession, requireAuth, chatLimiter], generateProposalPitchResponse);

module.exports = router;
