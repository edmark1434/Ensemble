const redisClient = require('../lib/Redis');

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Member-only route groups (forum posting, marketplace, jobs and gigs, teams, contracts,
 * wallets, messaging). Staff look at the member site through platform view, which is
 * view-only; staff work goes through /api/admin, /api/moderator and /api/staff.
 *
 * The frontend already blocks these writes inside platform view. This is the server-side
 * rule, so a staff account cannot post, buy, message, or move credits as a member by
 * calling the API directly. Reads stay open so staff can see what members see.
 */
const STAFF_BLOCKED_MEMBER_PREFIXES = [
    '/forum',
    '/inbox',
    '/accounts',
    '/jobs',
    '/gigs',
    '/assets',
    '/teams',
    '/team-projects',
    '/contracts',
    '/dashboard',
    '/cashouts',
    '/google-meet',
];

async function rejectStaffMemberWrite(req, res, next) {
    if (READ_METHODS.has(req.method)) return next();
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) return next();
    let session;
    try {
        const raw = await redisClient.get(`session:${sessionId}`);
        session = raw ? JSON.parse(raw) : null;
    } catch (error) {
        // checkSession on the route reads the same session and answers for a broken store.
        console.error('Staff member-write check failed:', error.message);
        return next();
    }
    if (session?.type !== 'Staff') return next();
    return res.status(403).json({
        success: false,
        code: 'STAFF_VIEW_ONLY',
        message: 'Staff accounts can view member pages but cannot take member actions. Use the staff console instead.',
    });
}

module.exports = { rejectStaffMemberWrite, STAFF_BLOCKED_MEMBER_PREFIXES };
