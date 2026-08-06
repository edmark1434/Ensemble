const redisClient = require('../lib/Redis');

/** Attach session when present; continue without auth if missing/invalid. */
async function optionalSession(req, _res, next) {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) {
    req.session = null;
    return next();
  }
  try {
    const sessionData = await redisClient.get(`session:${sessionId}`);
    req.session = sessionData ? JSON.parse(sessionData) : null;
  } catch (_err) {
    req.session = null;
  }
  next();
}

module.exports = optionalSession;
