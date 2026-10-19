const {
    ServiceError,
    fetchAllUsers,
    findUserByEmail,
    registerUser,
    LoginUserOrEmail,
    AccessTokens,
    RefreshTokens,
    createSessionId,
    logout,
    getCredentials,
    getUsersByListOfIdsServices,
    getNameByUserIdServices,
    signUpSaveSession,
    checkVerificationCode,
    sendVerificationEmailServices,
    getAllCountries,
    updatePersonalDetails,
    isUsernameUnique,
    requestPasswordReset,
    verifyResetToken,
    resetPasswordWithToken
} = require('../services/UserServices');
const { getUserOnboardingStep } = require('../repositories/UserRepositories');
const { getAccountAccess, clearAuthSession } = require('../lib/AccountRestriction');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const redis = require('../lib/Redis');
dotenv.config();

function setAccessTokenCookie(res, accessToken) {
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        maxAge: 60 * 60 * 1000, // 1 hour
    });
}
async function getAllUsers(req, res) {
    try {
        const users = await fetchAllUsers();
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getUsersByListOfIdsController(req, res) { 
    const userIds = req.body.userIds;
    try {
        const usersList = await getUsersByListOfIdsServices(userIds);
        res.status(200).json({usersList,message: 'Users fetched successfully'});
    } catch (err) {
        console.error('Error fetching users by list of IDs:', err);
        if(err instanceof ServiceError){
            return res.status(err.statusCode).json({ error: err.message });
        }
        res.status(500).json({ error: 'Internal server error'});
    }
}

async function setupRefreshTokenCookie(res,result){
        res.cookie(
            'refreshToken',
            await RefreshTokens({ email: result.email}),
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
            }
        );
}

async function createSessionIdCookie(res,credentials){
    const sessionId = await createSessionId(credentials);
    res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    });
}
async function signup(req, res) {
    try {
        const result = await registerUser(req.body);
        const statusCode = result.user ? 201 : 200;
        const credentials = { ...(result.credentials || {}) };
        const restriction = credentials.restriction || null;
        delete credentials.restriction;
        await Promise.all([
            setupRefreshTokenCookie(res, credentials),
            createSessionIdCookie(res, credentials)
        ]);
        const accessToken = await AccessTokens(credentials);
        setAccessTokenCookie(res, accessToken);
        const publicCredentials = { ...credentials, restriction };
        return res.status(statusCode).json({
            success: result.success,
            message: result.message || 'User and account created successfully',
            credentials: publicCredentials,
            result: publicCredentials,
        });
        
    } catch (err) {
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                code: err.code || err.details?.code || null,
                restriction: err.details?.blocked ? err.details : null,
            });
        }

        console.error('Error creating user:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function getUserByEmail(req, res) {
    try {
        const user = await findUserByEmail(req.params.email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        res.json({
            success: true,
            user,
        });
    } catch (err) {
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
            });
        }

        console.error('Error fetching user by email:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function loginCredentials(req, res) {
    const { loginIdentifier, email, username, password, twoFactorCode, recoveryCode, twoFactorPendingToken } = req.body;
    const resolvedIdentifier = loginIdentifier ?? email ?? username;
    const requestContext = {
        ip: req.ip,
        userAgent: req.get('user-agent') || 'unknown',
    };

    try {
        let credentials;
        const submitted2fa = twoFactorCode || recoveryCode || req.body.code;

        // If resuming a pending 2FA login challenge with the pending token
        if (twoFactorPendingToken && submitted2fa && !password) {
            const rawPending = await redis.get(`pending_login_2fa:${twoFactorPendingToken}`);
            if (!rawPending) {
                return res.status(401).json({
                    success: false,
                    require2fa: true,
                    message: 'Two-factor authentication session expired. Please sign in again.',
                });
            }
            credentials = JSON.parse(rawPending);
        } else {
            if (!resolvedIdentifier || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Login identifier and password are required',
                });
            }

            credentials = await LoginUserOrEmail(resolvedIdentifier, password, requestContext);
            if (credentials.existSession) {
                return res.status(200).json({
                    success: true,
                    message: 'Need to verify email before logging in',
                    credentials,
                    existSession: true,
                });
            }
        }

        // Check if account has 2FA enabled
        const accountId = credentials.account_id || credentials.accountId;
        const { getAuthenticationSecret } = require('../repositories/AccountRepositories');
        const twoFactorSecret = await getAuthenticationSecret(accountId);

        if (twoFactorSecret) {
            if (!submitted2fa) {
                const crypto = require('crypto');
                const pendingToken = crypto.randomBytes(32).toString('hex');
                // Store pending credentials in Redis for 5 minutes
                await redis.set(`pending_login_2fa:${pendingToken}`, JSON.stringify(credentials), { EX: 5 * 60 });
                return res.status(200).json({
                    success: true,
                    require2fa: true,
                    twoFactorPendingToken: pendingToken,
                    message: 'Two-factor authentication code required',
                });
            }

            // Verify the 2FA code or recovery code
            const { verify2FACodeOrRecoveryService } = require('../services/AccountServices');
            const verification = await verify2FACodeOrRecoveryService(accountId, submitted2fa);
            if (!verification.verified) {
                return res.status(401).json({
                    success: false,
                    require2fa: true,
                    twoFactorPendingToken: twoFactorPendingToken || null,
                    message: verification.error || 'Invalid two-factor code or recovery code',
                });
            }

            if (twoFactorPendingToken) {
                await redis.del(`pending_login_2fa:${twoFactorPendingToken}`).catch(() => null);
            }
        }

        // Check if staff 2FA is dynamically required
        if (credentials.type === 'Staff') {
            const { getSecuritySettings } = require('../lib/ModerationPolicy');
            const security = await getSecuritySettings();
            if (security?.requireStaff2fa && !twoFactorSecret) {
                const staffEmail = (credentials.email_address || credentials.email || '').toLowerCase();
                const expected2fa = await redis.get(`staff2fa:${staffEmail}`);
                if (!submitted2fa) {
                    const crypto = require('crypto');
                    const code = crypto.randomInt(100000, 999999).toString();
                    await redis.set(`staff2fa:${staffEmail}`, code, { EX: 10 * 60 });
                    return res.status(200).json({
                        success: true,
                        require2fa: true,
                        message: 'Two-factor authentication code required for staff login',
                        email: staffEmail,
                    });
                } else if (submitted2fa !== expected2fa) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid two-factor authentication code',
                    });
                } else {
                    await redis.del(`staff2fa:${staffEmail}`);
                }
            }
        }

        const restriction = credentials.restriction || null;
        delete credentials.restriction;
        credentials.email = credentials.email_address; // Ensure email is included in the credentials for token generation
        delete credentials.email_address; // Remove redundant email_address field
        delete credentials.password_hash; // Ensure password hash is not included in the access token payload
        credentials.username = credentials.handle;
        credentials.userId = credentials.user_id;
        delete credentials.user_id;
        delete credentials.handle; // Remove handle if it's redundant with username
        // Keep both casings so staff APIs can resolve the logged-in moderator/admin.
        if (credentials.staff_id != null) {
            credentials.staffId = credentials.staff_id;
        } else if (credentials.staffId != null) {
            credentials.staff_id = credentials.staffId;
        }
        if (credentials.account_id != null) {
            credentials.accountId = credentials.account_id;
        } else if (credentials.accountId != null) {
            credentials.account_id = credentials.accountId;
        }
        try {
            const { isAccountVerifiedByAccountId } = require('../repositories/AccountVerificationRepositories');
            credentials.is_verified = Boolean(await isAccountVerifiedByAccountId(credentials.account_id));
        } catch (err) {
            console.error('Error checking is_verified in login:', err);
            credentials.is_verified = false;
        }
        const accessToken = await AccessTokens(credentials);
        setAccessTokenCookie(res, accessToken);
        await Promise.all([
            setupRefreshTokenCookie(res, credentials),
            createSessionIdCookie(res, credentials)
        ]);
        res.json({
            success: true,
            message: 'Login successful',
            credentials:{
                email: credentials.email,
                username: credentials.username,
                account_id: credentials.account_id,
                type: credentials.type,
                role: credentials.role,
                userId: credentials.userId,
                displayName: credentials.display_name,
                staffId: credentials.staff_id ?? credentials.staffId,
                avatar_file_id: credentials.avatar_file_id,
                avatar_preset_url: credentials.avatar_preset_url,
                is_verified: credentials.is_verified,
                restriction,
            },
        });
    } catch (err) {
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                code: err.code || err.details?.code || null,
                restriction: err.details?.blocked ? err.details : null,
                details: err.details || null,
            });
        }

        console.error('Error logging in:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function refreshToken(req, res) {
    const refreshTokenValue = req.cookies?.refreshToken;
    
    // 1. Return EARLY if token is missing
    if (!refreshTokenValue) {
        return res.status(401).json({
            success: false,
            message: 'Refresh token is required',
        });
    }

    if (!process.env.REFRESH_TOKEN_JWT_SECRET) {
        return res.status(500).json({
            success: false,
            message: 'Refresh token secret is not configured',
        });
    }

    try {
        // 2. This will safely throw an error to the catch block if the token is expired/invalid
        const decoded = jwt.verify(refreshTokenValue, process.env.REFRESH_TOKEN_JWT_SECRET);
        const email = decoded?.email || req.session?.email;

        if (!email) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token payload',
            });
        }

        const credentials = await getCredentials(email);
        if (!credentials) {
            // Clear dead session identifiers since the user profile no longer exists
            await logout(req.cookies?.sessionId);
            res.clearCookie('sessionId');
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            
            return res.status(401).json({
                success: false,
                message: 'User not found for the provided refresh token',
            });
        }

        const access = await getAccountAccess(credentials.account_id);
        if (access.blocked) {
            await clearAuthSession(req, res);
            return res.status(403).json({
                success: false,
                code: access.code,
                message: access.message,
                restriction: access,
            });
        }

        // Format credentials payload
        credentials.email = credentials.email_address;
        delete credentials.email_address;
        credentials.username = credentials.handle;
        delete credentials.handle;
        credentials.userId = credentials.user_id;
        delete credentials.user_id;
        delete credentials.password_hash;

        // Generate and set fresh access token
        const accessToken = await AccessTokens(credentials);
        setAccessTokenCookie(res, accessToken);
        
        return res.json({
            success: true,
            message: 'Access token refreshed',
        });

    } catch (err) {
        console.error('Error refreshing token:', err);
        
        // 3. FIX: If JWT verification fails (JsonWebTokenError / TokenExpiredError), 
        // return a 401 instead of a 500 so the frontend interceptor breaks the loop!
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            res.clearCookie('sessionId');
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
        }

        // True unexpected database or server issues can remain 500
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function LogoutUsers(req, res) {
    try {
        const sessionId = req.cookies?.sessionId;

        if (sessionId) {
            await logout(sessionId);
            res.clearCookie('sessionId');
        }

        // Clear auth cookies with same options used when creating them
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (err) {
        console.error('Error logging out user:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function getMyStanding(req, res) {
    try {
        const accountId = req.session?.account_id || req.session?.accountId;
        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Sign in to view your account record.' });
        }
        const { getOwnAccountRecord } = require('../lib/AccountRestriction');
        const data = await getOwnAccountRecord(accountId);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Error loading account standing:', err);
        return res.status(500).json({ success: false, message: 'Could not load your account record.' });
    }
}

async function getCurrentUser(req, res) {
    let sessionUser = req.session || null;
    if (sessionUser && (sessionUser.account_id || sessionUser.accountId)) {
        const accountId = sessionUser.account_id || sessionUser.accountId;
        let sessionModified = false;
        if (!sessionUser.avatar_preset_url || !sessionUser.avatar_file_id) {
            try {
                const { getProfileCurrentAvatarByAccountId } = require('../repositories/ProfileRepositories');
                const avatar = await getProfileCurrentAvatarByAccountId(accountId);
                if (avatar) {
                    sessionUser.avatar_file_id = avatar.file_id;
                    sessionUser.avatar_preset_url = avatar.path;
                    sessionModified = true;
                }
            } catch (err) {
                console.error('Error hydrating avatar in getCurrentUser:', err);
            }
        }
        try {
            const { isAccountVerifiedByAccountId } = require('../repositories/AccountVerificationRepositories');
            const isVerified = await isAccountVerifiedByAccountId(accountId);
            if (sessionUser.is_verified !== isVerified) {
                sessionUser.is_verified = Boolean(isVerified);
                sessionModified = true;
            }
        } catch (err) {
            console.error('Error hydrating is_verified in getCurrentUser:', err);
        }
        try {
            const { getAccountWalletRepositories } = require('../repositories/AccountRepositories');
            const wallet = await getAccountWalletRepositories(accountId, 'account wallets');
            if (wallet) {
                sessionUser.wallet = wallet;
                sessionModified = true;
            }
        } catch (err) {
            console.error('Error hydrating wallet in getCurrentUser:', err);
        }
        if (sessionModified) {
            const sessionId = req.cookies?.sessionId;
            if (sessionId && redis) {
                redis.set(`session:${sessionId}`, JSON.stringify(sessionUser), { KEEPTTL: true }).catch(() => {});
            }
        }
    }
    let responseUser = sessionUser;
    if (sessionUser && (sessionUser.account_id || sessionUser.accountId)) {
        const accountId = sessionUser.account_id || sessionUser.accountId;
        try {
            responseUser = {
                ...sessionUser,
                restriction: await getAccountAccess(accountId),
            };
        } catch (err) {
            console.error('Error loading account standing:', err);
        }
    }
    res.status(200).json({
        success: true,
        user: responseUser,
    });
}

async function CheckUserRole(req,res){
    const isUser = req.session.type === 'User';
    if(!isUser){
        return res.status(403).json({
            success: false,
            message: 'Forbidden: User role required',
        });
    }
    res.status(200).json({
        success: true
    });
}

async function getNameByUserIdController(req, res) {
    const userId = req.params.userId;
    try {
        const name = await getNameByUserIdServices(userId);
        if (!name) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
    } catch (err) {
        console.error('Error fetching name by user ID:', err);
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function signUpSaveSessionController(req, res) { 
    try {
        const result = await signUpSaveSession(req.body);
        return res.status(200).json({
            success: true,
            message: 'Session saved successfully',
            credentials: result
        });
    } catch (err) {
        console.error('Error saving session after signup:', err);
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                details: err.details || null,
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function checkVerificationCodeController(req, res) { 
    try {
        const { email, code } = req.body;
        const result = await checkVerificationCode(email, code);
        await Promise.all([
            setupRefreshTokenCookie(res, result.credentials),
            createSessionIdCookie(res, result.credentials)
        ]);
        setAccessTokenCookie(res, await AccessTokens(result.credentials));

        return res.status(200).json({
            success: true,
            message: 'Email verified and account created',
            credentials: result.credentials
        });
    }catch (err) {
        console.error('Error checking verification code:', err);
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                details: err.details || null,
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function sendVerificationEmailController(req, res) { 
    try {
        await sendVerificationEmailServices(req.body.email);
        return res.status(200).json({
            success: true,
            message: 'Verification email sent successfully',
        });
    }catch (err) {
        console.error('Error sending verification email:', err);
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                details: err.details || null,
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}



async function updatePersonalDetailsController(req, res) { 
    try {
        const { userId } = req.session; // Assuming userId is stored in the session
        const updatedDetails = req.body;
        const result = await updatePersonalDetails(userId, updatedDetails);
        return res.status(200).json({
            success: true,
            message: 'Personal details updated successfully',
            data: result
        });
    } catch (err) { 
        console.error('Error updating personal details:', err);
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                details: err.details || null,
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function getUserSession(req, res) { 
    try {
        let steps = await getUserOnboardingStep(req.session.userId);
        return res.status(200).json({
            success: true,
            steps: steps.completed_onboarding ?? null
        });
    } catch (err) {
        console.error('Error fetching user session:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function checkUsernameUniqueness(req, res) { 
    try{
        const { username } = req.query;
        const isUnique = await isUsernameUnique(username);
        return res.status(200).json({
            success: true,
            isUnique
        });
    } catch (err) {
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                details: err.details || null,
            });
        }
    }
}

async function forgotPasswordController(req, res) {
    try {
        const { email } = req.body;
        const result = await requestPasswordReset(email);
        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (err) {
        console.error('Error in forgotPasswordController:', err);
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                details: err.details || null,
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Unable to process password reset request. Please try again later.',
        });
    }
}

async function verifyResetTokenController(req, res) {
    try {
        const { token } = req.params;
        const result = await verifyResetToken(token);
        return res.status(200).json({
            success: true,
            valid: result.valid,
            email: result.email,
        });
    } catch (err) {
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Invalid or expired password reset link.',
        });
    }
}

async function resetPasswordController(req, res) {
    try {
        const { token, password } = req.body;
        const result = await resetPasswordWithToken(token, password);
        return res.status(200).json(result);
    } catch (err) {
        console.error('Error in resetPasswordController:', err);
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                details: err.details || null,
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to reset password. Please try again.',
        });
    }
}

async function get2FAStatusController(req, res) {
    try {
        const accountId = req.session?.account_id || req.session?.accountId;
        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { get2FAStatusService } = require('../services/AccountServices');
        const status = await get2FAStatusService(accountId);
        return res.status(200).json({ success: true, ...status });
    } catch (err) {
        console.error('Error fetching 2FA status:', err);
        return res.status(500).json({ success: false, message: err.message || 'Failed to fetch 2FA status' });
    }
}

async function setup2FAController(req, res) {
    try {
        const accountId = req.session?.account_id || req.session?.accountId;
        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { setup2FASecretService } = require('../services/AccountServices');
        const setup = await setup2FASecretService(accountId);
        return res.status(200).json({ success: true, data: setup });
    } catch (err) {
        console.error('Error setting up 2FA:', err);
        return res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Failed to set up 2FA' });
    }
}

async function enable2FAController(req, res) {
    try {
        const accountId = req.session?.account_id || req.session?.accountId;
        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: '6-digit verification code is required' });
        }
        const { verifyAndEnable2FAService } = require('../services/AccountServices');
        const result = await verifyAndEnable2FAService(accountId, token);
        return res.status(200).json(result);
    } catch (err) {
        console.error('Error enabling 2FA:', err);
        return res.status(400).json({ success: false, message: err.message || 'Failed to enable 2FA' });
    }
}

async function disable2FAController(req, res) {
    try {
        const accountId = req.session?.account_id || req.session?.accountId;
        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { code, verificationCode } = req.body;
        const inputCode = code || verificationCode;
        if (!inputCode) {
            return res.status(400).json({ success: false, message: 'Verification code or recovery code is required to disable 2FA' });
        }
        const { disable2FAService } = require('../services/AccountServices');
        const result = await disable2FAService(accountId, inputCode);
        return res.status(200).json(result);
    } catch (err) {
        console.error('Error disabling 2FA:', err);
        return res.status(400).json({ success: false, message: err.message || 'Failed to disable 2FA' });
    }
}

async function regenerateRecoveryCodesController(req, res) {
    try {
        const accountId = req.session?.account_id || req.session?.accountId;
        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: '6-digit authenticator code is required' });
        }
        const { regenerateRecoveryCodesService } = require('../services/AccountServices');
        const result = await regenerateRecoveryCodesService(accountId, token);
        return res.status(200).json(result);
    } catch (err) {
        console.error('Error regenerating recovery codes:', err);
        return res.status(400).json({ success: false, message: err.message || 'Failed to regenerate recovery codes' });
    }
}

module.exports = {
    getAllUsers,
    signup,
    getUserByEmail,
    loginCredentials,
    refreshToken,
    LogoutUsers,
    getCurrentUser,
    getMyStanding,
    CheckUserRole,
    getUsersByListOfIdsController,
    getNameByUserIdController,
    signUpSaveSessionController,
    checkVerificationCodeController,
    sendVerificationEmailController,
    updatePersonalDetailsController,
    getUserSession,
    checkUsernameUniqueness,
    forgotPasswordController,
    verifyResetTokenController,
    resetPasswordController,
    get2FAStatusController,
    setup2FAController,
    enable2FAController,
    disable2FAController,
    regenerateRecoveryCodesController,
};
