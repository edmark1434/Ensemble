const { getRateLimitMonitor, resetRateLimitBucket } = require('../services/RateLimitMonitorServices');

function headerValue(value) {
  return String(Array.isArray(value) ? value[0] : value || '').trim().slice(0, 500);
}

async function getAdminRateLimits(req, res) {
  try {
    const forwardedFor = headerValue(req.headers['x-forwarded-for'])
      .split(',')
      .map((part) => part.trim().slice(0, 64))
      .filter(Boolean)
      .slice(0, 10);
    const data = getRateLimitMonitor({
      resolvedIp: req.ip,
      socketIp: req.socket?.remoteAddress,
      forwardedFor,
      cloudflareIp: headerValue(req.headers['cf-connecting-ip']).slice(0, 64) || null,
    });
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error loading rate-limit monitor:', err);
    res.status(500).json({ success: false, message: 'Failed to load rate-limit monitor' });
  }
}

async function postAdminRateLimitReset(req, res) {
  try {
    const data = await resetRateLimitBucket(req.body?.key);
    res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    console.error('Error resetting rate-limit bucket:', err);
    res.status(500).json({ success: false, message: 'Failed to reset rate limit' });
  }
}

module.exports = { getAdminRateLimits, postAdminRateLimitReset };
