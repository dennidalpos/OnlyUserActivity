const rateLimit = require('express-rate-limit');
const config = require('../config');

const apiLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Troppe richieste. Riprova più tardi.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/health';
  }
});

const loginLimiter = rateLimit({
  windowMs: config.security.loginLockoutDurationMs,
  max: config.security.loginRateLimitMax,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: `Troppi tentativi di login. Riprova tra ${Math.ceil(config.security.loginLockoutDurationMs / 60000)} minuti.`
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res, next, options) => {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(options.statusCode).json(options.message);
    }

    const isAdminLogin = req.originalUrl.includes('/admin/auth/login');
    return res.status(options.statusCode).render(isAdminLogin ? 'admin/login' : 'user/login', {
      title: isAdminLogin ? 'Login Admin' : 'Login Utente',
      error: options.message.error.message,
      ...(isAdminLogin ? {} : { ldapEnabled: config.ldap.enabled })
    });
  }
});

module.exports = {
  apiLimiter,
  loginLimiter
};
