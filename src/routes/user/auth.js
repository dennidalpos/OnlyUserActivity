const express = require('express');
const router = express.Router();
const ldapAuth = require('../../services/ldap/ldapAuth');
const localAuth = require('../../services/auth/localAuth');
const tokenService = require('../../services/auth/tokenService');
const auditLogger = require('../../services/storage/auditLogger');
const config = require('../../config');
const { redirectIfUserAuthenticated } = require('../../middlewares/userAuth');

router.get('/login', redirectIfUserAuthenticated, (req, res) => {
  res.render('user/login', {
    title: 'Login Utente',
    error: null
  });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    let user;

    if (config.ldap.enabled) {
      try {
        user = await ldapAuth.authenticate(username, password);
      } catch (error) {
        return res.render('user/login', {
          title: 'Login Utente',
          error: 'Username o password non validi'
        });
      }
    } else {
      try {
        user = await localAuth.authenticate(username, password);
      } catch (error) {
        return res.render('user/login', {
          title: 'Login Utente',
          error: 'Username o password non validi'
        });
      }
    }

    const { token } = tokenService.generateToken(user);

    req.session.user = {
      userKey: user.userKey,
      username: user.username,
      displayName: user.displayName,
      token: token
    };

    await auditLogger.log(
      'USER_LOGIN',
      user.userKey,
      { username, authMethod: config.ldap.enabled ? 'ldap' : 'local' },
      req.id,
      req.ip,
      username
    );

    res.redirect('/user/dashboard');

  } catch (error) {
    res.render('user/login', {
      title: 'Login Utente',
      error: 'Errore durante il login'
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/user/auth/login');
  });
});

module.exports = router;
