const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const checkSession = require('../middleware/CheckSession');
const { createRateLimiter } = require('../middleware/RateLimiter');

// New tickets and appeals, per account. Replies on an existing ticket are not counted here.
const ticketCreateLimiter = createRateLimiter('ticketCreate', {
    windowMs: 60 * 60 * 1000,
    accountLimit: 15,
    anonymousLimit: 15,
    networkLimit: 300,
    message: 'You have opened several tickets in a short time. Add details to an open ticket in Cases, or try again later.',
});
// Replies on tickets, per account: plenty for a conversation, not enough to flood a support desk.
const ticketReplyLimiter = createRateLimiter('ticketReply', {
    windowMs: 10 * 60 * 1000,
    accountLimit: 40,
    anonymousLimit: 40,
    networkLimit: 600,
    message: 'You have sent a lot of replies in a short time. Wait a few minutes; support sees what you already sent.',
});
// Accepting or declining a ticket invite and rating a closed ticket.
const ticketActionLimiter = createRateLimiter('ticketAction', {
    windowMs: 10 * 60 * 1000,
    accountLimit: 30,
    anonymousLimit: 30,
    networkLimit: 600,
});
// Form pickers that look records up by name or link: enough to type with, not to scrape with.
const ticketLookupLimiter = createRateLimiter('ticketLookup', {
    windowMs: 60 * 1000,
    accountLimit: 90,
    anonymousLimit: 90,
    networkLimit: 1500,
});
// Technical-problem reports are support tickets too.
const technicalReportLimiter = createRateLimiter('technicalReport', {
    windowMs: 60 * 60 * 1000,
    accountLimit: 10,
    anonymousLimit: 10,
    networkLimit: 300,
    message: 'You have sent several problem reports in a short time. Try again later.',
});
const {
    getAllUsers,
    signup,
    getUserByEmail,
    loginCredentials,
    refreshToken,
    LogoutUsers,
    getCurrentUser,
    getMyStanding,
    CheckUserRole,
    getUsersByListOfIdsController,
    getNameByUserIdController,
    signUpSaveSessionController,
    checkVerificationCodeController,
    sendVerificationEmailController,
    updatePersonalDetailsController,
    getUserSession,
    checkUsernameUniqueness,
    forgotPasswordController,
    verifyResetTokenController,
    resetPasswordController,
    get2FAStatusController,
    setup2FAController,
    enable2FAController,
    disable2FAController,
    regenerateRecoveryCodesController,
} = require('../controllers/UserControllers');
const {
    createPublicTicket,
    listMyTickets,
    listMyDisputes,
    getMyDispute,
    getMyTicket,
    getMyCaseSummary,
    postMyTicketMessage,
    postMyTicketInvite,
    postMyTicketSatisfaction,
    getPublicTicketCatalog,
    getTicketContext,
    getTicketTeamSearch,
    getTicketItemSearch,
    createMyTechnicalReport,
} = require('../controllers/AdminTicketsControllers');
const { getMyAppealOptions } = require('../controllers/PenaltyAppealControllers');

router.get('/', [checkSession, requireAuth], getAllUsers);

router.get('/me', [checkSession],getCurrentUser);
router.get('/me/standing', [checkSession], getMyStanding);

router.post('/signup', signup);

router.post('/login', loginCredentials);

// Two-Factor Authentication routes
router.get('/2fa/status', [checkSession, requireAuth], get2FAStatusController);
router.post('/2fa/setup', [checkSession, requireAuth], setup2FAController);
router.post('/2fa/enable', [checkSession, requireAuth], enable2FAController);
router.post('/2fa/disable', [checkSession, requireAuth], disable2FAController);
router.post('/2fa/regenerate-recovery-codes', [checkSession, requireAuth], regenerateRecoveryCodesController);

router.post('/refresh-token',checkSession, refreshToken);

router.post('/logout', [checkSession, requireAuth], LogoutUsers);

router.get('/check-user-role', [checkSession, requireAuth], CheckUserRole);
router.get('/session', [checkSession, requireAuth], getUserSession);
router.post('/update-personal-details', [checkSession, requireAuth],updatePersonalDetailsController);

// Support tickets (Postgres metadata + Mongo chat)
router.get('/ticket-catalog', getPublicTicketCatalog);
router.get('/ticket-context', [checkSession, requireAuth], getTicketContext);
router.get('/ticket-teams', [checkSession, requireAuth, ticketLookupLimiter], getTicketTeamSearch);
router.get('/ticket-search', [checkSession, requireAuth, ticketLookupLimiter], getTicketItemSearch);
router.post('/tickets', [checkSession, requireAuth, ticketCreateLimiter], createPublicTicket);
router.get('/tickets', [checkSession, requireAuth], listMyTickets);
router.get('/tickets/:id', [checkSession, requireAuth], getMyTicket);
router.get('/disputes', [checkSession, requireAuth], listMyDisputes);
router.get('/disputes/:id', [checkSession, requireAuth], getMyDispute);
router.get('/cases/summary', [checkSession, requireAuth], getMyCaseSummary);
// Active penalties, each with its own appeal (banned and locked members may read it).
router.get('/appeals', [checkSession, requireAuth], getMyAppealOptions);
router.post('/tickets/:id/messages', [checkSession, requireAuth, ticketReplyLimiter], postMyTicketMessage);
router.post('/tickets/:id/invite', [checkSession, requireAuth, ticketActionLimiter], postMyTicketInvite);
router.post('/tickets/:id/satisfaction', [checkSession, requireAuth, ticketActionLimiter], postMyTicketSatisfaction);
router.post('/reports', [checkSession, requireAuth, technicalReportLimiter], createMyTechnicalReport);
router.get('/check-username', [checkSession, requireAuth], checkUsernameUniqueness);

router.get('/:email', [checkSession, requireAuth], getUserByEmail);

router.post('/list-of-details',[checkSession, requireAuth], getUsersByListOfIdsController);

router.get('/name/:userId', [checkSession, requireAuth], getNameByUserIdController);
router.post('/signup-save-session', signUpSaveSessionController);
router.post('/verify-email', checkVerificationCodeController);
router.post('/resend-verification-email', sendVerificationEmailController);
router.post('/forgot-password', forgotPasswordController);
router.get('/verify-reset-token/:token', verifyResetTokenController);
router.post('/reset-password', resetPasswordController);

module.exports = router;
