// backend/routes/Gig.js
const express = require('express');
const router = express.Router();
const { createGigController, getAllGigsController } = require('../controllers/GigControllers');
const requireAuth = require('../middleware/RequireAuth');
const requireCompletedOnboarding = require('../middleware/RequireCompletedOnboarding');

// All gig routes should ideally require authentication and an onboarded user
router.use(requireAuth);
router.use(requireCompletedOnboarding);

// GET /api/gigs
router.get('/', getAllGigsController);

// POST /api/gigs
router.post('/', createGigController);

module.exports = router;
