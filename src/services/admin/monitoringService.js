const userStorage = require('../storage/userStorage');
const activityService = require('../activity/activityService');

/**
 * Servizio monitoraggio attività utenti per admin
 */
class MonitoringService {
  /**
   * Ottieni stato attività di tutti gli utenti per una data
   * @param {string} date - YYYY-MM-DD
   * @param {Object} filters - { username?, status? }
   * @returns {Object}
   */
  async getDailyStatus(date, filters = {}) {
    const allUsers = await userStorage.listAll();
    const userStatuses = [];

    for (const user of allUsers) {
      // Filtro username
      if (filters.username && !user.username.toLowerCase().includes(filters.username.toLowerCase())) {
        continue;
      }

      const dayData = await activityService.getDayActivities(user.userKey, date);
      const status = this.determineStatus(dayData.summary);

      // Filtro status
      if (filters.status && status !== filters.status) {
        continue;
      }

      userStatuses.push({
        userKey: user.userKey,
        username: user.username,
        displayName: user.displayName,
        totalMinutes: dayData.summary.totalMinutes,
        totalHours: dayData.summary.totalHours,
        completionPercentage: dayData.summary.completionPercentage,
        status
      });
    }

    // Ordina per status (ASSENTE, INCOMPLETO, OK) poi per username
    userStatuses.sort((a, b) => {
      const statusOrder = { 'ASSENTE': 0, 'INCOMPLETO': 1, 'OK': 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.username.localeCompare(b.username);
    });

    const summary = {
      totalUsers: userStatuses.length,
      okCount: userStatuses.filter(u => u.status === 'OK').length,
      incompleteCount: userStatuses.filter(u => u.status === 'INCOMPLETO').length,
      absentCount: userStatuses.filter(u => u.status === 'ASSENTE').length
    };

    return {
      date,
      users: userStatuses,
      summary
    };
  }

  /**
   * Determina status da summary
   * @param {Object} summary
   * @returns {string} OK | INCOMPLETO | ASSENTE
   */
  determineStatus(summary) {
    if (summary.totalMinutes === 0) {
      return 'ASSENTE';
    }
    if (summary.isComplete) {
      return 'OK';
    }
    return 'INCOMPLETO';
  }

  /**
   * Ottieni dettaglio mensile utente
   * @param {string} userKey
   * @param {number} year
   * @param {number} month
   * @returns {Object}
   */
  async getUserMonthDetail(userKey, year, month) {
    // TODO: implementare se necessario
    // Richiede iterazione su tutti i giorni del mese
    throw new Error('Not implemented');
  }
}

module.exports = new MonitoringService();
