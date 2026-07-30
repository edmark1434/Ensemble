const router = require('express').Router();
const { createTicketController
 } = require('../Controllers/TicketControllers');
const checkSession = require('../middleware/checkSession');
const requireAuth = require('../middleware/requireAuth');
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each IP to 100 requests per window
  standardHeaders: true,    // return rate limit info in RateLimit-* headers
  legacyHeaders: false,     // disable X-RateLimit-* headers
  message: "Too many requests, please try again later.",
});

router.post('/', [checkSession, requireAuth, limiter], createTicketController);
module.exports = router;
