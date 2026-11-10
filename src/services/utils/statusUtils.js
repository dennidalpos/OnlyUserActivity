const config = require('../../config');

function determineDayStatus(summary, isRequired = true, isFuture = false) {
  if (!isRequired || isFuture) {
    return 'OK';
  }

  if (!summary || summary.totalMinutes === 0) {
    return 'Non inserito';
  }

  const requiredMinutes = summary.requiredMinutes || config.activity.requiredMinutes;
  const completionPercentage = requiredMinutes > 0
    ? Math.min(100, Math.round((summary.totalMinutes / requiredMinutes) * 100))
    : 0;

  if (completionPercentage === 100 || summary.isComplete) {
    return 'OK';
  }

  return 'Incompleto';
}

function determineMonitoringStatus(summary, isRequired = true, isFuture = false) {
  if (!isRequired || isFuture) {
    return 'OK';
  }

  if (!summary || summary.totalMinutes === 0) {
    return 'ASSENTE';
  }

  if (summary.isComplete) {
    return 'OK';
  }

  return 'INCOMPLETO';
}

module.exports = {
  determineDayStatus,
  determineMonitoringStatus
};
