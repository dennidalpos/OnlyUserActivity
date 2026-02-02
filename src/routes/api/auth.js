const express = require('express');
const router = express.Router();
const ldapAuth = require('../../services/ldap/ldapAuth');
const localAuth = require('../../services/auth/localAuth');
const tokenService = require('../../services/auth/tokenService');
const auditLogger = require('../../services/storage/auditLogger');
const { validate, loginSchema } = require('../../middlewares/validation');
const { AppError } = require('../../middlewares/errorHandler');
const { loginLimiter } = require('../../middlewares/rateLimiter');
const config = require('../../config');

router.post('/login', loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;

    let user;

    if (config.ldap.enabled) {
      try {
        user = await ldapAuth.authenticate(username, password);
      } catch (error) {
        if (error.message.includes('Username o password')) {
          throw new AppError('Username o password non validi', 401, 'INVALID_CREDENTIALS');
        }
        if (error.message.includes('non appartiene al gruppo')) {
          throw new AppError(error.message, 403, 'UNAUTHORIZED_GROUP');
        }
        throw new AppError('Errore di autenticazione LDAP', 503, 'LDAP_ERROR');
      }
    } else {
      try {
        user = await localAuth.authenticate(username, password);
      } catch (error) {
        throw new AppError('Username o password non validi', 401, 'INVALID_CREDENTIALS');
      }
    }

    const { token, expiresAt } = tokenService.generateToken(user);

    await auditLogger.log(
      'LOGIN',
      user.userKey,
      { username, authMethod: config.ldap.enabled ? 'ldap' : 'local' },
      req.id,
      req.ip,
      username
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        userKey: user.userKey,
        username: user.username,
        displayName: user.displayName,
        expiresAt
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
