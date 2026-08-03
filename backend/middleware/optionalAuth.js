const jwt = require('jsonwebtoken');

function extractAccessToken(req) {
    return req.cookies?.accessToken || null;
}

function optionalAuth(req, res, next) {
    const token = extractAccessToken(req);

    if (!token) {
        // console.log("[optionalAuth] No token found in cookies.");
        return next();
    }

    if (!process.env.ACCESS_TOKEN_JWT_SECRET) {
        // console.log("[optionalAuth] JWT Secret is missing.");
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_JWT_SECRET);
        req.user = decoded;
        // console.log("[optionalAuth] Token verified, user:", decoded.accountId || decoded.account_id);
    } catch (err) {
        // console.log("[optionalAuth] Token verification failed:", err.message);
        // Invalid token, but we still proceed without setting req.user
    }

    return next();
}

module.exports = optionalAuth;
