function requireStaffRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    const session = req.session;

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session is required',
      });
    }

    if (session.type !== 'Staff' || !allowed.includes(session.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: insufficient role',
      });
    }

    return next();
  };
}

module.exports = requireStaffRole;
