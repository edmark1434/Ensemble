// Middleware to require authentication for protected routes
const jwt = require('jsonwebtoken');
const { rejectRestrictedAccount } = require('../lib/AccountRestriction');
// Extract token from HttpOnly access token cookie.
function extractAccessToken(req) {
    return req.cookies?.accessToken || null;
}
//this middleware checks for the presence of a valid JWT token in the Authorization header or cookies and verifies it. If valid, it attaches the decoded user info to req.user and calls next(), otherwise it returns a 401 Unauthorized response.
async function requireAuth(req, res, next) {
    const token = extractAccessToken(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token is required',
        });
    }

    if (!process.env.ACCESS_TOKEN_JWT_SECRET) {
        return res.status(500).json({
            success: false,
            message: 'Server auth configuration is missing',
        });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_JWT_SECRET);
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }

    req.user = decoded;
    if (await rejectRestrictedAccount(req, res)) return;
    return next();
}

module.exports = requireAuth;