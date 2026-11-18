const { getSecuritySettings } = require('../lib/ModerationPolicy');
const { allowlistEntries, ipMatchesAllowlist } = require('../lib/IpAllowlist');

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
      const allowedList = allowlistEntries(security.allowedAdminIps);

      if (allowedList.length > 0) {
        // req.ip honours TRUST_PROXY; the first X-Forwarded-For entry is client-controlled.
        const clientIp = req.ip || req.socket?.remoteAddress;
        if (!ipMatchesAllowlist(clientIp, allowedList)) {
          return res.status(403).json({
            success: false,
            code: 'ADMIN_IP_NOT_ALLOWED',
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
