const express = require('express');
const router = express.Router();
const userRoutes = require('./user');
const staffRoutes = require('./staff');
const forumRoutes = require('./forum');
const adminRoutes = require('./admin');
const accountRoutes = require('./account');
const tagRoutes = require('./Tag');
const inboxRoutes = require('./inbox');
const paymentRoutes = require('./payment');

router.use('/inbox', inboxRoutes);
router.use('/payment', paymentRoutes);
router.use('/forum', forumRoutes);
router.use('/admin', adminRoutes);
router.use('/staff', staffRoutes);
router.use('/users', userRoutes);
router.use('/accounts', accountRoutes);
router.use('/tags', tagRoutes);
module.exports = router;

