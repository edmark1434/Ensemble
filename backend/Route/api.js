const express = require('express');
const router = express.Router();
const userRoutes = require('./user');
const staffRoutes = require('./staff');
const forumRoutes = require('./forum');
const adminRoutes = require('./admin');

router.use('/forum', forumRoutes);
router.use('/admin', adminRoutes);
router.use('/staff', staffRoutes);
router.use('/users', userRoutes);
module.exports = router;

