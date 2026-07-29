const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const checkSession = require('../middleware/checkSession');
const optionalSession = require('../middleware/optionalSession');
const {
    getAllUsers,
    signup,
    getUserByEmail,
    loginCredentials,
    refreshToken,
    LogoutUsers,
    getCurrentUser,
    CheckUserRole,
    getUsersByListOfIdsController,
    getNameByUserIdController,
    signUpSaveSessionController,
    checkVerificationCodeController,
    sendVerificationEmailController,
    updatePersonalDetailsController,
    getUserSession,
    checkUsernameUniqueness
} = require('../controllers/UserControllers');
const {
    createPublicTicket,
    listMyTickets,
    getMyTicket,
    postMyTicketMessage,
} = require('../Controllers/AdminTicketsControllers');

router.get('/', [checkSession, requireAuth], getAllUsers);

router.get('/me', [checkSession],getCurrentUser);

router.post('/signup', signup);

router.post('/login', loginCredentials);

router.post('/refresh-token',checkSession, refreshToken);

router.get('/logout', [requireAuth], LogoutUsers);

router.get('/check-user-role', [checkSession, requireAuth], CheckUserRole);
router.get('/session', [checkSession, requireAuth], getUserSession);
router.post('/update-personal-details', [checkSession, requireAuth],updatePersonalDetailsController);

// Support tickets (Postgres metadata + Mongo chat)
router.post('/tickets', [optionalSession], createPublicTicket);
router.get('/tickets', [checkSession, requireAuth], listMyTickets);
router.get('/tickets/:id', [checkSession, requireAuth], getMyTicket);
router.post('/tickets/:id/messages', [checkSession, requireAuth], postMyTicketMessage);
router.get('/check-username', [checkSession, requireAuth], checkUsernameUniqueness);

router.get('/:email', [checkSession, requireAuth], getUserByEmail);

router.post('/list-of-details',[checkSession, requireAuth], getUsersByListOfIdsController);

router.get('/name/:userId', [checkSession, requireAuth], getNameByUserIdController);
router.post('/signup-save-session', signUpSaveSessionController);
router.post('/verify-email', checkVerificationCodeController);
router.post('/resend-verification-email', sendVerificationEmailController);

module.exports = router;
