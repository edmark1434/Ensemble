const express = require('express');
const router = express.Router();
const userRoutes = require('./user');
const staffRoutes = require('./staff');

router.use('/staff', staffRoutes);
router.use('/users', userRoutes);
module.exports = router;

