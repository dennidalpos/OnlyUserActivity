const express = require('express');

const settingsService = require('../../../services/admin/settingsService');
const activityTypesService = require('../../../services/admin/activityTypesService');
const shiftTypesService = require('../../../services/admin/shiftTypesService');
const contractPresetsService = require('../../../services/admin/contractPresetsService');
const { reloadActivityTypes } = require('../../../middlewares/validation');
const {
  summarizeKeys,
  sendAdminApiError,
  auditAdminAction
} = require('../shared');

const router = express.Router();

router.get('/api/quick-actions', async (req, res) => {
  try {
    const quickActions = await settingsService.getQuickActions();
    res.json({
      success: true,
      data: quickActions
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.post('/api/quick-actions', async (req, res) => {
  try {
    const quickActions = await settingsService.addQuickAction(req.body);

    await auditAdminAction(req, 'QUICK_ACTION_ADD', {
      quickActionLabel: req.body?.label || '',
      changedKeys: summarizeKeys(req.body)
    });

    res.json({
      success: true,
      data: quickActions
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.put('/api/quick-actions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const quickActions = await settingsService.updateQuickAction(id, req.body);

    await auditAdminAction(req, 'QUICK_ACTION_UPDATE', {
      id,
      changedKeys: summarizeKeys(req.body)
    });

    res.json({
      success: true,
      data: quickActions
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.delete('/api/quick-actions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const quickActions = await settingsService.removeQuickAction(id);

    await auditAdminAction(req, 'QUICK_ACTION_DELETE', { id });

    res.json({
      success: true,
      data: quickActions
    });
  } catch (error) {
    sendAdminApiError(res, error);
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
    sendAdminApiError(res, error);
  }
});

router.post('/api/shift-types', async (req, res) => {
  try {
    const shiftType = await shiftTypesService.addShiftType(req.body);

    await auditAdminAction(req, 'SHIFT_TYPE_ADD', {
      shiftTypeId: shiftType.id,
      presetId: shiftType.contract?.presetId || ''
    });

    res.json({
      success: true,
      data: shiftType
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.put('/api/shift-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const shiftType = await shiftTypesService.updateShiftType(id, req.body);

    await auditAdminAction(req, 'SHIFT_TYPE_UPDATE', {
      id,
      changedKeys: summarizeKeys(req.body)
    });

    res.json({
      success: true,
      data: shiftType
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.delete('/api/shift-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await shiftTypesService.removeShiftType(id);

    await auditAdminAction(req, 'SHIFT_TYPE_DELETE', { id });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
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
    sendAdminApiError(res, error);
  }
});

router.post('/api/contract-presets', async (req, res) => {
  try {
    const preset = await contractPresetsService.addPreset(req.body);

    await auditAdminAction(req, 'CONTRACT_PRESET_ADD', {
      presetId: preset.id,
      weeklyHours: preset.weeklyHours
    });

    res.json({
      success: true,
      data: preset
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.delete('/api/contract-presets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await contractPresetsService.removePreset(id);

    await auditAdminAction(req, 'CONTRACT_PRESET_DELETE', { id });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
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
    sendAdminApiError(res, error);
  }
});

router.post('/api/settings/activity-types', async (req, res) => {
  try {
    const { activityTypes } = req.body;
    const result = await activityTypesService.setActivityTypes(activityTypes);
    await reloadActivityTypes();

    await auditAdminAction(req, 'SETTINGS_UPDATE', {
      type: 'activity-types',
      totalTypes: result.length
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.post('/api/settings/activity-types/add', async (req, res) => {
  try {
    const { activityType } = req.body;
    const result = await activityTypesService.addActivityType(activityType);
    await reloadActivityTypes();

    await auditAdminAction(req, 'ACTIVITY_TYPE_ADD', { activityType });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

router.delete('/api/settings/activity-types/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const result = await activityTypesService.removeActivityType(type);
    await reloadActivityTypes();

    await auditAdminAction(req, 'ACTIVITY_TYPE_REMOVE', {
      activityType: type
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    sendAdminApiError(res, error);
  }
});

module.exports = router;
