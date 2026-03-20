const express = require('express');
const router = express.Router();
const ldapAuth = require('../../services/ldap/ldapAuth');
const localAuth = require('../../services/auth/localAuth');
const tokenService = require('../../services/auth/tokenService');
const auditLogger = require('../../services/storage/auditLogger');
const config = require('../../config');
const { redirectIfUserAuthenticated } = require('../../middlewares/userAuth');
const { loginLimiter } = require('../../middlewares/rateLimiter');
const { loginSchema } = require('../../middlewares/validation');

router.get('/login', redirectIfUserAuthenticated, (req, res) => {
  res.render('user/login', {
    title: 'Login Utente',
    error: null,
    ldapEnabled: config.ldap.enabled
  });
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).render('user/login', {
        title: 'Login Utente',
        error: error.details[0]?.message || 'Dati di login non validi',
        ldapEnabled: config.ldap.enabled
      });
    }

    const { username, password, authMethod: requestedAuthMethod } = value;

    let user;
    const authMethod = config.ldap.enabled && requestedAuthMethod === 'ldap' ? 'ldap' : 'local';

    try {
      if (authMethod === 'ldap') {
        user = await ldapAuth.authenticate(username, password);
      } else {
        user = await localAuth.authenticate(username, password);
      }
    } catch (error) {
      return res.render('user/login', {
        title: 'Login Utente',
        error: 'Username o password non validi',
        ldapEnabled: config.ldap.enabled
      });
    }

    const { token } = tokenService.generateToken(user);

    req.session.user = {
      userKey: user.userKey,
      username: user.username,
      displayName: user.displayName,
      userType: user.userType || (authMethod === 'ldap' ? 'ad' : 'local'),
      token: token
    };

    await auditLogger.log(
      'USER_LOGIN',
      user.userKey,
      { username, authMethod },
      req.id,
      req.ip,
      username
    );

    res.redirect('/user/dashboard');

  } catch (error) {
    res.status(500).render('user/login', {
      title: 'Login Utente',
      error: 'Errore durante il login',
      ldapEnabled: config.ldap.enabled
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/user/auth/login');
  });
});

module.exports = router;
