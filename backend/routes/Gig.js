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
    rejectGigOrderController,
    editGigOrderController,
    withdrawGigOrderController,
    shortlistGigOrderController,
    unshortlistGigOrderController
} = require('../controllers/GigControllers');
const requireAuth = require('../middleware/RequireAuth');
const requireCompletedOnboarding = require('../middleware/RequireCompletedOnboarding');
const requireVerifiedAccount = require('../middleware/RequireVerifiedAccount');
const optionalAuth = require('../middleware/OptionalAuth');

// Publicly readable endpoints (optional auth for personalization like "saved" status)
router.get('/', optionalAuth, getAllGigsController);
router.get('/:id', optionalAuth, getGigByIdController);

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

// PUT /api/gigs/:id
router.put('/:id', updateGigController);

// DELETE /api/gigs/:id
router.delete('/:id', deleteGigController);

// POST /api/gigs/:id/save
router.post('/:id/save', toggleGigSaveController);

// POST /api/gigs/:id/order
router.post('/:id/order', submitGigOrderController);

// PUT /api/gigs/orders/:orderId
router.put('/orders/:orderId', editGigOrderController);

// PUT /api/gigs/orders/:orderId/withdraw
router.put('/orders/:orderId/withdraw', withdrawGigOrderController);

// POST /api/gigs/orders/:orderId/accept
router.post('/orders/:orderId/accept', acceptGigOrderController);

// POST /api/gigs/orders/:orderId/reject
router.post('/orders/:orderId/reject', rejectGigOrderController);

// POST /api/gigs/orders/:orderId/shortlist
router.post('/orders/:orderId/shortlist', shortlistGigOrderController);

// POST /api/gigs/orders/:orderId/unshortlist
router.post('/orders/:orderId/unshortlist', unshortlistGigOrderController);

// POST /api/gigs
router.post('/', requireVerifiedAccount, createGigController);

module.exports = router;