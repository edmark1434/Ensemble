const { isAccountVerifiedByAccountId } = require('../repositories/AccountVerificationRepositories');

const VERIFICATION_REQUIRED_MESSAGE =
    'Verify your account before posting jobs, posting gigs, or submitting proposals.';

async function requireVerifiedAccount(req, res, next) {
    const accountId = req.user?.account_id;

    if (!accountId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication is required.',
            code: 'AUTHENTICATION_REQUIRED',
        });
    }

    try {
        const isVerified = await isAccountVerifiedByAccountId(accountId);
        if (!isVerified) {
            return res.status(403).json({
                success: false,
                message: VERIFICATION_REQUIRED_MESSAGE,
                code: 'ACCOUNT_VERIFICATION_REQUIRED',
                verification_path: '/account-verification-status',
            });
        }

        return next();
    } catch (error) {
        console.error('Account verification access check failed:', error);
        return res.status(503).json({
            success: false,
            message: 'Unable to verify account status. Please try again.',
            code: 'ACCOUNT_VERIFICATION_CHECK_FAILED',
        });
    }
}

module.exports = requireVerifiedAccount;