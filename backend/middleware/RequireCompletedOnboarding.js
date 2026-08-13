const redisClient = require('../lib/Redis');
const { getOnboardingCompletion } = require('../repositories/OnboardingRepositories');
const { getOnboardingState } = require('../services/OnboardingServices');

const ALLOWED_PATHS = [
    /^\/onboarding(?:\/|$)/,
    /^\/users\/(?:me|session|logout|refresh-token|login|signup|verify-email|resend-verification-email|signup-save-session)(?:\/|$)/,
    /^\/files\/(?:profile-presets|upload-url)(?:\/|$)/,
    /^\/(?:countries|places)$/,
];

async function requireCompletedOnboarding(req, res, next) {
    if (ALLOWED_PATHS.some((pattern) => pattern.test(req.path))) return next();
    let decodedPath = req.path;
    try { decodedPath = decodeURIComponent(req.path); } catch { /* malformed paths remain protected */ }
    if (req.method === 'GET' && decodedPath === '/surveys/User Onboarding Survey') return next();
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) return next();
    try {
        const raw = await redisClient.get(`session:${sessionId}`);
        if (!raw) return next();
        const session = JSON.parse(raw);
        if (session.type !== 'User' || !session.userId) return next();
        if ((await getOnboardingCompletion(session.userId)) === 'completed') return next();
        const state = await getOnboardingState(session.userId);
        return res.status(403).json({ success: false, message: 'Complete onboarding to access this feature.', code: 'ONBOARDING_REQUIRED', current_step: state.current_step, path: state.path });
    } catch (error) {
        console.error('Onboarding access check failed:', error);
        return res.status(503).json({ success: false, message: 'Unable to verify onboarding status.', code: 'ONBOARDING_CHECK_FAILED' });
    }
}

module.exports = requireCompletedOnboarding;
