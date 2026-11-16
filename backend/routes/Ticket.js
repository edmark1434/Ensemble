const router = require('express').Router();
const { createTicketController
 } = require('../controllers/TicketControllers');
const checkSession = require('../middleware/CheckSession');
const requireAuth = require('../middleware/RequireAuth');
const { createRateLimiter } = require('../middleware/RateLimiter');
const limiter = createRateLimiter('ticketCreate', {
  windowMs: 15 * 60 * 1000,
  accountLimit: 100,
  ipLimit: 100,
  message: 'Too many requests, please try again later.',
});

router.post('/', [checkSession, requireAuth, limiter], createTicketController);
module.exports = router;
