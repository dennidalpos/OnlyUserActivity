const express = require('express');

const monitoringService = require('../../../services/admin/monitoringService');
const exportService = require('../../../services/admin/exportService');
const { getCurrentDate } = require('../../../services/utils/dateUtils');
const {
  sendAdminApiError,
  buildExportFilename,
  auditAdminAction
} = require('../shared');

const router = express.Router();

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

    await auditAdminAction(req, 'EXPORT', {
      userKeys: finalUserKeys,
      fromDate,
      toDate,
      format,
      exportType,
      rangeType
    });

    const ext = format === 'xlsx' ? 'xlsx' : format === 'json' ? 'json' : 'csv';
    const filename = buildExportFilename({
      timestamp: new Date(),
      ext
    });

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
          sendAdminApiError(res, error);
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
    sendAdminApiError(res, error);
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
    sendAdminApiError(res, error);
  }
});

module.exports = router;
