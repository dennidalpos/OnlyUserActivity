const express = require('express');
const router = express.Router();
const adminAuthService = require('../../services/auth/adminAuthService');
const auditLogger = require('../../services/storage/auditLogger');
const { redirectIfAuthenticated } = require('../../middlewares/adminAuth');
const { requireAdminCsrf } = require('../../middlewares/adminCsrf');
const { loginLimiter } = require('../../middlewares/rateLimiter');
const { loginSchema } = require('../../middlewares/validation');

router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('admin/login', {
    title: 'Login Admin',
    error: null
  });
});

router.post('/login', loginLimiter, requireAdminCsrf, async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).render('admin/login', {
        title: 'Login Admin',
        error: error.details[0]?.message || 'Dati di login non validi'
      });
    }

    const { username, password } = value;

    const adminUser = await adminAuthService.authenticate(username, password);

    req.session.adminUser = adminUser;

    await auditLogger.log(
      'ADMIN_LOGIN',
      'admin',
      { username },
      req.id,
      req.ip,
      username
    );

    res.redirect('/admin/dashboard');

  } catch (error) {
    res.status(401).render('admin/login', {
      title: 'Login Admin',
      error: error.message || 'Errore durante il login'
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/auth/login');
  });
});

module.exports = router;
