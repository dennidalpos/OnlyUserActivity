const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Rate limiter globale per API
 */
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
    // Skip per health check
    return req.path === '/health';
  }
});

/**
 * Rate limiter specifico per login
 */
const loginLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
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
  skipSuccessfulRequests: true // Non conta login riusciti
});

module.exports = {
  apiLimiter,
  loginLimiter
};
