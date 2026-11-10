const express = require('express');
const path = require('path');

const monitoringService = require('../../../services/admin/monitoringService');
const settingsService = require('../../../services/admin/settingsService');
const activityTypesService = require('../../../services/admin/activityTypesService');
const shiftTypesService = require('../../../services/admin/shiftTypesService');
const contractPresetsService = require('../../../services/admin/contractPresetsService');
const userStorage = require('../../../services/storage/userStorage');
const activityStorage = require('../../../services/storage/activityStorage');
const { getCurrentDate } = require('../../../services/utils/dateUtils');
const { calculateDateRange, renderAdminError } = require('../shared');

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    const viewMode = req.query.viewMode || 'year';
    const date = req.query.date || getCurrentDate();
    const filters = {
      username: req.query.username || '',
      status: req.query.status || ''
    };

    let viewData = { viewMode, date, filters };

    if (viewMode === 'day') {
      const data = await monitoringService.getDailyStatus(date, filters);
      viewData = {
        ...viewData,
        users: data.users,
        summary: data.summary,
        fromDate: date,
        toDate: date
      };
    } else {
      const { fromDate, toDate } = calculateDateRange(date, viewMode);
      const data = await monitoringService.getRangeStatus(fromDate, toDate, filters);
      viewData = {
        ...viewData,
        fromDate,
        toDate,
        users: data.users,
        summary: data.summary
      };
    }

    res.render('admin/dashboard', {
      title: 'Dashboard Monitoraggio',
      ...viewData
    });
  } catch (error) {
    renderAdminError(res, error);
  }
});

router.get('/dashboard/users/:userKey/irregularities', async (req, res) => {
  try {
    const { userKey } = req.params;
    const user = await userStorage.findByUserKey(userKey);

    if (!user) {
      return renderAdminError(res, new Error('Utente non trovato'));
    }

    const today = getCurrentDate();
    const currentYear = today.split('-')[0];
    const fromDate = req.query.from || `${currentYear}-01-01`;
    const toDate = req.query.to || today;

    const shiftTypes = await shiftTypesService.getShiftTypes();
    const workSettings = await shiftTypesService.resolveUserWorkSettings(user, shiftTypes);
    const irregularities = await monitoringService.getUserIrregularities(
      userKey,
      fromDate,
      toDate,
      workSettings.shiftType,
      workSettings.requiredMinutes
    );

    res.render('admin/irregularities', {
      title: 'Irregolarità Utente',
      user,
      irregularities,
      fromDate,
      toDate,
      shiftType: workSettings.shiftType
    });
  } catch (error) {
    renderAdminError(res, error);
  }
});

router.get('/export', async (req, res) => {
  try {
    const users = await userStorage.listAll();
    const today = getCurrentDate();
    let minDate = today;

    for (const user of users) {
      try {
        const activities = await activityStorage.findByRange(user.userKey, '2020-01-01', today);
        if (activities.length > 0 && activities[0].date < minDate) {
          minDate = activities[0].date;
        }
      } catch (error) {
      }
    }

    res.render('admin/export', {
      title: 'Export Dati',
      users,
      minDate
    });
  } catch (error) {
    renderAdminError(res, error);
  }
});

router.get('/shifts', async (req, res) => {
  try {
    const [shiftTypes, contractPresets, settings] = await Promise.all([
      shiftTypesService.getShiftTypes(),
      contractPresetsService.getPresets(),
      settingsService.getCurrentSettings()
    ]);

    res.render('admin/shifts', {
      title: 'Configurazione Turni',
      shiftTypes,
      contractPresets,
      settings
    });
  } catch (error) {
    renderAdminError(res, error);
  }
});

router.get('/users', async (req, res) => {
  try {
    const [users, shiftTypes, contractPresets] = await Promise.all([
      settingsService.listLocalUsers(),
      shiftTypesService.getShiftTypes(),
      contractPresetsService.getPresets()
    ]);

    res.render('admin/users', {
      title: 'Gestione Utenti',
      users,
      shiftTypes,
      contractPresets
    });
  } catch (error) {
    renderAdminError(res, error);
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
    renderAdminError(res, error);
  }
});

router.get('/settings', async (req, res) => {
  try {
    const [settings, activityTypes, shiftTypes] = await Promise.all([
      settingsService.getCurrentSettings(),
      activityTypesService.getActivityTypes(),
      shiftTypesService.getShiftTypes()
    ]);

    const projectRoot = process.cwd();

    res.render('admin/settings', {
      title: 'Configurazione Server',
      settings,
      activityTypes,
      shiftTypes,
      projectRoot,
      defaultHttpsCertPath: path.join(projectRoot, 'certs', 'cert.pem'),
      defaultHttpsKeyPath: path.join(projectRoot, 'certs', 'key.pem')
    });
  } catch (error) {
    renderAdminError(res, error);
  }
});

module.exports = router;
