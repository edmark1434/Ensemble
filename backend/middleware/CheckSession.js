const redisClient = require('../lib/Redis');
const { getSectionValue } = require('../repositories/AdminSettingsRepositories');

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
        // Refresh session expiration asynchronously
        getSectionValue('platform')
            .then((platform) => {
                const minutes = Number(platform?.sessionTimeoutMinutes);
                const seconds = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes * 60) : 3600;
                return redisClient.expire(`session:${sessionId}`, seconds);
            })
            .catch(() => {});
    } catch (_err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid session payload',
        });
    }
    next();
}

module.exports = checkSession;