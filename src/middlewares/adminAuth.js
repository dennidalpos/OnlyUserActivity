const adminAuthService = require('../services/auth/adminAuthService');

async function requireAdminAuth(req, res, next) {
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

  const sessionUser = req.session.adminUser;
  const storedUser = await adminAuthService.getUser(sessionUser.username);

  if (!storedUser || storedUser.passwordChangedAt !== sessionUser.passwordChangedAt) {
    req.session.destroy(() => {
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Sessione scaduta, effettua nuovamente il login'
          }
        });
      }
      return res.redirect('/admin/auth/login');
    });
    return;
  }

  req.adminUser = sessionUser;
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
