const config = require('../../config');

/**
 * Determine activity status for a day
 * @param {Object} summary - Day summary with totalMinutes, requiredMinutes, isComplete
 * @param {boolean} isRequired - Whether work is required this day
 * @param {boolean} isFuture - Whether this is a future date
 * @returns {string} Status: 'OK', 'Incompleto', 'Non inserito', 'ASSENTE', 'INCOMPLETO'
 */
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

/**
 * Determine monitoring status (uppercase variant for admin views)
 * @param {Object} summary - Day summary
 * @param {boolean} isRequired - Whether work is required
 * @param {boolean} isFuture - Whether future date
 * @returns {string} Status: 'OK', 'INCOMPLETO', 'ASSENTE'
 */
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
