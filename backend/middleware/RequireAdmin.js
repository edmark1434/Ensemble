const { getSecuritySettings } = require('../lib/ModerationPolicy');

function normalizeIp(ip) {
  if (!ip) return '';
  const trimmed = String(ip).trim();
  if (trimmed === '::1') return '127.0.0.1';
  if (trimmed.startsWith('::ffff:')) return trimmed.replace('::ffff:', '');
  return trimmed;
}

async function requireAdmin(req, res, next) {
  const session = req.session;

  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Session is required',
    });
  }

  if (session.type !== 'Staff' || session.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Admin role required',
    });
  }

  try {
    const security = await getSecuritySettings();
    if (security?.ipAllowlistEnabled) {
      const rawAllowed = security.allowedAdminIps;
      const allowedList = Array.isArray(rawAllowed)
        ? rawAllowed
        : typeof rawAllowed === 'string'
          ? rawAllowed.split(',').map((s) => s.trim()).filter(Boolean)
          : [];

      if (allowedList.length > 0) {
        const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress;
        const clientIp = normalizeIp(rawIp);
        const isAllowed = allowedList.some((allowed) => normalizeIp(allowed) === clientIp);

        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: IP address not allowed for admin access',
          });
        }
      }
    }
  } catch (error) {
    console.error('Error verifying admin IP allowlist:', error);
  }

  return next();
}

module.exports = requireAdmin;
