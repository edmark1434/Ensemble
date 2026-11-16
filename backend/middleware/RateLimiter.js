const crypto = require('crypto');
const redisClient = require('../lib/Redis');
const { recordDecision, recordStoreError, forgetSubject } = require('../lib/RateLimitMonitor');

const MINUTE = 60 * 1000;
const KEY_PREFIX = 'rate-limit:v2';
const BUCKET_KEY_PATTERN = /^rate-limit:v2:[a-zA-Z]+:(?:acct|dev|ip):[A-Za-z0-9:._-]{1,80}$/;

// People on one Wi-Fi network share a public IP, so the IP is never the main identity:
// - signed-in requests count per account (`accountLimit`), with no IP limit at all;
// - signed-out requests count per browser (`anonymousLimit`, signed device cookie) and
//   against a per-IP ceiling for all signed-out traffic from that network (`networkLimit`).
//   The ceiling is only an abuse backstop for clients that drop cookies, sized for a
//   full classroom or office.
// `ignoreAccount` policies (login/signup) count per browser and network even with a session.
const POLICIES = {
  authentication: { windowMs: 15 * MINUTE, anonymousLimit: 30, networkLimit: 1000, ignoreAccount: true },
  tokenRefresh: { windowMs: 15 * MINUTE, accountLimit: 120, anonymousLimit: 60, networkLimit: 1500 },
  // Verification codes have no per-code attempt cap, so the shared ceiling stays modest.
  verification: { windowMs: 10 * MINUTE, accountLimit: 10, anonymousLimit: 10, networkLimit: 150 },
  transaction: { windowMs: 10 * MINUTE, accountLimit: 30, anonymousLimit: 30, networkLimit: 300 },
  upload: { windowMs: 10 * MINUTE, accountLimit: 60, anonymousLimit: 60, networkLimit: 600 },
  search: { windowMs: MINUTE, accountLimit: 120, anonymousLimit: 120, networkLimit: 3000 },
  messaging: { windowMs: MINUTE, accountLimit: 180, anonymousLimit: 180, networkLimit: 3000 },
  mutation: { windowMs: MINUTE, accountLimit: 120, anonymousLimit: 120, networkLimit: 3000 },
  general: { windowMs: MINUTE, accountLimit: 300, anonymousLimit: 300, networkLimit: 6000 },
};

// Route-level limiters created with createRateLimiter, listed for the admin monitor.
const ROUTE_POLICIES = {};

// ── Signed-out browser identity ─────────────────────────────────────────────
const DEVICE_COOKIE = 'ens_rl';
const DEVICE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000;
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const DEVICE_SECRET = (() => {
  const base = process.env.RATE_LIMIT_DEVICE_SECRET || process.env.ACCESS_TOKEN_JWT_SECRET;
  // Purpose-specific derived key; without a configured secret, cookies last until restart.
  return base ? crypto.createHmac('sha256', base).update('rate-limit-device-v1').digest() : crypto.randomBytes(32);
})();

function signDevice(id) {
  return crypto.createHmac('sha256', DEVICE_SECRET).update(id).digest('base64url').slice(0, 22);
}

function readDeviceCookie(req) {
  const raw = req.cookies?.[DEVICE_COOKIE];
  if (typeof raw !== 'string' || raw.length > 64) return null;
  const [id, signature] = raw.split('.');
  if (!id || !signature || !DEVICE_ID_PATTERN.test(id)) return null;
  const expected = signDevice(id);
  if (signature.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? id : null;
}

/** Returns this browser's id, or null for a request without a valid cookie (one is issued). */
function resolveDevice(req, res) {
  if (req.rateLimitDevice !== undefined) return req.rateLimitDevice;
  const id = readDeviceCookie(req);
  req.rateLimitDevice = id;
  if (!id && !res.headersSent) {
    const fresh = crypto.randomBytes(16).toString('base64url');
    const production = process.env.NODE_ENV === 'production';
    res.cookie(DEVICE_COOKIE, `${fresh}.${signDevice(fresh)}`, {
      httpOnly: true,
      secure: production,
      sameSite: production ? 'None' : 'Lax',
      maxAge: DEVICE_COOKIE_MAX_AGE,
      path: '/',
    });
  }
  return id;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
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

// Only a session that exists in Redis counts; a made-up cookie is treated as signed out.
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

  const account = policy.ignoreAccount || !policy.accountLimit ? null : await resolveAccount(req);
  const buckets = [];
  if (account) {
    buckets.push({ scope: 'account', subject: account.id, limit: policy.accountLimit, key: `${KEY_PREFIX}:${name}:acct:${account.id}` });
  } else {
    const device = resolveDevice(req, res);
    if (device) buckets.push({ scope: 'device', subject: device, limit: policy.anonymousLimit, key: `${KEY_PREFIX}:${name}:dev:${device}` });
    buckets.push({ scope: 'ip', subject: ip, limit: policy.networkLimit, key: `${KEY_PREFIX}:${name}:ip:${ip}` });
  }

  try {
    await Promise.all(buckets.map(async (bucket) => Object.assign(bucket, await consume(bucket.key, policy.windowMs))));
  } catch (error) {
    // Fail open: a Redis outage must not take the whole API down.
    console.error('Rate limiter unavailable:', error.message);
    recordStoreError(error.message);
    return next();
  }

  const now = Date.now();
  for (const bucket of buckets) {
    bucket.blocked = bucket.count > bucket.limit;
    bucket.resetAt = now + bucket.ttl;
    bucket.windowMs = policy.windowMs;
  }
  const blockedBy = buckets.find((bucket) => bucket.blocked) || null;
  recordDecision({
    policy: name,
    label: account?.label || null,
    ip,
    method: req.method,
    path: (req.baseUrl + req.path).slice(0, 160),
    buckets,
    blockedBy,
  });

  // Report the tightest bucket in the standard headers.
  const tightest = blockedBy || buckets.reduce((a, b) => (b.limit - b.count < a.limit - a.count ? b : a));
  const resetSeconds = Math.max(1, Math.ceil(tightest.ttl / 1000));
  res.setHeader('RateLimit-Limit', String(tightest.limit));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, tightest.limit - tightest.count)));
  res.setHeader('RateLimit-Reset', String(resetSeconds));
  if (blockedBy) {
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
function createRateLimiter(name, { windowMs, accountLimit, anonymousLimit, networkLimit, ignoreAccount = false, message, code = 'RATE_LIMITED' }) {
  if (POLICIES[name] || ROUTE_POLICIES[name]) throw new Error(`Rate limit policy "${name}" already exists`);
  const policy = { windowMs, accountLimit, anonymousLimit, networkLimit, ignoreAccount };
  ROUTE_POLICIES[name] = policy;
  const text = message || 'Too many requests. Please try again later.';
  return (req, res, next) => enforce(req, res, next, name, policy, text, code);
}

function listPolicies() {
  const rows = (source, kind) => Object.entries(source).map(([name, p]) => ({
    name,
    kind,
    windowSeconds: Math.round(p.windowMs / 1000),
    accountLimit: p.ignoreAccount ? null : p.accountLimit ?? null,
    anonymousLimit: p.anonymousLimit,
    networkLimit: p.networkLimit,
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
