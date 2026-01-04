const activityStorage = require('../storage/activityStorage');
const { calculateDuration } = require('../utils/timeUtils');
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
    const typeValidation = validateActivityType(
      activityData.activityType,
      activityData.customType
    );

    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    const existingActivities = await activityStorage.findByDate(userKey, activityData.date);

    const overlapCheck = checkTimeOverlap(activityData, existingActivities);
    if (overlapCheck.hasOverlap) {
      const error = new Error(
        overlapCheck.error || 'L\'attività si sovrappone con un\'altra esistente'
      );
      error.code = 'TIME_OVERLAP';
      error.conflictingActivity = overlapCheck.conflictingActivity;
      throw error;
    }

    const continuityCheck = checkContinuity(activityData, existingActivities);
    if (!continuityCheck.isContiguous) {
      const error = new Error(
        `L'attività deve iniziare alle ${continuityCheck.expectedStartTime} (termine dell'attività precedente)`
      );
      error.code = 'NON_CONTIGUOUS';
      error.expectedStartTime = continuityCheck.expectedStartTime;
      error.providedStartTime = continuityCheck.providedStartTime;
      throw error;
    }

    const activity = await activityStorage.create(userKey, activityData);

    activity.durationMinutes = calculateDuration(activity.startTime, activity.endTime);

    return activity;
  }

  async updateActivity(userKey, activityId, date, updates) {
    const current = await activityStorage.findById(userKey, activityId, date);

    if (!current) {
      throw new Error('Attività non trovata');
    }

    const merged = { ...current, ...updates };

    if (updates.activityType || updates.customType) {
      const typeValidation = validateActivityType(
        merged.activityType,
        merged.customType
      );

      if (!typeValidation.valid) {
        throw new Error(typeValidation.error);
      }
    }

    if (updates.startTime || updates.endTime) {
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

    const updated = await activityStorage.update(userKey, activityId, date, updates);
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
}

module.exports = new ActivityService();
