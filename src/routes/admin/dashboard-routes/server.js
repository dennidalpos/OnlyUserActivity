const express = require('express');

const serverService = require('../../../services/admin/serverService');
const {
  sendAdminApiError,
  auditAdminAction
} = require('../shared');

const router = express.Router();

router.get('/api/server/info', async (req, res) => {
  try {
    const info = serverService.getServerInfo();
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.post('/api/server/restart', async (req, res) => {
  try {
    await auditAdminAction(req, 'SERVER_RESTART', {});
    await serverService.restartServer();

    res.json({
      success: true,
      message: 'Server riavvio in corso. Ricarica la pagina tra 5 secondi.'
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

module.exports = router;
