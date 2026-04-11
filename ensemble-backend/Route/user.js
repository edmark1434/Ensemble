const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const {
    getAllUsers,
    signup,
    getUserByEmail,
    loginCredentials,
    refreshToken
} = require('../controllers/UserControllers');

router.get('/', requireAuth, getAllUsers);

router.post('/signup', signup);

router.get('/:email', requireAuth, getUserByEmail);

router.post('/login', loginCredentials);

router.post('/refresh-token', refreshToken);


module.exports = router;