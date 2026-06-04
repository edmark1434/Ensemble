function requireAdmin(req, res, next) {
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

  return next();
}

module.exports = requireAdmin;
