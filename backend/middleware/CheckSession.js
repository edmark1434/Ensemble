const redisClient = require('../lib/Redis');

async function checkSession(req,res,next){
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
        return res.status(401).json({
            success: false,
            message: 'Session ID is required',
        });
    }
    const sessionData = await redisClient.get(`session:${sessionId}`);
    if (!sessionData) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired session',
        });
    }
    try {
        req.session = JSON.parse(sessionData);
    } catch (_err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid session payload',
        });
    }
    next();
}

module.exports = checkSession;