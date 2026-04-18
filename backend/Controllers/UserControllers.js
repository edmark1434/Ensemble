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
    getCredentials
} = require('../services/UserServices');
const jwt = require('jsonwebtoken');
async function getAllUsers(req, res) {
    try {
        const users = await fetchAllUsers();
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Internal server error' });
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
            }
        );
}
async function createSessionIdCookie(res,credentials){
    const sessionId = await createSessionId(credentials);
    res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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
        return res.status(statusCode).json({
            success: result.success,
            message: result.message || 'User and account created successfully',
            result: result.credentials,
            accessToken,
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
        credentials.email = credentials.email_address; // Ensure email is included in the credentials for token generation
        delete credentials.email_address; // Remove redundant email_address field
        delete credentials.password_hash; // Ensure password hash is not included in the access token payload
        credentials.username = credentials.handle;
        delete credentials.handle; // Remove handle if it's redundant with username
        const accessToken = await AccessTokens(credentials);
        await Promise.all([
            setupRefreshTokenCookie(res, credentials),
            createSessionIdCookie(res, credentials)
        ]);
        res.json({
            success: true,
            message: 'Login successful',
            accessToken,
            credentials:{
                email: credentials.email,
                username: credentials.username,
                accountId: credentials.account_id,
                type: credentials.type,
                role: credentials.role,
                staffId: credentials.staff_id
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
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
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
    try{
        const credentials = await getCredentials(refreshToken.email);
        delete credentials.password_hash; // Ensure password hash is not included in the access token payload
        const accessToken = await AccessTokens(credentials);
        return res.json({
            success: true,
            accessToken,
        });
    }catch(err){
        console.error('Error refreshing token:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }

}
async function LogoutUsers(req, res) {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
        await logout(sessionId);
        res.clearCookie('sessionId');
    }
    res.clearCookie('refreshToken');
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
}
module.exports = {
    getAllUsers,
    signup,
    getUserByEmail,
    loginCredentials,
    refreshToken,
    LogoutUsers
};