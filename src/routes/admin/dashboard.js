const express = require('express');
const { requireAdminAuth } = require('../../middlewares/adminAuth');
const { requireAdminCsrf } = require('../../middlewares/adminCsrf');

const pagesRouter = require('./dashboard-routes/pages');
const exportAndMonitoringRouter = require('./dashboard-routes/export-and-monitoring');
const catalogRouter = require('./dashboard-routes/catalog');
const settingsRouter = require('./dashboard-routes/settings');
const usersRouter = require('./dashboard-routes/users');
const serverRouter = require('./dashboard-routes/server');

const router = express.Router();

router.use(requireAdminAuth);
router.use(requireAdminCsrf);

router.use(pagesRouter);
router.use(exportAndMonitoringRouter);
router.use(catalogRouter);
router.use(settingsRouter);
router.use(usersRouter);
router.use(serverRouter);

module.exports = router;
