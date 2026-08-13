const express = require('express');
const router = express.Router();
const googleMeetRoutes = require('./GoogleMeet');
const userRoutes = require('./User');
const staffRoutes = require('./Staff');
const forumRoutes = require('./Forum');
const adminRoutes = require('./Admin');
const moderatorRoutes = require('./Moderator');
const accountRoutes = require('./Account');
const tagRoutes = require('./Tag');
const inboxRoutes = require('./Inbox');
const paymentRoutes = require('./Payment');
const subscriptionRoutes = require('./Subscription');
const surveyRoutes = require('./Survey');
const fileRoutes = require('./File');
const verificationRoutes = require('./Verification');
const ticketRoutes = require('./Ticket');
const notificationRoutes = require('./Notification');
const jobRoutes = require('./Job');
const termsRoutes = require('./Terms');
const transactionRoutes = require('./Transaction');
const teamRoutes = require('./Teams');
const contractRoutes = require('./Contract');
const dashboardRoutes = require('./Dashboard');
const cashoutRoutes = require('./Cashout');
const onboardingRoutes = require('./Onboarding');
const requireCompletedOnboarding = require('../middleware/RequireCompletedOnboarding');
const checkSession = require('../middleware/CheckSession');
const { issueCsrfToken } = require('../middleware/CsrfProtection');
const { getAllCountriesController,
    getAllPlacesController
} = require('../controllers/SystemControllers')

router.get('/csrf-token', checkSession, issueCsrfToken);
router.use(requireCompletedOnboarding);
router.use('/onboarding', onboardingRoutes);
router.use('/inbox', inboxRoutes);
router.use('/google-meet', googleMeetRoutes);
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
router.use('/contracts', contractRoutes);
router.use('/terms-of-service', termsRoutes);
router.use('/transactions', transactionRoutes);
router.use('/teams', teamRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/cashouts', cashoutRoutes);

router.get('/countries', getAllCountriesController);
router.get('/places', getAllPlacesController);
module.exports = router;

