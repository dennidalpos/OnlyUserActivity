const express = require('express');

const settingsService = require('../../../services/admin/settingsService');
const {
  summarizeKeys,
  sendAdminApiError,
  buildExportFilename,
  auditAdminAction
} = require('../shared');

const router = express.Router();

router.post('/api/settings/ldap', async (req, res) => {
  try {
    const result = await settingsService.updateLdapSettings(req.body);

    await auditAdminAction(req, 'SETTINGS_UPDATE', {
      type: 'ldap',
      changedKeys: summarizeKeys(req.body)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
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
    sendAdminApiError(res, error);
  }
});

router.post('/api/settings/https', async (req, res) => {
  try {
    const result = await settingsService.updateHttpsSettings(req.body);

    await auditAdminAction(req, 'SETTINGS_UPDATE', {
      type: 'https',
      changedKeys: summarizeKeys(req.body)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.post('/api/settings/server', async (req, res) => {
  try {
    const result = await settingsService.updateServerSettings(req.body);

    await auditAdminAction(req, 'SETTINGS_UPDATE', {
      type: 'server',
      changedKeys: summarizeKeys(req.body)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.get('/api/settings/server/export', async (req, res) => {
  try {
    const sections = typeof req.query.sections === 'string'
      ? req.query.sections.split(',').map(section => section.trim()).filter(Boolean)
      : null;
    const payload = await settingsService.exportServerConfiguration({ sections });
    const filename = buildExportFilename({
      timestamp: new Date(),
      ext: 'json'
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.post('/api/settings/server/import', async (req, res) => {
  try {
    const sections = Array.isArray(req.body?.sections) ? req.body.sections : null;
    const payload = req.body?.payload || req.body;
    const result = await settingsService.importServerConfiguration(payload, { sections });

    await auditAdminAction(req, 'SETTINGS_UPDATE', {
      type: 'server-import',
      sections,
      payloadKeys: summarizeKeys(payload)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.get('/api/settings/configuration/export', async (req, res) => {
  try {
    const sections = typeof req.query.sections === 'string'
      ? req.query.sections.split(',').map(section => section.trim()).filter(Boolean)
      : null;
    const payload = await settingsService.exportFullConfiguration({ sections });
    const filename = buildExportFilename({
      timestamp: new Date(),
      ext: 'json'
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.post('/api/settings/configuration/import', async (req, res) => {
  try {
    const sections = Array.isArray(req.body?.sections) ? req.body.sections : null;
    const payload = req.body?.payload || req.body;
    const result = await settingsService.importFullConfiguration(payload, { sections });
    res.json({ success: true, data: result });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.post('/api/settings/advanced', async (req, res) => {
  try {
    const result = await settingsService.updateAdvancedSettings(req.body);

    await auditAdminAction(req, 'SETTINGS_UPDATE', {
      type: 'advanced',
      changedKeys: summarizeKeys(req.body)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
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
    sendAdminApiError(res, error);
  }
});

module.exports = router;
