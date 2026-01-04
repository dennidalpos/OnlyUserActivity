const jwt = require('jsonwebtoken');
const config = require('../config');

function requireUserAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Autenticazione richiesta'
        }
      });
    }
    return res.redirect('/user/auth/login');
  }

  req.user = req.session.user;
  next();
}

function redirectIfUserAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/user/dashboard');
  }
  next();
}

module.exports = {
  requireUserAuth,
  redirectIfUserAuthenticated
};
