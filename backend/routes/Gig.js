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
    getOrderByIdController,
    getGigByIdController,
    updateGigController,
    deleteGigController,
    acceptGigOrderController,
    rejectGigOrderController
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

// GET /api/gigs/orders/:orderId
router.get('/orders/:orderId', getOrderByIdController);

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

// POST /api/gigs/orders/:orderId/accept
router.post('/orders/:orderId/accept', acceptGigOrderController);

// POST /api/gigs/orders/:orderId/reject
router.post('/orders/:orderId/reject', rejectGigOrderController);

// GET /api/gigs
router.get('/', getAllGigsController);

// POST /api/gigs
router.post('/', createGigController);

module.exports = router;