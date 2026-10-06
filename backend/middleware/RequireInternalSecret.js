const crypto = require('crypto');

function requireInternalSecret(req, res, next) {
    const expected = process.env.INTERNAL_API_SECRET;
    const provided = req.get('x-internal-secret');

    if (!expected || !provided) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    next();
}

module.exports = requireInternalSecret;