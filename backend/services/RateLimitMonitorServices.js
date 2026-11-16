const redisClient = require('../lib/Redis');
const { getSnapshot } = require('../lib/RateLimitMonitor');
const { listPolicies, isRateLimitBucketKey, clearRateLimitBucket } = require('../middleware/RateLimiter');

class RateLimitMonitorError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function normalizeIp(ip) {
  const value = String(ip || '').trim();
  if (value === '::1') return '127.0.0.1';
  return value.startsWith('::ffff:') ? value.slice(7) : value;
}

/**
 * Explains how the API resolved the caller's IP, so an admin can confirm that the
 * proxy chain passes real visitor addresses (one shared address means every visitor
 * draws from the same anonymous rate-limit bucket).
 */
function describeClientIp({ resolvedIp, socketIp, forwardedFor, cloudflareIp }) {
  const resolved = normalizeIp(resolvedIp);
  const cloudflare = cloudflareIp ? normalizeIp(cloudflareIp) : null;
  const hops = forwardedFor.length;
  let status;
  let message;

  if (cloudflare) {
    if (resolved === cloudflare) {
      status = 'ok';
      message = 'The API sees your real IP: it matches the address Cloudflare reports.';
    } else {
      status = 'problem';
      message = `The API resolved ${resolved || 'nothing'}, but Cloudflare reports ${cloudflare}. TRUST_PROXY does not match the number of proxies in front of the API, so visitors may share one rate-limit bucket.`;
    }
  } else if (hops > 0) {
    if (resolved === normalizeIp(socketIp)) {
      status = 'problem';
      message = "Requests arrive through a proxy, but the API uses the proxy's address. Set TRUST_PROXY to the number of proxies in front of the API.";
    } else {
      status = 'unverified';
      message = 'The API takes your IP from X-Forwarded-For. No Cloudflare header was present to confirm it.';
    }
  } else {
    status = 'direct';
    message = 'No proxy headers on this request (direct or local connection).';
  }

  const localBypass = (resolved === '127.0.0.1' || resolved.startsWith('127.')) && process.env.ENABLE_LOCAL_RATE_LIMIT !== 'true';
  return {
    status,
    message,
    resolvedIp: resolved || null,
    socketIp: normalizeIp(socketIp) || null,
    cloudflareIp: cloudflare,
    forwardedFor,
    forwardedHops: hops,
    trustProxy: String(process.env.TRUST_PROXY || '').trim() || 'loopback',
    localBypass,
  };
}

function getRateLimitMonitor(clientIpInfo) {
  return {
    ...getSnapshot(),
    policies: listPolicies(),
    store: redisClient.getClientMode(),
    clientIp: describeClientIp(clientIpInfo),
  };
}

async function resetRateLimitBucket(key) {
  if (!isRateLimitBucketKey(key)) throw new RateLimitMonitorError('Unknown rate-limit bucket', 400);
  await clearRateLimitBucket(key);
  return { key };
}

module.exports = { getRateLimitMonitor, resetRateLimitBucket, RateLimitMonitorError };
