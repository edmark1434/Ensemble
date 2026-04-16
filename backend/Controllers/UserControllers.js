const {
    ServiceError,
    fetchAllUsers,
    findUserByEmail,
    registerUser,
    LoginUserOrEmail,
    AccessTokens,
    RefreshTokens,
} = require('../services/UserServices');

async function getAllUsers(req, res) {
    try {
        const users = await fetchAllUsers();
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function setupCookie(res,result){
        res.cookie(
            'refreshToken',
            await RefreshTokens({ userId: result.user_id, email: result.user?.email_address }),
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            }
        );
}

async function signup(req, res) {
    try {
        const result = await registerUser(req.body);
        const statusCode = result.user ? 201 : 200;
        await setupCookie(res, result);
        const accessToken = await AccessTokens({ userId: result.user_id, email: result.user?.email_address });
        return res.status(statusCode).json({
            success: true,
            message: result.message || 'User and account created successfully',
            user: result.user || null,
            accountId: result.accountId || null,
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
        const accessToken = await AccessTokens({ userId: credentials.user_id, email: credentials.email_address });
        await setupCookie(res, credentials);
        res.json({
            success: true,
            message: 'Login successful',
            accessToken,
            credentials:{
                email: credentials.email_address,
                username: credentials.handle,
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
    try{
        const accessToken = await AccessTokens({ userId: refreshToken.userId, email: refreshToken.email });
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

module.exports = {
    getAllUsers,
    signup,
    getUserByEmail,
    loginCredentials,
    refreshToken
};