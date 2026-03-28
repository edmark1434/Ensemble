const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    signup,
    getUserByEmail,
    loginCredentials,
} = require('../controllers/UserControllers');

router.get('/', getAllUsers);

router.post('/signup', signup);

router.get('/:email', getUserByEmail);

router.post('/login', loginCredentials);


module.exports = router;