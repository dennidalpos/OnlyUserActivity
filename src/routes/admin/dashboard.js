const express = require('express');
const router = express.Router();
const monitoringService = require('../../services/admin/monitoringService');
const exportService = require('../../services/admin/exportService');
const auditLogger = require('../../services/storage/auditLogger');
const { requireAdminAuth } = require('../../middlewares/adminAuth');
const { getCurrentDate } = require('../../services/utils/dateUtils');

// Tutte le route richiedono autenticazione admin
router.use(requireAdminAuth);

/**
 * GET /admin/dashboard
 * Dashboard principale con monitoraggio giornaliero
 */
router.get('/dashboard', async (req, res) => {
  try {
    const date = req.query.date || getCurrentDate();
    const filters = {
      username: req.query.username || '',
      status: req.query.status || ''
    };

    const data = await monitoringService.getDailyStatus(date, filters);

    res.render('admin/dashboard', {
      title: 'Dashboard Monitoraggio',
      date,
      filters,
      users: data.users,
      summary: data.summary
    });

  } catch (error) {
    res.render('error', {
      title: 'Errore',
      error: error.message
    });
  }
});

/**
 * GET /admin/export
 * Pagina export dati
 */
router.get('/export', (req, res) => {
  res.render('admin/export', {
    title: 'Export Dati'
  });
});

/**
 * POST /admin/api/export
 * Esegue export
 */
router.post('/api/export', async (req, res) => {
  try {
    const { userKeys, fromDate, toDate, format } = req.body;

    if (!userKeys || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        error: 'Parametri mancanti'
      });
    }

    const result = await exportService.exportActivities(
      Array.isArray(userKeys) ? userKeys : [userKeys],
      fromDate,
      toDate,
      format || 'csv'
    );

    // Audit log
    await auditLogger.log(
      'EXPORT',
      'admin',
      { userKeys, fromDate, toDate, format },
      req.id,
      req.ip,
      req.adminUser.username
    );

    const filename = `export_${fromDate}_${toDate}.${format === 'json' ? 'json' : 'csv'}`;

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

/**
 * GET /admin/api/monitoring
 * API per dati monitoraggio (per AJAX)
 */
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

module.exports = router;
