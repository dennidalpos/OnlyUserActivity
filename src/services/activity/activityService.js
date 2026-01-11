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
    const hasDuration = activityPayload.durationHours !== undefined || activityPayload.durationMinutes !== undefined;
    const hasTimes = activityPayload.startTime || activityPayload.endTime;
    const typeValidation = validateActivityType(
      activityPayload.activityType,
      activityPayload.customType
    );

    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    const existingActivities = await activityStorage.findByDate(userKey, activityPayload.date);

    if (hasDuration) {
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

    if (hasTimes && (!activityPayload.startTime || !activityPayload.endTime)) {
      throw new Error('Orario di inizio e fine devono essere specificati insieme');
    }

    const overlapCheck = checkTimeOverlap(activityPayload, existingActivities);
    if (overlapCheck.hasOverlap) {
      const error = new Error(
        overlapCheck.error || 'L\'attività si sovrappone con un\'altra esistente'
      );
      error.code = 'TIME_OVERLAP';
      error.conflictingActivity = overlapCheck.conflictingActivity;
      throw error;
    }

    const newDuration = calculateDuration(activityPayload.startTime, activityPayload.endTime);
    if (activityPayload.activityType !== 'pausa') {
      const existingMinutes = existingActivities.reduce((sum, activity) => {
        if (activity.activityType === 'pausa') {
          return sum;
        }
        return sum + calculateDuration(activity.startTime, activity.endTime);
      }, 0);
      if (existingMinutes + newDuration > 14 * 60) {
        throw new Error('Le ore cumulate non possono superare le 14 ore');
      }
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
    const hasDuration = updatePayload.durationHours !== undefined || updatePayload.durationMinutes !== undefined;
    const hasTimes = updatePayload.startTime || updatePayload.endTime;

    if (hasDuration) {
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

    if (hasTimes && (!updatePayload.startTime || !updatePayload.endTime)) {
      throw new Error('Orario di inizio e fine devono essere specificati insieme');
    }

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

    const existingActivities = await activityStorage.findByDate(userKey, date);

    if (updatePayload.startTime || updatePayload.endTime) {
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

    if (merged.activityType !== 'pausa') {
      const existingMinutes = existingActivities.reduce((sum, activity) => {
        if (activity.id === activityId || activity.activityType === 'pausa') {
          return sum;
        }
        return sum + calculateDuration(activity.startTime, activity.endTime);
      }, 0);
      const updatedDuration = calculateDuration(merged.startTime, merged.endTime);
      if (existingMinutes + updatedDuration > 14 * 60) {
        throw new Error('Le ore cumulate non possono superare le 14 ore');
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
    const activitiesByDate = {};

    (rangeData.activities || []).forEach(activity => {
      if (!activitiesByDate[activity.date]) {
        activitiesByDate[activity.date] = [];
      }
      activitiesByDate[activity.date].push({
        id: activity.id,
        activityType: activity.activityType,
        customType: activity.customType || '',
        startTime: activity.startTime,
        endTime: activity.endTime,
        durationMinutes: calculateDuration(activity.startTime, activity.endTime),
        notes: activity.notes || ''
      });
    });

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
        const requiredMinutes = summary.requiredMinutes || config.activity.requiredMinutes;
        const completionPercentage = requiredMinutes > 0
          ? Math.min(100, Math.round((summary.totalMinutes / requiredMinutes) * 100))
          : 0;

        if (completionPercentage === 0) {
          status = 'Non inserito';
        } else if (completionPercentage === 100) {
          status = 'OK';
        } else {
          status = 'Incompleto';
        }
      }

      days.push({
        date: cursor,
        status,
        totalMinutes: summary.totalMinutes,
        requiredMinutes: summary.requiredMinutes,
        isRequired,
        isFuture,
        activities: activitiesByDate[cursor] || []
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

        const requiredMinutes = summary.requiredMinutes || config.activity.requiredMinutes;
        const completionPercentage = requiredMinutes > 0
          ? Math.min(100, Math.round((summary.totalMinutes / requiredMinutes) * 100))
          : 0;

        let status = 'Non inserito';
        if (completionPercentage === 0) {
          status = 'Non inserito';
        } else if (completionPercentage === 100) {
          status = 'OK';
        } else {
          status = 'Incompleto';
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
