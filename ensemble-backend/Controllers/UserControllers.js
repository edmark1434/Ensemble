const {
    ServiceError,
    fetchAllUsers,
    findUserByEmail,
    registerUser,
    LoginUserOrEmail,
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

async function signup(req, res) {
    try {
        const result = await registerUser(req.body);
        const statusCode = result.user ? 201 : 200;
        return res.status(statusCode).json({
            success: true,
            message: result.message || 'User and account created successfully',
            user: result.user || null,
            accountId: result.accountId || null,
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

    if (!resolvedIdentifier || !password) {
        return res.status(400).json({
            success: false,
            message: 'Login identifier and password are required',
        });
    }

    try {
        const credentials = await LoginUserOrEmail(resolvedIdentifier, password);
        res.json({
            success: true,
            message: 'Login successful',
            credentials:{
                email: credentials.email_address,
                username: credentials.handle,
                accountId: credentials.account_id,
                displayName: credentials.display_name
            },
        });
    } catch (err) {
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
            });
        }

        console.error('Error logging in:', err);
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
};