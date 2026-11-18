const redisClient = require('../lib/Redis');

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const STAFF_VIEW_ONLY_CODE = 'STAFF_VIEW_ONLY';
const STAFF_VIEW_ONLY_MESSAGE =
    'Staff accounts can view member pages but cannot take member actions. Use the staff console instead.';

/**
 * Member-only route groups. Staff look at the member site through platform view, which is
 * view-only; staff work goes through /api/admin, /api/moderator and /api/staff.
 *
 * The frontend already blocks these writes inside platform view. This is the server-side
 * rule, so a staff account cannot post, buy, message, or move credits as a member by
 * calling the API directly. Reads stay open so staff can see what members see.
 *
 * Webhooks under /payment and /verification carry no session cookie, so they pass.
 * Under /users only member tools are listed: sign-in, 2FA, logout, token refresh and the
 * read-only list-of-details stay open for staff.
 */
const STAFF_BLOCKED_MEMBER_PREFIXES = [
    // Community, marketplace, work and money.
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
    // Buying credits or a plan; the staff account's own projects and terms templates.
    '/payment',
    '/subscription',
    '/projects',
    '/terms-of-service',
    // Member feedback, onboarding, identity checks, profile skills, and AI drafting for member posts.
    '/feedbacks',
    '/surveys',
    '/onboarding',
    '/verification',
    '/tags',
    '/chat',
    // Member support tickets, technical reports and profile edits.
    '/users/tickets',
    '/users/reports',
    '/users/update-personal-details',
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
        code: STAFF_VIEW_ONLY_CODE,
        message: STAFF_VIEW_ONLY_MESSAGE,
    });
}

module.exports = {
    rejectStaffMemberWrite,
    STAFF_BLOCKED_MEMBER_PREFIXES,
    STAFF_VIEW_ONLY_CODE,
    STAFF_VIEW_ONLY_MESSAGE,
};
