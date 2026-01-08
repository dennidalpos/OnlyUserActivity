const express = require('express');
const router = express.Router();
const activityService = require('../../services/activity/activityService');
const shiftTypesService = require('../../services/admin/shiftTypesService');
const auditLogger = require('../../services/storage/auditLogger');
const userStorage = require('../../services/storage/userStorage');
const authenticateToken = require('../../middlewares/auth');
const { validate, getActivitySchema, getActivityUpdateSchema, getActivityTypes } = require('../../middlewares/validation');
const { AppError } = require('../../middlewares/errorHandler');
const { validateDateFormat } = require('../../services/utils/timeUtils');
const { extractYearMonth } = require('../../services/utils/dateUtils');
const { findShiftType } = require('../../services/utils/shiftUtils');

router.use(authenticateToken);

router.get('/types', async (req, res, next) => {
  try {
    const types = await getActivityTypes();
    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    next(error);
  }
});

router.get('/month', async (req, res, next) => {
  try {
    const date = req.query.date;
    if (!date) {
      throw new AppError('Query parameter "date" richiesto', 400, 'MISSING_DATE');
    }

    const dateValidation = validateDateFormat(date);
    if (!dateValidation.valid) {
      throw new AppError(dateValidation.error, 400, 'INVALID_DATE');
    }

    const { year, month } = extractYearMonth(date);
    const user = await userStorage.findByUserKey(req.user.userKey);
    const shiftTypes = await shiftTypesService.getShiftTypes();
    const shiftType = findShiftType(shiftTypes, user?.shift);

    const monthData = await activityService.getMonthCalendar(req.user.userKey, year, month, shiftType);
    const irregularities = await activityService.getIrregularDaysOutsideMonth(req.user.userKey, year, month, shiftType);

    res.json({
      success: true,
      data: {
        month: {
          year: monthData.year,
          month: monthData.month,
          requiredMinutes: monthData.requiredMinutes
        },
        days: monthData.days,
        shift: shiftType,
        irregularities
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    const userKey = req.user.userKey;

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

router.post('/', validate(getActivitySchema), async (req, res, next) => {
  try {
    const userKey = req.user.userKey;
    const activity = await activityService.createActivity(userKey, req.body);

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

router.put('/:id', validate(getActivityUpdateSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userKey = req.user.userKey;

    const date = req.query.date;
    if (!date) {
      throw new AppError('Query parameter "date" richiesto', 400, 'MISSING_DATE');
    }

    const activity = await activityService.updateActivity(userKey, id, date, req.body);

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

router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const userKey = req.user.userKey;

    if (!from || !to) {
      throw new AppError('Query parameters "from" e "to" richiesti', 400, 'MISSING_PARAMS');
    }

    const fromValidation = validateDateFormat(from);
    const toValidation = validateDateFormat(to);

    if (!fromValidation.valid) {
      throw new AppError(`Data "from" non valida: ${fromValidation.error}`, 400, 'INVALID_DATE');
    }
    if (!toValidation.valid) {
      throw new AppError(`Data "to" non valida: ${toValidation.error}`, 400, 'INVALID_DATE');
    }

    if (from > to) {
      throw new AppError('La data "from" deve essere precedente o uguale a "to"', 400, 'INVALID_DATE_RANGE');
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
