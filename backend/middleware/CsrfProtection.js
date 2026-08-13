const crypto = require('crypto');
const redisClient = require('../lib/Redis');

const TOKEN_TTL_SECONDS = 2 * 60 * 60;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = [
  /^\/users\/(?:login|signup|signup-save-session|verify-email|resend-verification-email|refresh-token)\/?$/,
  /^\/(?:payment|cashouts)\/webhooks\//,
  /^\/verification\/webhook\//,
  /^\/google-meet\/oauth\/callback\/?$/,
];

function tokenKey(sessionId) {
  return `csrf:v1:${sessionId}`;
}

function equalToken(received, expected) {
  if (typeof received !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function issueCsrfToken(req, res) {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const token = crypto.randomBytes(32).toString('base64url');
  await redisClient.set(tokenKey(sessionId), token, { EX: TOKEN_TTL_SECONDS });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ success: true, csrfToken: token });
}

async function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.some((pattern) => pattern.test(req.path))) return next();

  // CSRF is relevant only to requests authenticated by automatically attached cookies.
  const sessionId = req.cookies?.sessionId;
  const accessToken = req.cookies?.accessToken;
  if (!sessionId && !accessToken) return next();
  if (!sessionId) return res.status(403).json({ success: false, message: 'Invalid security token.', code: 'CSRF_INVALID' });

  try {
    const expected = await redisClient.get(tokenKey(sessionId));
    const received = req.get('x-csrf-token');
    if (!expected || !equalToken(received, expected)) {
      return res.status(403).json({ success: false, message: 'Invalid security token.', code: 'CSRF_INVALID' });
    }
    return next();
  } catch (error) {
    console.error('CSRF validation unavailable:', error.message);
    return res.status(503).json({ success: false, message: 'Unable to validate request security.', code: 'CSRF_UNAVAILABLE' });
  }
}

module.exports = { csrfProtection, issueCsrfToken };
