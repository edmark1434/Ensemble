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
    CheckUserRole
} = require('../controllers/UserControllers');

router.get('/', [checkSession, requireAuth], getAllUsers);

router.get('/me', [checkSession],getCurrentUser);

router.post('/signup', signup);

router.post('/login', loginCredentials);

router.post('/refresh-token',checkSession, refreshToken);

router.get('/logout', [requireAuth], LogoutUsers);

router.get('/check-user-role', [checkSession, requireAuth], CheckUserRole);

router.get('/:email', [checkSession, requireAuth], getUserByEmail);

module.exports = router;