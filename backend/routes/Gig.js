// backend/routes/Gig.js
const express = require('express');
const router = express.Router();
const { 
    createGigController, 
    getAllGigsController,
    toggleGigSaveController,
    getSavedGigsController,
    submitGigOrderController,
    getIncomingOrdersController,
    getMyOrdersController,
    getGigByIdController,
    updateGigController,
    deleteGigController
} = require('../controllers/GigControllers');
const requireAuth = require('../middleware/RequireAuth');
const requireCompletedOnboarding = require('../middleware/RequireCompletedOnboarding');

router.use(requireAuth);
router.use(requireCompletedOnboarding);

// GET /api/gigs/saved
router.get('/saved', getSavedGigsController);

// GET /api/gigs/orders/incoming
router.get('/orders/incoming', getIncomingOrdersController);

// GET /api/gigs/orders/sent
router.get('/orders/sent', getMyOrdersController);

// GET /api/gigs/:id
router.get('/:id', getGigByIdController);

// PUT /api/gigs/:id
router.put('/:id', updateGigController);

// DELETE /api/gigs/:id
router.delete('/:id', deleteGigController);

// POST /api/gigs/:id/save
router.post('/:id/save', toggleGigSaveController);

// POST /api/gigs/:id/order
router.post('/:id/order', submitGigOrderController);

// GET /api/gigs
router.get('/', getAllGigsController);

// POST /api/gigs
router.post('/', createGigController);

module.exports = router;