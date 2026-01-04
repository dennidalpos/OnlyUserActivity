function requireAdminAuth(req, res, next) {
  if (!req.session || !req.session.adminUser) {
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Autenticazione richiesta'
        }
      });
    }
    return res.redirect('/admin/auth/login');
  }

  req.adminUser = req.session.adminUser;
  next();
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.adminUser) {
    return res.redirect('/admin/dashboard');
  }
  next();
}

module.exports = {
  requireAdminAuth,
  redirectIfAuthenticated
};
