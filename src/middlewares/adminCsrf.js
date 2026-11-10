const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function ensureAdminCsrfToken(req) {
  if (!req.session) {
    return null;
  }

  if (!req.session.adminCsrfToken) {
    req.session.adminCsrfToken = crypto.randomBytes(32).toString('hex');
  }

  return req.session.adminCsrfToken;
}

function attachAdminCsrf(req, res, next) {
  const token = ensureAdminCsrfToken(req);
  res.locals.adminCsrfToken = token;
  next();
}

function getProvidedToken(req) {
  return req.get('x-csrf-token')
    || req.body?._csrf
    || req.query?._csrf
    || '';
}

function requireAdminCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const expectedToken = ensureAdminCsrfToken(req);
  const providedToken = getProvidedToken(req);

  if (!expectedToken || !providedToken || expectedToken !== providedToken) {
    if (!req.originalUrl.startsWith('/admin/api/')) {
      return res.status(403).render('errors/error', {
        title: 'Errore',
        error: 'Token CSRF non valido o mancante'
      });
    }

    return res.status(403).json({
      success: false,
      error: 'Token CSRF non valido o mancante',
      code: 'INVALID_CSRF_TOKEN'
    });
  }

  next();
}

module.exports = {
  attachAdminCsrf,
  ensureAdminCsrfToken,
  requireAdminCsrf
};
