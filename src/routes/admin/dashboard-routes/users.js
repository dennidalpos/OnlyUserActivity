const express = require('express');

const settingsService = require('../../../services/admin/settingsService');
const adminAuthService = require('../../../services/auth/adminAuthService');
const {
  summarizeKeys,
  sendAdminApiError,
  auditAdminAction
} = require('../shared');

const router = express.Router();

router.get('/api/users', async (req, res) => {
  try {
    const users = await settingsService.listLocalUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.post('/api/users', async (req, res) => {
  try {
    const user = await settingsService.createLocalUser(req.body);

    await auditAdminAction(req, 'USER_CREATE', {
      username: user.username,
      userType: user.userType || 'local'
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.put('/api/users/:userKey/shift', async (req, res) => {
  try {
    const { userKey } = req.params;
    const { shift } = req.body;

    const result = await settingsService.updateUserShift(userKey, shift);

    await auditAdminAction(req, 'USER_SHIFT_UPDATE', { userKey, shift });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.put('/api/users/:userKey', async (req, res) => {
  try {
    const { userKey } = req.params;
    const updates = req.body;

    const result = await settingsService.updateUser(userKey, updates);

    await auditAdminAction(req, 'USER_UPDATE', {
      userKey,
      updatedFields: summarizeKeys(updates)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.delete('/api/users/:userKey', async (req, res) => {
  try {
    const { userKey } = req.params;
    const result = await settingsService.deleteLocalUser(userKey);

    await auditAdminAction(req, 'USER_DELETE', { userKey });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.post('/api/users/:userKey/reset-password', async (req, res) => {
  try {
    const { userKey } = req.params;
    const { newPassword } = req.body;
    const result = await settingsService.resetLocalUserPassword(userKey, newPassword);

    await auditAdminAction(req, 'USER_PASSWORD_RESET', { userKey });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.post('/api/admin/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Nuova password obbligatoria'
      });
    }

    await adminAuthService.changePassword(req.adminUser.username, newPassword);

    await auditAdminAction(req, 'ADMIN_PASSWORD_RESET', {
      username: req.adminUser.username
    });

    req.session.destroy(() => {
      res.json({
        success: true,
        message: 'Password admin aggiornata con successo. Effettua nuovamente il login.',
        requiresLogin: true
      });
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

module.exports = router;
