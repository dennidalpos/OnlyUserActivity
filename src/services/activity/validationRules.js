const { timeToMinutes, calculateDuration } = require('../utils/timeUtils');
const config = require('../../config');

function checkTimeOverlap(newActivity, existingActivities, excludeId = null) {
  const newStart = timeToMinutes(newActivity.startTime);
  const newEnd = timeToMinutes(newActivity.endTime);

  if (newStart >= newEnd) {
    return {
      hasOverlap: true,
      error: 'L\'orario di fine deve essere successivo all\'orario di inizio'
    };
  }

  for (const activity of existingActivities) {
    if (excludeId && activity.id === excludeId) continue;

    const existStart = timeToMinutes(activity.startTime);
    const existEnd = timeToMinutes(activity.endTime);

    if (newStart < existEnd && newEnd > existStart) {
      return {
        hasOverlap: true,
        conflictingActivity: {
          id: activity.id,
          startTime: activity.startTime,
          endTime: activity.endTime
        }
      };
    }
  }

  return { hasOverlap: false };
}

function checkContinuity(newActivity, existingActivities, excludeId = null) {
  const strictMode = config.activity.strictContinuity;

  if (!strictMode || existingActivities.length === 0) {
    return { isContiguous: true };
  }

  const filtered = existingActivities
    .filter(act => !excludeId || act.id !== excludeId)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  if (filtered.length === 0) {
    return { isContiguous: true };
  }

  const lastActivity = filtered[filtered.length - 1];
  const expectedStart = lastActivity.endTime;

  if (newActivity.startTime !== expectedStart) {
    return {
      isContiguous: false,
      expectedStartTime: expectedStart,
      providedStartTime: newActivity.startTime
    };
  }

  return { isContiguous: true };
}

function calculateDailySummary(activities) {
  const REQUIRED_MINUTES = config.activity.requiredMinutes;

  const totalMinutes = activities.reduce((sum, act) => {
    const duration = calculateDuration(act.startTime, act.endTime);
    return sum + duration;
  }, 0);

  const totalHours = totalMinutes / 60;
  const completionPercentage = Math.min(100, (totalMinutes / REQUIRED_MINUTES) * 100);
  const isComplete = totalMinutes >= REQUIRED_MINUTES;
  const isOvertime = totalMinutes > REQUIRED_MINUTES;

  return {
    totalMinutes,
    totalHours: parseFloat(totalHours.toFixed(2)),
    requiredMinutes: REQUIRED_MINUTES,
    completionPercentage: parseFloat(completionPercentage.toFixed(2)),
    isComplete,
    isOvertime,
    overtimeMinutes: isOvertime ? totalMinutes - REQUIRED_MINUTES : 0
  };
}

function validateActivityType(activityType, customType) {
  const { getActivityTypes } = require('../../middlewares/validation');
  const activityTypes = getActivityTypes();

  if (!activityType) {
    return { valid: false, error: 'activityType è obbligatorio' };
  }

  if (!activityTypes.includes(activityType)) {
    return {
      valid: false,
      error: `activityType non valido. Valori ammessi: ${activityTypes.join(', ')}`
    };
  }

  if (activityType === 'altro' && (!customType || customType.trim() === '')) {
    return {
      valid: false,
      error: 'customType è obbligatorio quando activityType è "altro"'
    };
  }

  return { valid: true };
}

module.exports = {
  checkTimeOverlap,
  checkContinuity,
  calculateDailySummary,
  validateActivityType
};
