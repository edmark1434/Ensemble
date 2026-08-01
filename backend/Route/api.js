const express = require('express');
const router = express.Router();
const userRoutes = require('./user');
const staffRoutes = require('./staff');
const forumRoutes = require('./forum');
const adminRoutes = require('./admin');
const moderatorRoutes = require('./moderator');
const accountRoutes = require('./account');
const tagRoutes = require('./Tag');
const inboxRoutes = require('./inbox');
const paymentRoutes = require('./payment');
const subscriptionRoutes = require('./subscription');
const surveyRoutes = require('./survey');
const fileRoutes = require('./file');
const verificationRoutes = require('./verification');
const ticketRoutes = require('./ticket');
const notificationRoutes = require('./notification');
const jobRoutes = require('./job');
const { getAllCountriesController,
    getAllPlacesController
} = require('../Controllers/SystemControllers')

router.use('/inbox', inboxRoutes);
router.use('/payment', paymentRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/forum', forumRoutes);
router.use('/admin', adminRoutes);
router.use('/moderator', moderatorRoutes);
router.use('/staff', staffRoutes);
router.use('/users', userRoutes);
router.use('/accounts', accountRoutes);
router.use('/tags', tagRoutes);
router.use('/files', fileRoutes);
router.use('/surveys', surveyRoutes);
router.use('/verification', verificationRoutes);
router.use('/tickets', ticketRoutes);
router.use('/notifications', notificationRoutes);
router.use('/jobs', jobRoutes);
router.get('/countries', getAllCountriesController);
router.get('/places', getAllPlacesController);
module.exports = router;

