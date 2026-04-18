const express = require('express');
const router = express.Router();
const {requireAuth} = require('../middleware/requireAuth');
const checkSession = require('../middleware/checkSession');
const {
    getAllUsers,
    signup,
    getUserByEmail,
    loginCredentials,
    refreshToken,
    LogoutUsers
} = require('../controllers/UserControllers');

router.get('/', [checkSession, requireAuth], getAllUsers);

router.post('/signup', signup);

router.get('/:email', [checkSession, requireAuth], getUserByEmail);

router.post('/login', loginCredentials);

router.post('/refresh-token',checkSession, refreshToken);

router.get('/logout', [checkSession, requireAuth], LogoutUsers);


module.exports = router;