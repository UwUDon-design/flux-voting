function requireAdmin(req, res, next) {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Refresh session expiry on activity
  req.session.touch();
  next();
}

module.exports = { requireAdmin };
