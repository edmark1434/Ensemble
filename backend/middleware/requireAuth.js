// Middleware to require authentication for protected routes
const jwt = require('jsonwebtoken');
const redisClient = require('../lib/redis');
//this extract the token from the Authorization header in the format "Bearer <token>" or from cookies
function extractBearerToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
}
//this middleware checks for the presence of a valid JWT token in the Authorization header or cookies and verifies it. If valid, it attaches the decoded user info to req.user and calls next(), otherwise it returns a 401 Unauthorized response.
function requireAuth(req, res, next) {
    const token = extractBearerToken(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authorization token is required',
        });
    }

    if (!process.env.ACCESS_TOKEN_JWT_SECRET) {
        return res.status(500).json({
            success: false,
            message: 'Server auth configuration is missing',
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_JWT_SECRET);
        req.user = decoded;
        return next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
}

module.exports = {
    requireAuth,
    extractBearerToken
}