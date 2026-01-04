const userStorage = require('../storage/userStorage');
const activityService = require('../activity/activityService');
const { addDays, getCurrentDate, formatDate } = require('../utils/dateUtils');

class MonitoringService {
  async getDailyStatus(date, filters = {}) {
    const allUsers = await userStorage.listAll();
    const userStatuses = [];

    for (const user of allUsers) {
      if (filters.username && !user.username.toLowerCase().includes(filters.username.toLowerCase())) {
        continue;
      }

      const dayData = await activityService.getDayActivities(user.userKey, date);
      const status = this.determineStatus(dayData.summary);

      if (filters.status && status !== filters.status) {
        continue;
      }

      userStatuses.push({
        userKey: user.userKey,
        username: user.username,
        displayName: user.displayName,
        userType: user.userType || 'local',
        totalMinutes: dayData.summary.totalMinutes,
        totalHours: dayData.summary.totalHours,
        completionPercentage: dayData.summary.completionPercentage,
        status
      });
    }

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

  async getRangeStatus(fromDate, toDate, filters = {}) {
    const allUsers = await userStorage.listAll();
    const userStatuses = [];

    for (const user of allUsers) {
      if (filters.username && !user.username.toLowerCase().includes(filters.username.toLowerCase())) {
        continue;
      }

      const stats = await this.calculateUserRangeStats(user.userKey, fromDate, toDate);

      if (filters.status && stats.overallStatus !== filters.status) {
        continue;
      }

      userStatuses.push({
        userKey: user.userKey,
        username: user.username,
        displayName: user.displayName,
        userType: user.userType || 'local',
        ...stats
      });
    }

    userStatuses.sort((a, b) => {
      const statusOrder = { 'ASSENTE': 0, 'INCOMPLETO': 1, 'OK': 2 };
      const statusDiff = statusOrder[a.overallStatus] - statusOrder[b.overallStatus];
      if (statusDiff !== 0) return statusDiff;
      return b.totalHours - a.totalHours;
    });

    const summary = {
      totalUsers: userStatuses.length,
      okCount: userStatuses.filter(u => u.overallStatus === 'OK').length,
      incompleteCount: userStatuses.filter(u => u.overallStatus === 'INCOMPLETO').length,
      absentCount: userStatuses.filter(u => u.overallStatus === 'ASSENTE').length,
      totalHours: userStatuses.reduce((sum, u) => sum + u.totalHours, 0),
      avgHoursPerUser: userStatuses.length > 0 ? userStatuses.reduce((sum, u) => sum + u.totalHours, 0) / userStatuses.length : 0
    };

    return {
      fromDate,
      toDate,
      users: userStatuses,
      summary
    };
  }

  async calculateUserRangeStats(userKey, fromDate, toDate) {
    let current = fromDate;
    const end = toDate;

    let totalMinutes = 0;
    let totalDays = 0;
    let completeDays = 0;
    let incompleteDays = 0;
    let absentDays = 0;

    while (current <= end) {
      const dayData = await activityService.getDayActivities(userKey, current);
      totalMinutes += dayData.summary.totalMinutes;
      totalDays++;

      const status = this.determineStatus(dayData.summary);
      if (status === 'OK') completeDays++;
      else if (status === 'INCOMPLETO') incompleteDays++;
      else absentDays++;

      current = addDays(current, 1);
    }

    const totalHours = totalMinutes / 60;
    const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;
    const completionRate = totalDays > 0 ? (completeDays / totalDays) * 100 : 0;

    let overallStatus = 'ASSENTE';
    if (completeDays > 0) {
      overallStatus = completionRate >= 80 ? 'OK' : 'INCOMPLETO';
    }

    return {
      totalMinutes,
      totalHours,
      totalDays,
      completeDays,
      incompleteDays,
      absentDays,
      avgHoursPerDay,
      completionRate,
      overallStatus
    };
  }

  determineStatus(summary) {
    if (summary.totalMinutes === 0) {
      return 'ASSENTE';
    }
    if (summary.isComplete) {
      return 'OK';
    }
    return 'INCOMPLETO';
  }

  async getUserMonthDetail(userKey, year, month) {
    const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return await this.calculateUserRangeStats(userKey, fromDate, toDate);
  }
}

module.exports = new MonitoringService();
