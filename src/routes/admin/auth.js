const express = require('express');
const router = express.Router();
const adminAuthService = require('../../services/auth/adminAuthService');
const auditLogger = require('../../services/storage/auditLogger');
const { redirectIfAuthenticated } = require('../../middlewares/adminAuth');

router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('admin/login', {
    title: 'Login Admin',
    error: null
  });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

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
    res.render('admin/login', {
      title: 'Login Admin',
      error: error.message
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/auth/login');
  });
});

module.exports = router;
