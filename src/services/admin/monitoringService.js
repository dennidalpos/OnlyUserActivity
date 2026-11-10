const userStorage = require('../storage/userStorage');
const activityService = require('../activity/activityService');
const shiftTypesService = require('./shiftTypesService');
const config = require('../../config');
const { addDays, isFutureDate } = require('../utils/dateUtils');
const { isWorkingDay } = require('../utils/shiftUtils');
const { determineMonitoringStatus } = require('../utils/statusUtils');

class MonitoringService {
  async getDailyStatus(date, filters = {}) {
    const allUsers = await userStorage.listAll();
    const userStatuses = [];
    const shiftTypes = await shiftTypesService.getShiftTypes();

    for (const user of allUsers) {
      if (filters.username && !user.username.toLowerCase().includes(filters.username.toLowerCase())) {
        continue;
      }

      const workSettings = await shiftTypesService.resolveUserWorkSettings(user, shiftTypes);
      const shiftType = workSettings.shiftType;
      const dayData = await activityService.getDayActivities(user.userKey, date, {
        requiredMinutes: workSettings.requiredMinutes
      });
      const isRequired = isWorkingDay(date, shiftType);
      const isFuture = isFutureDate(date);

      if (!isRequired && !isFuture) {
        dayData.summary.completionPercentage = 100;
        dayData.summary.isComplete = true;
        dayData.summary.requiredMinutes = 0;
      }

      const status = determineMonitoringStatus(dayData.summary, isRequired, isFuture);

      if (filters.status && status !== filters.status) {
        continue;
      }

      userStatuses.push({
        userKey: user.userKey,
        username: user.username,
        displayName: user.displayName,
        userType: user.userType || 'local',
        shift: shiftType?.name || user.shift || '—',
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
    const shiftTypes = await shiftTypesService.getShiftTypes();

    for (const user of allUsers) {
      if (filters.username && !user.username.toLowerCase().includes(filters.username.toLowerCase())) {
        continue;
      }

      const workSettings = await shiftTypesService.resolveUserWorkSettings(user, shiftTypes);
      const shiftType = workSettings.shiftType;
      const stats = await this.calculateUserRangeStats(
        user.userKey,
        fromDate,
        toDate,
        shiftType,
        workSettings.requiredMinutes
      );

      if (filters.status && stats.overallStatus !== filters.status) {
        continue;
      }

      userStatuses.push({
        userKey: user.userKey,
        username: user.username,
        displayName: user.displayName,
        userType: user.userType || 'local',
        shift: shiftType?.name || user.shift || '—',
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

  async calculateUserRangeStats(userKey, fromDate, toDate, shiftType, requiredMinutes = config.activity.requiredMinutes) {
    const rangeData = await activityService.getActivitiesRange(userKey, fromDate, toDate, { requiredMinutes });
    const dailySummaries = rangeData.dailySummaries || {};

    let totalMinutes = 0;
    let totalDays = 0;
    let completeDays = 0;
    let incompleteDays = 0;
    let absentDays = 0;

    let current = fromDate;
    while (current <= toDate) {
      const isRequired = isWorkingDay(current, shiftType);

      if (!isRequired || isFutureDate(current)) {
        current = addDays(current, 1);
        continue;
      }

      const daySummary = dailySummaries[current] || {
        totalMinutes: 0,
        requiredMinutes,
        isComplete: false
      };

      totalMinutes += daySummary.totalMinutes;
      totalDays++;

      const status = determineMonitoringStatus(daySummary, true);
      if (status === 'OK') completeDays++;
      else if (status === 'INCOMPLETO') incompleteDays++;
      else absentDays++;

      current = addDays(current, 1);
    }

    const totalHours = totalMinutes / 60;
    const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;
    const completionRate = totalDays > 0 ? (completeDays / totalDays) * 100 : 0;

    let overallStatus = 'ASSENTE';
    if (totalDays === 0) {
      overallStatus = 'OK';
    } else if (absentDays === totalDays) {
      overallStatus = 'ASSENTE';
    } else if (incompleteDays > 0 || absentDays > 0) {
      overallStatus = 'INCOMPLETO';
    } else {
      overallStatus = 'OK';
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

  async getUserMonthDetail(userKey, year, month) {
    const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const user = await userStorage.findByUserKey(userKey);
    const workSettings = await shiftTypesService.resolveUserWorkSettings(user);

    return await this.calculateUserRangeStats(
      userKey,
      fromDate,
      toDate,
      workSettings.shiftType,
      workSettings.requiredMinutes
    );
  }

  async getUserIrregularities(userKey, fromDate, toDate, shiftType, requiredMinutes = config.activity.requiredMinutes) {
    const rangeData = await activityService.getActivitiesRange(userKey, fromDate, toDate, { requiredMinutes });
    const summaries = rangeData.dailySummaries || {};
    const irregularities = [];
    let cursor = fromDate;

    while (cursor <= toDate) {
      const isRequired = isWorkingDay(cursor, shiftType);
      if (isRequired && !isFutureDate(cursor)) {
        const summary = summaries[cursor] || {
          totalMinutes: 0,
          requiredMinutes,
          isComplete: false
        };

        const status = determineMonitoringStatus(summary, true, false);
        if (status !== 'OK') {
          irregularities.push({
            date: cursor,
            status,
            totalMinutes: summary.totalMinutes,
            requiredMinutes: summary.requiredMinutes
          });
        }
      }

      cursor = addDays(cursor, 1);
    }

    return irregularities;
  }
}

module.exports = new MonitoringService();
