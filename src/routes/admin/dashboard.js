const express = require('express');
const path = require('path');
const router = express.Router();
const monitoringService = require('../../services/admin/monitoringService');
const exportService = require('../../services/admin/exportService');
const settingsService = require('../../services/admin/settingsService');
const activityTypesService = require('../../services/admin/activityTypesService');
const shiftTypesService = require('../../services/admin/shiftTypesService');
const contractPresetsService = require('../../services/admin/contractPresetsService');
const serverService = require('../../services/admin/serverService');
const auditLogger = require('../../services/storage/auditLogger');
const userStorage = require('../../services/storage/userStorage');
const activityStorage = require('../../services/storage/activityStorage');
const { requireAdminAuth } = require('../../middlewares/adminAuth');
const { getCurrentDate } = require('../../services/utils/dateUtils');
const { findShiftType } = require('../../services/utils/shiftUtils');
const { reloadActivityTypes } = require('../../middlewares/validation');
const adminAuthService = require('../../services/auth/adminAuthService');

router.use(requireAdminAuth);

router.get('/dashboard', async (req, res) => {
  try {
    const viewMode = req.query.viewMode || 'year';
    const date = req.query.date || getCurrentDate();
    const filters = {
      username: req.query.username || '',
      status: req.query.status || ''
    };

    let data;
    let viewData = { viewMode, date, filters };

    if (viewMode === 'day') {
      data = await monitoringService.getDailyStatus(date, filters);
      viewData.users = data.users;
      viewData.summary = data.summary;
      viewData.fromDate = date;
      viewData.toDate = date;
    } else {
      const { fromDate, toDate } = calculateDateRange(date, viewMode);
      data = await monitoringService.getRangeStatus(fromDate, toDate, filters);
      viewData.fromDate = fromDate;
      viewData.toDate = toDate;
      viewData.users = data.users;
      viewData.summary = data.summary;
    }

    res.render('admin/dashboard', {
      title: 'Dashboard Monitoraggio',
      ...viewData
    });

  } catch (error) {
    res.render('errors/error', {
      title: 'Errore',
      error: error.message
    });
  }
});

router.get('/dashboard/users/:userKey/irregularities', async (req, res) => {
  try {
    const { userKey } = req.params;
    const user = await userStorage.findByUserKey(userKey);

    if (!user) {
      return res.render('errors/error', {
        title: 'Errore',
        error: 'Utente non trovato'
      });
    }

    const today = getCurrentDate();
    const currentYear = today.split('-')[0];
    const fromDate = req.query.from || `${currentYear}-01-01`;
    const toDate = req.query.to || today;

    const shiftTypes = await shiftTypesService.getShiftTypes();
    const shiftType = findShiftType(shiftTypes, user.shift);
    const irregularities = await monitoringService.getUserIrregularities(
      userKey,
      fromDate,
      toDate,
      shiftType
    );

    res.render('admin/irregularities', {
      title: 'Irregolarità Utente',
      user,
      irregularities,
      fromDate,
      toDate,
      shiftType
    });
  } catch (error) {
    res.render('errors/error', {
      title: 'Errore',
      error: error.message
    });
  }
});

function calculateDateRange(date, viewMode) {
  const d = new Date(date);
  let fromDate, toDate;

  if (viewMode === 'week') {
    const dayOfWeek = d.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    fromDate = monday.toISOString().split('T')[0];
    toDate = sunday.toISOString().split('T')[0];
  } else if (viewMode === 'month') {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();

    fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
    toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  } else if (viewMode === 'year') {
    const year = d.getFullYear();
    const today = getCurrentDate();
    const currentYear = today.split('-')[0];

    fromDate = `${year}-01-01`;
    toDate = year === Number(currentYear)
      ? today
      : `${year}-12-31`;
  } else {
    fromDate = toDate = date;
  }

  return { fromDate, toDate };
}

router.get('/export', async (req, res) => {
  try {
    const users = await userStorage.listAll();

    let minDate = getCurrentDate();
    const today = getCurrentDate();

    for (const user of users) {
      try {
        const activities = await activityStorage.findByRange(user.userKey, '2020-01-01', today);
        if (activities.length > 0) {
          const userMinDate = activities[0].date;
          if (userMinDate < minDate) {
            minDate = userMinDate;
          }
        }
      } catch (err) {
      }
    }

    res.render('admin/export', {
      title: 'Export Dati',
      users,
      minDate
    });
  } catch (error) {
    res.render('errors/error', {
      title: 'Errore',
      error: error.message
    });
  }
});

router.post('/api/export', async (req, res) => {
  try {
    const { userKeys, fromDate, toDate, format, exportType, rangeType } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        error: 'Parametri mancanti'
      });
    }

    let finalUserKeys = userKeys;
    if (!userKeys || userKeys === 'all' || (Array.isArray(userKeys) && userKeys.length === 0)) {
      finalUserKeys = ['all'];
    } else if (!Array.isArray(userKeys)) {
      finalUserKeys = [userKeys];
    }

    await auditLogger.log(
      'EXPORT',
      'admin',
      { userKeys: finalUserKeys, fromDate, toDate, format, exportType, rangeType },
      req.id,
      req.ip,
      req.adminUser.username
    );

    const ext = format === 'xlsx' ? 'xlsx' : format === 'json' ? 'json' : 'csv';
    const filename = `export_${rangeType || 'custom'}_${fromDate}_${toDate}.${ext}`;

    if (format === 'csv' || !format) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const stream = await exportService.createExportStream(
        finalUserKeys,
        fromDate,
        toDate,
        exportType || 'detailed'
      );

      stream.pipe(res);
      stream.on('error', (error) => {
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: error.message });
        }
      });
      return;
    }

    const result = await exportService.exportActivities(
      finalUserKeys,
      fromDate,
      toDate,
      format,
      exportType || 'detailed'
    );

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result.data);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/api/monitoring', async (req, res) => {
  try {
    const date = req.query.date || getCurrentDate();
    const filters = {
      username: req.query.username || '',
      status: req.query.status || ''
    };

    const data = await monitoringService.getDailyStatus(date, filters);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/shifts', async (req, res) => {
  try {
    const shiftTypes = await shiftTypesService.getShiftTypes();
    const contractPresets = await contractPresetsService.getPresets();
    const settings = await settingsService.getCurrentSettings();

    res.render('admin/shifts', {
      title: 'Configurazione Turni',
      shiftTypes,
      contractPresets,
      settings
    });
  } catch (error) {
    res.render('errors/error', {
      title: 'Errore',
      error: error.message
    });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await settingsService.listLocalUsers();
    const shiftTypes = await shiftTypesService.getShiftTypes();
    const contractPresets = await contractPresetsService.getPresets();

    res.render('admin/users', {
      title: 'Gestione Utenti',
      users,
      shiftTypes,
      contractPresets
    });
  } catch (error) {
    res.render('errors/error', {
      title: 'Errore',
      error: error.message
    });
  }
});

router.get('/quick-actions', async (req, res) => {
  try {
    const quickActions = await settingsService.getQuickActions();

    res.render('admin/quick-actions', {
      title: 'Quick Action',
      quickActions
    });
  } catch (error) {
    res.render('errors/error', {
      title: 'Errore',
      error: error.message
    });
  }
});

router.get('/api/quick-actions', async (req, res) => {
  try {
    const quickActions = await settingsService.getQuickActions();
    res.json({
      success: true,
      data: quickActions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/quick-actions', async (req, res) => {
  try {
    const quickActions = await settingsService.addQuickAction(req.body);

    await auditLogger.log(
      'QUICK_ACTION_ADD',
      'admin',
      { quickAction: req.body },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: quickActions
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/api/quick-actions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const quickActions = await settingsService.updateQuickAction(id, req.body);

    await auditLogger.log(
      'QUICK_ACTION_UPDATE',
      'admin',
      { id, updates: req.body },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: quickActions
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/api/quick-actions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const quickActions = await settingsService.removeQuickAction(id);

    await auditLogger.log(
      'QUICK_ACTION_DELETE',
      'admin',
      { id },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: quickActions
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/api/shift-types', async (req, res) => {
  try {
    const shiftTypes = await shiftTypesService.getShiftTypes();
    res.json({
      success: true,
      data: shiftTypes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/api/contract-presets', async (req, res) => {
  try {
    const presets = await contractPresetsService.getPresets();
    res.json({
      success: true,
      data: presets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/contract-presets', async (req, res) => {
  try {
    const preset = await contractPresetsService.addPreset(req.body);

    await auditLogger.log(
      'CONTRACT_PRESET_ADD',
      'admin',
      { preset },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: preset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/api/contract-presets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await contractPresetsService.removePreset(id);

    await auditLogger.log(
      'CONTRACT_PRESET_DELETE',
      'admin',
      { id },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/shift-types', async (req, res) => {
  try {
    const shiftType = await shiftTypesService.addShiftType(req.body);

    await auditLogger.log(
      'SHIFT_TYPE_ADD',
      'admin',
      { shiftType },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: shiftType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/api/shift-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const shiftType = await shiftTypesService.updateShiftType(id, req.body);

    await auditLogger.log(
      'SHIFT_TYPE_UPDATE',
      'admin',
      { id, updates: req.body },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: shiftType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/api/shift-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await shiftTypesService.removeShiftType(id);

    await auditLogger.log(
      'SHIFT_TYPE_DELETE',
      'admin',
      { id },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const settings = await settingsService.getCurrentSettings();
    const activityTypes = await activityTypesService.getActivityTypes();
    const shiftTypes = await shiftTypesService.getShiftTypes();
    const projectRoot = process.cwd();
    const defaultHttpsCertPath = path.join(projectRoot, 'certs', 'cert.pem');
    const defaultHttpsKeyPath = path.join(projectRoot, 'certs', 'key.pem');

    res.render('admin/settings', {
      title: 'Configurazione Server',
      settings,
      activityTypes,
      shiftTypes,
      projectRoot,
      defaultHttpsCertPath,
      defaultHttpsKeyPath
    });
  } catch (error) {
    res.render('errors/error', {
      title: 'Errore',
      error: error.message
    });
  }
});

router.post('/api/settings/ldap', async (req, res) => {
  try {
    const result = await settingsService.updateLdapSettings(req.body);

    await auditLogger.log(
      'SETTINGS_UPDATE',
      'admin',
      { type: 'ldap', changes: req.body },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/settings/ldap/test-bind', async (req, res) => {
  try {
    const result = await settingsService.testLdapBind(req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/settings/https', async (req, res) => {
  try {
    const result = await settingsService.updateHttpsSettings(req.body);

    await auditLogger.log(
      'SETTINGS_UPDATE',
      'admin',
      { type: 'https', changes: req.body },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/settings/server', async (req, res) => {
  try {
    const result = await settingsService.updateServerSettings(req.body);

    await auditLogger.log(
      'SETTINGS_UPDATE',
      'admin',
      { type: 'server', changes: req.body },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/api/settings/server/export', async (req, res) => {
  try {
    const sections = typeof req.query.sections === 'string'
      ? req.query.sections.split(',').map(section => section.trim()).filter(Boolean)
      : null;
    const payload = await settingsService.exportServerConfiguration({ sections });
    const filename = `config_server_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/settings/server/import', async (req, res) => {
  try {
    const sections = Array.isArray(req.body?.sections)
      ? req.body.sections
      : null;
    const payload = req.body?.payload || req.body;
    const result = await settingsService.importServerConfiguration(payload, { sections });

    await auditLogger.log(
      'SETTINGS_UPDATE',
      'admin',
      { type: 'server-import', changes: payload, sections },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/api/settings/configuration/export', async (req, res) => {
  try {
    const sections = typeof req.query.sections === 'string'
      ? req.query.sections.split(',').map(section => section.trim()).filter(Boolean)
      : null;
    const payload = await settingsService.exportFullConfiguration({ sections });
    const filename = `config_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/settings/configuration/import', async (req, res) => {
  try {
    const sections = Array.isArray(req.body?.sections)
      ? req.body.sections
      : null;
    const payload = req.body?.payload || req.body;
    const result = await settingsService.importFullConfiguration(payload, { sections });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/settings/advanced', async (req, res) => {
  try {
    const result = await settingsService.updateAdvancedSettings(req.body);

    await auditLogger.log(
      'SETTINGS_UPDATE',
      'admin',
      { type: 'advanced', changes: req.body },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/settings/troubleshoot', async (req, res) => {
  try {
    const { type, payload } = req.body || {};
    let result;

    if (type === 'storage') {
      result = await settingsService.testStorageAccess(payload?.rootPath);
    } else if (type === 'https') {
      result = await settingsService.testHttpsFiles(payload?.certPath, payload?.keyPath);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Tipo di test non valido'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/api/settings/activity-types', async (req, res) => {
  try {
    const types = await activityTypesService.getActivityTypes();
    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/settings/activity-types', async (req, res) => {
  try {
    const { activityTypes } = req.body;
    const result = await activityTypesService.setActivityTypes(activityTypes);
    await reloadActivityTypes();

    await auditLogger.log(
      'SETTINGS_UPDATE',
      'admin',
      { type: 'activity-types', activityTypes: result },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/settings/activity-types/add', async (req, res) => {
  try {
    const { activityType } = req.body;
    const result = await activityTypesService.addActivityType(activityType);
    await reloadActivityTypes();

    await auditLogger.log(
      'ACTIVITY_TYPE_ADD',
      'admin',
      { activityType },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/api/settings/activity-types/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const result = await activityTypesService.removeActivityType(type);
    await reloadActivityTypes();

    await auditLogger.log(
      'ACTIVITY_TYPE_REMOVE',
      'admin',
      { activityType: type },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/api/users', async (req, res) => {
  try {
    const users = await settingsService.listLocalUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/users', async (req, res) => {
  try {
    const user = await settingsService.createLocalUser(req.body);

    await auditLogger.log(
      'USER_CREATE',
      'admin',
      { username: user.username },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/api/users/:userKey/shift', async (req, res) => {
  try {
    const { userKey } = req.params;
    const { shift } = req.body;

    const result = await settingsService.updateUserShift(userKey, shift);

    await auditLogger.log(
      'USER_SHIFT_UPDATE',
      'admin',
      { userKey, shift },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/api/users/:userKey', async (req, res) => {
  try {
    const { userKey } = req.params;
    const updates = req.body;

    const result = await settingsService.updateUser(userKey, updates);

    await auditLogger.log(
      'USER_UPDATE',
      'admin',
      { userKey, updates },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/api/users/:userKey', async (req, res) => {
  try {
    const { userKey } = req.params;
    const result = await settingsService.deleteLocalUser(userKey);

    await auditLogger.log(
      'USER_DELETE',
      'admin',
      { userKey },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/users/:userKey/reset-password', async (req, res) => {
  try {
    const { userKey } = req.params;
    const { newPassword } = req.body;
    const result = await settingsService.resetLocalUserPassword(userKey, newPassword);

    await auditLogger.log(
      'USER_PASSWORD_RESET',
      'admin',
      { userKey },
      req.id,
      req.ip,
      req.adminUser.username
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
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

    await auditLogger.log(
      'ADMIN_PASSWORD_RESET',
      'admin',
      { username: req.adminUser.username },
      req.id,
      req.ip,
      req.adminUser.username
    );

    req.session.destroy(() => {
      res.json({
        success: true,
        message: 'Password admin aggiornata con successo. Effettua nuovamente il login.',
        requiresLogin: true
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/api/server/info', async (req, res) => {
  try {
    const info = serverService.getServerInfo();
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/api/server/restart', async (req, res) => {
  try {
    await auditLogger.log(
      'SERVER_RESTART',
      'admin',
      {},
      req.id,
      req.ip,
      req.adminUser.username
    );

    const result = await serverService.restartServer();

    res.json({
      success: true,
      message: 'Server riavvio in corso. Ricarica la pagina tra 5 secondi.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
