const redisClient = require('../lib/Redis');
const { recordDecision, recordStoreError, forgetSubject } = require('../lib/RateLimitMonitor');

const MINUTE = 60 * 1000;
const KEY_PREFIX = 'rate-limit:v2';
const BUCKET_KEY_PATTERN = /^rate-limit:v2:[a-zA-Z]+:(?:acct|ip):[A-Za-z0-9:._-]{1,80}$/;

// Signed-in requests are counted per account (`accountLimit`); anonymous requests per
// IP (`ipLimit`). Many people can share one public IP (campus/office Wi-Fi, mobile
// carriers), so keying signed-in traffic by IP made one busy network block everyone.
// `ipOnly` policies always count by IP (login/signup brute-force protection).
const POLICIES = {
  authentication: { windowMs: 15 * MINUTE, ipLimit: 150, ipOnly: true },
  tokenRefresh: { windowMs: 15 * MINUTE, accountLimit: 120, ipLimit: 150 },
  verification: { windowMs: 10 * MINUTE, accountLimit: 10, ipLimit: 30 },
  transaction: { windowMs: 10 * MINUTE, accountLimit: 30, ipLimit: 30 },
  upload: { windowMs: 10 * MINUTE, accountLimit: 60, ipLimit: 60 },
  search: { windowMs: MINUTE, accountLimit: 120, ipLimit: 300 },
  messaging: { windowMs: MINUTE, accountLimit: 180, ipLimit: 180 },
  mutation: { windowMs: MINUTE, accountLimit: 120, ipLimit: 240 },
  general: { windowMs: MINUTE, accountLimit: 300, ipLimit: 600 },
};

// Route-level limiters created with createRateLimiter, listed for the admin monitor.
const ROUTE_POLICIES = {};

function selectPolicy(req) {
  const path = req.path.toLowerCase();
  if (/^\/users\/refresh-token/.test(path)) return 'tokenRefresh';
  if (/^\/users\/(?:login|signup)/.test(path)) return 'authentication';
  if (/^\/users\/(?:verify-email|resend-verification-email|forgot-password|reset-password|verify-reset-token)/.test(path) || /^\/verification\/(?:email|verify-code)/.test(path)) return 'verification';
  if (/search|suggestions|places/.test(path)) return 'search';
  if (/^\/(?:payment|cashouts)(?:\/|$)/.test(path) && !path.includes('/webhooks/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return 'transaction';
  if (/^\/files\/(?:upload-url|finalize|register)/.test(path) || /^\/onboarding\/avatar-upload-url/.test(path)) return 'upload';
  if (/^\/inbox\/(?:message|conversation)/.test(path)) return 'messaging';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return 'mutation';
  return 'general';
}

function safeIp(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown').replace(/[^a-fA-F0-9:._-]/g, '_').slice(0, 80);
}

function isLocalhost(ip) {
  return ip === '::1' || ip === '127.0.0.1' || ip === '_1' || ip === '::ffff:127.0.0.1' || ip.startsWith('127_') || ip.startsWith('127.');
}

function accountFromSession(session) {
  const id = session?.account_id ?? session?.accountId ?? session?.userId;
  if (id == null || id === '') return null;
  const handle = session.handle || session.username;
  return {
    id: String(id).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64),
    label: handle ? `@${handle}` : session.display_name || null,
  };
}

// Only a session that exists in Redis counts; a made-up cookie falls back to the IP bucket.
async function resolveAccount(req) {
  if (req.session) return accountFromSession(req.session);
  const sessionId = req.cookies?.sessionId;
  if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 128) return null;
  try {
    const raw = await redisClient.get(`session:${sessionId}`);
    return raw ? accountFromSession(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

async function consume(key, windowMs) {
  const count = await redisClient.incr(key);
  if (count === 1) await redisClient.pExpire(key, windowMs);
  let ttl = await redisClient.pTTL(key);
  if (ttl < 0) {
    await redisClient.pExpire(key, windowMs);
    ttl = windowMs;
  }
  return { count, ttl };
}

async function enforce(req, res, next, name, policy, message, code) {
  const ip = safeIp(req);
  if (isLocalhost(ip) && process.env.ENABLE_LOCAL_RATE_LIMIT !== 'true') return next();

  const account = policy.ipOnly ? null : await resolveAccount(req);
  const scope = account && policy.accountLimit ? 'account' : 'ip';
  const subject = scope === 'account' ? account.id : ip;
  const limit = scope === 'account' ? policy.accountLimit : policy.ipLimit;
  const key = `${KEY_PREFIX}:${name}:${scope === 'account' ? 'acct' : 'ip'}:${subject}`;

  let result;
  try {
    result = await consume(key, policy.windowMs);
  } catch (error) {
    // Fail open: a Redis outage must not take the whole API down.
    console.error('Rate limiter unavailable:', error.message);
    recordStoreError(error.message);
    return next();
  }

  const { count, ttl } = result;
  const blocked = count > limit;
  const resetSeconds = Math.max(1, Math.ceil(ttl / 1000));
  recordDecision({
    key,
    policy: name,
    scope,
    subject,
    label: account?.label || null,
    ip,
    method: req.method,
    path: (req.baseUrl + req.path).slice(0, 160),
    count,
    limit,
    windowMs: policy.windowMs,
    resetAt: Date.now() + ttl,
    blocked,
  });

  res.setHeader('RateLimit-Limit', String(limit));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, limit - count)));
  res.setHeader('RateLimit-Reset', String(resetSeconds));
  if (blocked) {
    res.setHeader('Retry-After', String(resetSeconds));
    return res.status(429).json({ success: false, message, code, retryAfterSeconds: resetSeconds });
  }
  return next();
}

async function apiRateLimiter(req, res, next) {
  const name = selectPolicy(req);
  return enforce(req, res, next, name, POLICIES[name], 'Too many requests. Please try again later.', 'RATE_LIMITED');
}

/** Route-level limiter on the same Redis store and admin monitor as the global API limiter. */
function createRateLimiter(name, { windowMs, accountLimit, ipLimit, ipOnly = false, message, code = 'RATE_LIMITED' }) {
  if (POLICIES[name] || ROUTE_POLICIES[name]) throw new Error(`Rate limit policy "${name}" already exists`);
  const policy = { windowMs, accountLimit, ipLimit, ipOnly };
  ROUTE_POLICIES[name] = policy;
  const text = message || 'Too many requests. Please try again later.';
  return (req, res, next) => enforce(req, res, next, name, policy, text, code);
}

function listPolicies() {
  const rows = (source, kind) => Object.entries(source).map(([name, p]) => ({
    name,
    kind,
    windowSeconds: Math.round(p.windowMs / 1000),
    accountLimit: p.ipOnly ? null : p.accountLimit ?? null,
    ipLimit: p.ipLimit,
  }));
  return [...rows(POLICIES, 'api'), ...rows(ROUTE_POLICIES, 'route')];
}

function isRateLimitBucketKey(key) {
  return typeof key === 'string' && BUCKET_KEY_PATTERN.test(key);
}

async function clearRateLimitBucket(key) {
  await redisClient.del(key);
  forgetSubject(key);
}

module.exports = { apiRateLimiter, createRateLimiter, listPolicies, isRateLimitBucketKey, clearRateLimitBucket, POLICIES };
