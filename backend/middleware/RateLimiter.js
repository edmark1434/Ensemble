const redisClient = require('../lib/Redis');

const POLICIES = {
  authentication: { windowMs: 15 * 60 * 1000, limit: 100 },
  verification: { windowMs: 10 * 60 * 1000, limit: 8 },
  transaction: { windowMs: 10 * 60 * 1000, limit: 30 },
  upload: { windowMs: 10 * 60 * 1000, limit: 40 },
  search: { windowMs: 60 * 1000, limit: 120 },
  messaging: { windowMs: 60 * 1000, limit: 180 },
  mutation: { windowMs: 60 * 1000, limit: 120 },
  general: { windowMs: 15 * 60 * 1000, limit: 600 },
};

function selectPolicy(req) {
  const path = req.path.toLowerCase();
  if (/^\/users\/(?:login|signup|signup-save-session|refresh-token)/.test(path)) return ['authentication', POLICIES.authentication];
  if (/^\/users\/(?:verify-email|resend-verification-email)/.test(path) || /^\/verification\/(?:email|verify-code)/.test(path)) return ['verification', POLICIES.verification];
  if (/search|suggestions|places/.test(path)) return ['search', POLICIES.search];
  if (/^\/(?:payment|cashouts)(?:\/|$)/.test(path) && !path.includes('/webhooks/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return ['transaction', POLICIES.transaction];
  if (/^\/files\/(?:upload-url|finalize|register)/.test(path) || /^\/onboarding\/avatar-upload-url/.test(path)) return ['upload', POLICIES.upload];
  if (/^\/inbox\/(?:message|conversation)/.test(path)) return ['messaging', POLICIES.messaging];
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return ['mutation', POLICIES.mutation];
  return ['general', POLICIES.general];
}

function safeIp(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown').replace(/[^a-fA-F0-9:._-]/g, '_').slice(0, 80);
}

async function apiRateLimiter(req, res, next) {
  const [name, policy] = selectPolicy(req);
  const key = `rate-limit:v1:${name}:${safeIp(req)}`;
  try {
    const count = await redisClient.incr(key);
    if (count === 1) await redisClient.pExpire(key, policy.windowMs);
    let ttl = await redisClient.pTTL(key);
    if (ttl < 0) {
      await redisClient.pExpire(key, policy.windowMs);
      ttl = policy.windowMs;
    }
    const remaining = Math.max(0, policy.limit - count);
    res.setHeader('RateLimit-Limit', String(policy.limit));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(ttl / 1000)));
    if (count > policy.limit) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil(ttl / 1000))));
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' });
    }
    return next();
  } catch (error) {
    console.error('Rate limiter unavailable:', error.message);
    return next();
  }
}

module.exports = { apiRateLimiter, POLICIES };
