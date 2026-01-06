const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const fileStorage = require('./fileStorage');
const { extractYearMonth } = require('../utils/dateUtils');

class ActivityStorage {
  constructor() {
    this.activitiesPath = path.join(config.storage.rootPath, 'activities');
  }

  getMonthFilePath(userKey, dateString) {
    const { year, month } = extractYearMonth(dateString);
    const monthStr = String(month).padStart(2, '0');
    return path.join(this.activitiesPath, userKey, String(year), `${monthStr}.json`);
  }

  async loadMonthData(userKey, dateString) {
    const filePath = this.getMonthFilePath(userKey, dateString);
    const data = await fileStorage.readJSON(filePath);

    if (!data) {
      const { year, month } = extractYearMonth(dateString);
      return {
        userKey,
        year,
        month,
        activities: [],
        updatedAt: new Date().toISOString()
      };
    }

    return data;
  }

  async saveMonthData(userKey, dateString, monthData) {
    const filePath = this.getMonthFilePath(userKey, dateString);
    monthData.updatedAt = new Date().toISOString();
    await fileStorage.writeJSON(filePath, monthData);
  }

  async findByDate(userKey, dateString) {
    const monthData = await this.loadMonthData(userKey, dateString);
    return monthData.activities.filter(act => act.date === dateString);
  }

  async findById(userKey, activityId, dateString = null) {
    if (dateString) {
      const monthData = await this.loadMonthData(userKey, dateString);
      return monthData.activities.find(act => act.id === activityId) || null;
    }

    throw new Error('findById richiede dateString per performance');
  }

  async create(userKey, activityData) {
    const now = new Date().toISOString();
    const activity = {
      id: uuidv4(),
      ...activityData,
      createdAt: now,
      updatedAt: now
    };

    const monthData = await this.loadMonthData(userKey, activityData.date);
    monthData.activities.push(activity);
    await this.saveMonthData(userKey, activityData.date, monthData);

    return activity;
  }

  async update(userKey, activityId, dateString, updates) {
    const monthData = await this.loadMonthData(userKey, dateString);
    const index = monthData.activities.findIndex(act => act.id === activityId);

    if (index === -1) {
      throw new Error(`Attività ${activityId} non trovata`);
    }

    const activity = monthData.activities[index];
    monthData.activities[index] = {
      ...activity,
      ...updates,
      id: activity.id,
      date: activity.date,
      createdAt: activity.createdAt,
      updatedAt: new Date().toISOString()
    };

    await this.saveMonthData(userKey, dateString, monthData);
    return monthData.activities[index];
  }

  async delete(userKey, activityId, dateString) {
    const monthData = await this.loadMonthData(userKey, dateString);
    const index = monthData.activities.findIndex(act => act.id === activityId);

    if (index === -1) {
      return false;
    }

    monthData.activities.splice(index, 1);
    await this.saveMonthData(userKey, dateString, monthData);
    return true;
  }

  async findByRange(userKey, fromDate, toDate) {
    const fromParts = fromDate.split('-');
    const toParts = toDate.split('-');
    const fromYear = parseInt(fromParts[0], 10);
    const fromMonth = parseInt(fromParts[1], 10);
    const toYear = parseInt(toParts[0], 10);
    const toMonth = parseInt(toParts[1], 10);

    const allActivities = [];

    for (let year = fromYear; year <= toYear; year++) {
      const startMonth = year === fromYear ? fromMonth : 1;
      const endMonth = year === toYear ? toMonth : 12;

      for (let month = startMonth; month <= endMonth; month++) {
        const dateInMonth = `${year}-${String(month).padStart(2, '0')}-01`;
        try {
          const monthData = await this.loadMonthData(userKey, dateInMonth);
          const filtered = monthData.activities.filter(act => {
            return act.date >= fromDate && act.date <= toDate;
          });
          allActivities.push(...filtered);
        } catch (error) {
          continue;
        }
      }
    }

    return allActivities.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return a.startTime.localeCompare(b.startTime);
    });
  }
}

module.exports = new ActivityStorage();
