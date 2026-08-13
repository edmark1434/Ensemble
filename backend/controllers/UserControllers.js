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
    isUsernameUnique
} = require('../services/UserServices');
const { getUserOnboardingStep } = require('../repositories/UserRepositories');
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
        await Promise.all([
            setupRefreshTokenCookie(res, result.credentials),
            createSessionIdCookie(res, result.credentials)
        ]);
        const accessToken = await AccessTokens(result.credentials);
        setAccessTokenCookie(res, accessToken);
        return res.status(statusCode).json({
            success: result.success,
            message: result.message || 'User and account created successfully',
            result: result.credentials,
        });
        
    } catch (err) {
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
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
    const { loginIdentifier, email, username, password } = req.body;
    const resolvedIdentifier = loginIdentifier ?? email ?? username;
    const requestContext = {
        ip: req.ip,
        userAgent: req.get('user-agent') || 'unknown',
    };

    if (!resolvedIdentifier || !password) {
        return res.status(400).json({
            success: false,
            message: 'Login identifier and password are required',
        });
    }

    try {
        const credentials = await LoginUserOrEmail(resolvedIdentifier, password, requestContext);
        if (credentials.existSession) {
            return res.status(200).json({
                success: true,
                message: 'Need to verify email before logging in',
                credentials,
                existSession: true,
            });
        }
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
                staffId: credentials.staff_id ?? credentials.staffId
            },
        });
    } catch (err) {
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
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

        // Format credentials payload
        credentials.email = credentials.email_address;
        delete credentials.email_address;
        credentials.username = credentials.handle;
        delete credentials.handle;
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

async function getCurrentUser(req,res){
    res.status(200).json({
        success: true,
        user: req.session || null,
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

module.exports = {
    getAllUsers,
    signup,
    getUserByEmail,
    loginCredentials,
    refreshToken,
    LogoutUsers,
    getCurrentUser,
    CheckUserRole,
    getUsersByListOfIdsController,
    getNameByUserIdController,
    getNameByUserIdController,
    signUpSaveSessionController,
    checkVerificationCodeController,
    sendVerificationEmailController,
    updatePersonalDetailsController,
    getUserSession,
    checkUsernameUniqueness
};
