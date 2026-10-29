const redisClient = require('../lib/Redis');
const { getSectionValue } = require('../repositories/AdminSettingsRepositories');
const { rejectRestrictedAccount, rejectSuspendedWrite, rejectForumTimeout } = require('../lib/AccountRestriction');

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
        if (await rejectRestrictedAccount(req, res)) return;
        if (rejectSuspendedWrite(req, res)) return;
        if (rejectForumTimeout(req, res)) return;
        // Refresh session expiration asynchronously
        getSectionValue('platform')
            .then((platform) => {
                const days = Number(platform?.sessionTimeoutDays ?? (platform?.sessionTimeoutMinutes ? platform.sessionTimeoutMinutes / 1440 : 30));
                const seconds = Number.isFinite(days) && days > 0 ? Math.floor(days * 86400) : 30 * 86400;
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
