const express = require('express');
const router = express.Router();
const adminAuthService = require('../../services/auth/adminAuthService');
const auditLogger = require('../../services/storage/auditLogger');
const { redirectIfAuthenticated } = require('../../middlewares/adminAuth');

/**
 * GET /admin/login
 * Mostra form login
 */
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('admin/login', {
    title: 'Login Admin',
    error: null
  });
});

/**
 * POST /admin/auth/login
 * Processa login admin
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const adminUser = await adminAuthService.authenticate(username, password);

    // Salva in sessione
    req.session.adminUser = adminUser;

    // Audit log
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
    res.render('admin/login', {
      title: 'Login Admin',
      error: error.message
    });
  }
});

/**
 * GET /admin/auth/logout
 * Logout admin
 */
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

module.exports = router;
