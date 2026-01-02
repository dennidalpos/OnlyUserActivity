const express = require('express');
const router = express.Router();
const activityService = require('../../services/activity/activityService');
const auditLogger = require('../../services/storage/auditLogger');
const authenticateToken = require('../../middlewares/auth');
const { validate, activitySchema, activityUpdateSchema } = require('../../middlewares/validation');
const { AppError } = require('../../middlewares/errorHandler');
const { validateDateFormat } = require('../../services/utils/timeUtils');

// Tutte le route richiedono autenticazione
router.use(authenticateToken);

/**
 * GET /api/activities/:date
 * Ottiene attività di un giorno specifico
 */
router.get('/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    const userKey = req.user.userKey;

    // Valida data
    const dateValidation = validateDateFormat(date);
    if (!dateValidation.valid) {
      throw new AppError(dateValidation.error, 400, 'INVALID_DATE');
    }

    const result = await activityService.getDayActivities(userKey, date);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/activities
 * Crea nuova attività
 */
router.post('/', validate(activitySchema), async (req, res, next) => {
  try {
    const userKey = req.user.userKey;
    const activity = await activityService.createActivity(userKey, req.body);

    // Audit log
    await auditLogger.log(
      'CREATE_ACTIVITY',
      userKey,
      req.body,
      req.id,
      req.ip,
      req.user.username
    );

    res.status(201).json({
      success: true,
      data: activity
    });

  } catch (error) {
    if (error.code === 'TIME_OVERLAP') {
      return next(new AppError(error.message, 409, 'TIME_OVERLAP', {
        conflictingActivity: error.conflictingActivity
      }));
    }
    if (error.code === 'NON_CONTIGUOUS') {
      return next(new AppError(error.message, 409, 'NON_CONTIGUOUS', {
        expectedStartTime: error.expectedStartTime,
        providedStartTime: error.providedStartTime
      }));
    }
    next(error);
  }
});

/**
 * PUT /api/activities/:id
 * Aggiorna attività esistente
 */
router.put('/:id', validate(activityUpdateSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userKey = req.user.userKey;

    // Richiede date in query per performance
    const date = req.query.date;
    if (!date) {
      throw new AppError('Query parameter "date" richiesto', 400, 'MISSING_DATE');
    }

    const activity = await activityService.updateActivity(userKey, id, date, req.body);

    // Audit log
    await auditLogger.log(
      'UPDATE_ACTIVITY',
      userKey,
      { activityId: id, updates: req.body },
      req.id,
      req.ip,
      req.user.username
    );

    res.json({
      success: true,
      data: activity
    });

  } catch (error) {
    if (error.code === 'TIME_OVERLAP') {
      return next(new AppError(error.message, 409, 'TIME_OVERLAP', {
        conflictingActivity: error.conflictingActivity
      }));
    }
    if (error.message === 'Attività non trovata') {
      return next(new AppError('Attività non trovata', 404, 'NOT_FOUND'));
    }
    next(error);
  }
});

/**
 * DELETE /api/activities/:id
 * Elimina attività
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userKey = req.user.userKey;
    const date = req.query.date;

    if (!date) {
      throw new AppError('Query parameter "date" richiesto', 400, 'MISSING_DATE');
    }

    const deleted = await activityService.deleteActivity(userKey, id, date);

    if (!deleted) {
      throw new AppError('Attività non trovata', 404, 'NOT_FOUND');
    }

    // Audit log
    await auditLogger.log(
      'DELETE_ACTIVITY',
      userKey,
      { activityId: id, date },
      req.id,
      req.ip,
      req.user.username
    );

    res.json({
      success: true,
      data: {
        deleted: true,
        id
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/activities
 * Lista attività in range (query params: from, to)
 */
router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const userKey = req.user.userKey;

    if (!from || !to) {
      throw new AppError('Query parameters "from" e "to" richiesti', 400, 'MISSING_PARAMS');
    }

    // Valida date
    const fromValidation = validateDateFormat(from);
    const toValidation = validateDateFormat(to);

    if (!fromValidation.valid) {
      throw new AppError(`Data "from" non valida: ${fromValidation.error}`, 400, 'INVALID_DATE');
    }
    if (!toValidation.valid) {
      throw new AppError(`Data "to" non valida: ${toValidation.error}`, 400, 'INVALID_DATE');
    }

    const result = await activityService.getActivitiesRange(userKey, from, to);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
