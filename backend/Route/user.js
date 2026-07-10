const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const checkSession = require('../middleware/checkSession');
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
    getUserSession
} = require('../controllers/UserControllers');

router.get('/', [checkSession, requireAuth], getAllUsers);

router.get('/me', [checkSession],getCurrentUser);

router.post('/signup', signup);

router.post('/login', loginCredentials);

router.post('/refresh-token',checkSession, refreshToken);

router.get('/logout', [requireAuth], LogoutUsers);

router.get('/check-user-role', [checkSession, requireAuth], CheckUserRole);
router.get('/session', [checkSession, requireAuth], getUserSession);
router.post('/update-personal-details', [checkSession, requireAuth],updatePersonalDetailsController);

router.get('/:email', [checkSession, requireAuth], getUserByEmail);

router.post('/list-of-details',[checkSession, requireAuth], getUsersByListOfIdsController);

router.get('/name/:userId', [checkSession, requireAuth], getNameByUserIdController);

router.post('/signup-save-session', signUpSaveSessionController);
router.post('/verify-email', checkVerificationCodeController);
router.post('/resend-verification-email', sendVerificationEmailController);

module.exports = router;