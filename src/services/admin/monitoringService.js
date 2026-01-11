const userStorage = require('../storage/userStorage');
const activityService = require('../activity/activityService');
const shiftTypesService = require('./shiftTypesService');
const config = require('../../config');
const { addDays, isFutureDate } = require('../utils/dateUtils');
const { findShiftType, isWorkingDay } = require('../utils/shiftUtils');
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

      const shiftType = findShiftType(shiftTypes, user.shift);
      const dayData = await activityService.getDayActivities(user.userKey, date);
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

      const shiftType = findShiftType(shiftTypes, user.shift);
      const stats = await this.calculateUserRangeStats(user.userKey, fromDate, toDate, shiftType);

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

  async calculateUserRangeStats(userKey, fromDate, toDate, shiftType) {
    // Fetch all activities in one call instead of N calls
    const rangeData = await activityService.getActivitiesRange(userKey, fromDate, toDate);
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

      // Use pre-fetched summary instead of calling getDayActivities
      const daySummary = dailySummaries[current] || {
        totalMinutes: 0,
        requiredMinutes: config.activity.requiredMinutes,
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
    const shiftTypes = await shiftTypesService.getShiftTypes();
    const shiftType = findShiftType(shiftTypes, user?.shift);

    return await this.calculateUserRangeStats(userKey, fromDate, toDate, shiftType);
  }

  async getUserIrregularities(userKey, fromDate, toDate, shiftType) {
    const rangeData = await activityService.getActivitiesRange(userKey, fromDate, toDate);
    const summaries = rangeData.dailySummaries || {};
    const irregularities = [];
    let cursor = fromDate;

    while (cursor <= toDate) {
      const isRequired = isWorkingDay(cursor, shiftType);
      if (isRequired && !isFutureDate(cursor)) {
        const summary = summaries[cursor] || {
          totalMinutes: 0,
          requiredMinutes: config.activity.requiredMinutes,
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
