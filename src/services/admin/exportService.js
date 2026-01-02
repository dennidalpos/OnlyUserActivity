const { Parser } = require('json2csv');
const userStorage = require('../storage/userStorage');
const activityStorage = require('../storage/activityStorage');
const { calculateDuration } = require('../utils/timeUtils');

/**
 * Servizio export dati per admin
 */
class ExportService {
  /**
   * Export attività in formato JSON o CSV
   * @param {Array<string>} userKeys
   * @param {string} fromDate - YYYY-MM-DD
   * @param {string} toDate - YYYY-MM-DD
   * @param {string} format - 'json' | 'csv'
   * @returns {Object} { data: string, contentType: string }
   */
  async exportActivities(userKeys, fromDate, toDate, format = 'csv') {
    const allActivities = [];

    for (const userKey of userKeys) {
      const user = await userStorage.findByUserKey(userKey);
      if (!user) continue;

      const activities = await activityStorage.findByRange(userKey, fromDate, toDate);

      activities.forEach(act => {
        allActivities.push({
          username: user.username,
          displayName: user.displayName,
          date: act.date,
          startTime: act.startTime,
          endTime: act.endTime,
          durationMinutes: calculateDuration(act.startTime, act.endTime),
          activityType: act.activityType,
          customType: act.customType || '',
          notes: act.notes || ''
        });
      });
    }

    // Ordina per data, username
    allActivities.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.username.localeCompare(b.username);
    });

    if (format === 'json') {
      return {
        data: JSON.stringify(allActivities, null, 2),
        contentType: 'application/json'
      };
    }

    // CSV
    const fields = [
      { label: 'Username', value: 'username' },
      { label: 'Display Name', value: 'displayName' },
      { label: 'Date', value: 'date' },
      { label: 'Start Time', value: 'startTime' },
      { label: 'End Time', value: 'endTime' },
      { label: 'Duration (min)', value: 'durationMinutes' },
      { label: 'Activity Type', value: 'activityType' },
      { label: 'Custom Type', value: 'customType' },
      { label: 'Notes', value: 'notes' }
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(allActivities);

    return {
      data: csv,
      contentType: 'text/csv'
    };
  }
}

module.exports = new ExportService();
