const activityStorage = require('../storage/activityStorage');
const config = require('../../config');
const { calculateDuration, addMinutesToTime } = require('../utils/timeUtils');
const { addDays, getCurrentDate, getMonthRange, isFutureDate } = require('../utils/dateUtils');
const { isWorkingDay } = require('../utils/shiftUtils');
const {
  checkTimeOverlap,
  checkContinuity,
  calculateDailySummary,
  validateActivityType
} = require('./validationRules');

class ActivityService {
  async getDayActivities(userKey, date) {
    const activities = await activityStorage.findByDate(userKey, date);

    activities.sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    const activitiesWithDuration = activities.map(act => ({
      ...act,
      durationMinutes: calculateDuration(act.startTime, act.endTime)
    }));

    const summary = calculateDailySummary(activitiesWithDuration);

    return {
      date,
      activities: activitiesWithDuration,
      summary
    };
  }

  async createActivity(userKey, activityData) {
    const activityPayload = { ...activityData };
    const typeValidation = validateActivityType(
      activityPayload.activityType,
      activityPayload.customType
    );

    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    const existingActivities = await activityStorage.findByDate(userKey, activityPayload.date);

    if (activityPayload.durationHours || activityPayload.durationMinutes) {
      const durationMinutes = (Number(activityPayload.durationHours) * 60) + Number(activityPayload.durationMinutes);
      if (durationMinutes <= 0) {
        throw new Error('La durata deve essere maggiore di 0');
      }
      const sorted = existingActivities.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
      const startTime = sorted.length > 0 ? sorted[sorted.length - 1].endTime : '00:00';
      const endTime = addMinutesToTime(startTime, durationMinutes);

      if (!endTime) {
        throw new Error('La durata supera il limite della giornata');
      }

      activityPayload.startTime = startTime;
      activityPayload.endTime = endTime;
    }
    delete activityPayload.durationHours;
    delete activityPayload.durationMinutes;

    const overlapCheck = checkTimeOverlap(activityPayload, existingActivities);
    if (overlapCheck.hasOverlap) {
      const error = new Error(
        overlapCheck.error || 'L\'attività si sovrappone con un\'altra esistente'
      );
      error.code = 'TIME_OVERLAP';
      error.conflictingActivity = overlapCheck.conflictingActivity;
      throw error;
    }

    const continuityCheck = checkContinuity(activityPayload, existingActivities);
    if (!continuityCheck.isContiguous) {
      const error = new Error(
        `L'attività deve iniziare alle ${continuityCheck.expectedStartTime} (termine dell'attività precedente)`
      );
      error.code = 'NON_CONTIGUOUS';
      error.expectedStartTime = continuityCheck.expectedStartTime;
      error.providedStartTime = continuityCheck.providedStartTime;
      throw error;
    }

    const activity = await activityStorage.create(userKey, activityPayload);

    activity.durationMinutes = calculateDuration(activity.startTime, activity.endTime);

    return activity;
  }

  async updateActivity(userKey, activityId, date, updates) {
    const current = await activityStorage.findById(userKey, activityId, date);

    if (!current) {
      throw new Error('Attività non trovata');
    }

    const updatePayload = { ...updates };
    if (updatePayload.durationHours || updatePayload.durationMinutes) {
      const durationMinutes = (Number(updatePayload.durationHours) * 60) + Number(updatePayload.durationMinutes);
      if (durationMinutes <= 0) {
        throw new Error('La durata deve essere maggiore di 0');
      }
      const endTime = addMinutesToTime(current.startTime, durationMinutes);

      if (!endTime) {
        throw new Error('La durata supera il limite della giornata');
      }

      updatePayload.endTime = endTime;
    }
    delete updatePayload.durationHours;
    delete updatePayload.durationMinutes;

    const merged = { ...current, ...updatePayload };

    if (updatePayload.activityType || updatePayload.customType) {
      const typeValidation = validateActivityType(
        merged.activityType,
        merged.customType
      );

      if (!typeValidation.valid) {
        throw new Error(typeValidation.error);
      }
    }

    if (updatePayload.startTime || updatePayload.endTime) {
      const existingActivities = await activityStorage.findByDate(userKey, date);
      const overlapCheck = checkTimeOverlap(merged, existingActivities, activityId);

      if (overlapCheck.hasOverlap) {
        const error = new Error(
          overlapCheck.error || 'L\'attività si sovrappone con un\'altra esistente'
        );
        error.code = 'TIME_OVERLAP';
        error.conflictingActivity = overlapCheck.conflictingActivity;
        throw error;
      }
    }

    const updated = await activityStorage.update(userKey, activityId, date, updatePayload);
    updated.durationMinutes = calculateDuration(updated.startTime, updated.endTime);

    return updated;
  }

  async deleteActivity(userKey, activityId, date) {
    return await activityStorage.delete(userKey, activityId, date);
  }

  async getActivitiesRange(userKey, fromDate, toDate) {
    const activities = await activityStorage.findByRange(userKey, fromDate, toDate);

    const activitiesWithDuration = activities.map(act => ({
      ...act,
      durationMinutes: calculateDuration(act.startTime, act.endTime)
    }));

    const dailySummaries = {};
    activitiesWithDuration.forEach(act => {
      if (!dailySummaries[act.date]) {
        dailySummaries[act.date] = [];
      }
      dailySummaries[act.date].push(act);
    });

    Object.keys(dailySummaries).forEach(date => {
      dailySummaries[date] = calculateDailySummary(dailySummaries[date]);
    });

    return {
      from: fromDate,
      to: toDate,
      activities: activitiesWithDuration,
      dailySummaries
    };
  }

  async getMonthCalendar(userKey, year, month, shiftType) {
    const { firstDay, lastDay } = getMonthRange(year, month);
    const rangeData = await this.getActivitiesRange(userKey, firstDay, lastDay);
    const summaries = rangeData.dailySummaries || {};

    const days = [];
    let cursor = firstDay;

    while (cursor <= lastDay) {
      const summary = summaries[cursor] || {
        totalMinutes: 0,
        requiredMinutes: config.activity.requiredMinutes,
        isComplete: false
      };

      const isRequired = isWorkingDay(cursor, shiftType);
      const isFuture = isFutureDate(cursor);

      let status = 'Non inserito';
      if (isRequired && !isFuture) {
        if (summary.totalMinutes > 0) {
          status = summary.isComplete ? 'OK' : 'Incompleto';
        }
      }

      days.push({
        date: cursor,
        status,
        totalMinutes: summary.totalMinutes,
        requiredMinutes: summary.requiredMinutes,
        isRequired,
        isFuture
      });

      cursor = addDays(cursor, 1);
    }

    return {
      year,
      month,
      days,
      requiredMinutes: config.activity.requiredMinutes
    };
  }

  async getIrregularDaysOutsideMonth(userKey, year, month, shiftType) {
    const startOfYear = `${year}-01-01`;
    const today = getCurrentDate();
    const rangeData = await this.getActivitiesRange(userKey, startOfYear, today);
    const summaries = rangeData.dailySummaries || {};
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    const irregularDays = [];
    let cursor = startOfYear;

    while (cursor <= today) {
      if (!cursor.startsWith(monthPrefix) && isWorkingDay(cursor, shiftType)) {
        const summary = summaries[cursor] || {
          totalMinutes: 0,
          requiredMinutes: config.activity.requiredMinutes,
          isComplete: false
        };

        let status = 'Non inserito';
        if (summary.totalMinutes > 0) {
          status = summary.isComplete ? 'OK' : 'Incompleto';
        }

        if (status !== 'OK') {
          irregularDays.push({
            date: cursor,
            status,
            totalMinutes: summary.totalMinutes
          });
        }
      }

      cursor = addDays(cursor, 1);
    }

    return irregularDays;
  }
}

module.exports = new ActivityService();
