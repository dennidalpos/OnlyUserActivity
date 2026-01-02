const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const fileStorage = require('./fileStorage');
const { extractYearMonth } = require('../utils/dateUtils');

/**
 * Servizio per gestione attività su filesystem
 */
class ActivityStorage {
  constructor() {
    this.activitiesPath = path.join(config.storage.rootPath, 'activities');
  }

  /**
   * Genera path file attività mensile
   * @param {string} userKey
   * @param {string} dateString - YYYY-MM-DD
   * @returns {string}
   */
  getMonthFilePath(userKey, dateString) {
    const { year, month } = extractYearMonth(dateString);
    const monthStr = String(month).padStart(2, '0');
    return path.join(this.activitiesPath, userKey, String(year), `${monthStr}.json`);
  }

  /**
   * Carica attività mensili
   * @param {string} userKey
   * @param {string} dateString
   * @returns {Object}
   */
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

  /**
   * Salva attività mensili
   * @param {string} userKey
   * @param {string} dateString
   * @param {Object} monthData
   */
  async saveMonthData(userKey, dateString, monthData) {
    const filePath = this.getMonthFilePath(userKey, dateString);
    monthData.updatedAt = new Date().toISOString();
    await fileStorage.writeJSON(filePath, monthData);
  }

  /**
   * Trova attività per data
   * @param {string} userKey
   * @param {string} dateString - YYYY-MM-DD
   * @returns {Array<Object>}
   */
  async findByDate(userKey, dateString) {
    const monthData = await this.loadMonthData(userKey, dateString);
    return monthData.activities.filter(act => act.date === dateString);
  }

  /**
   * Trova attività per ID
   * @param {string} userKey
   * @param {string} activityId
   * @param {string} dateString - Per ottimizzazione (opzionale)
   * @returns {Object|null}
   */
  async findById(userKey, activityId, dateString = null) {
    if (dateString) {
      const monthData = await this.loadMonthData(userKey, dateString);
      return monthData.activities.find(act => act.id === activityId) || null;
    }

    // Se data non fornita, cerca in tutti i mesi (lento)
    // TODO: implementare se necessario
    throw new Error('findById richiede dateString per performance');
  }

  /**
   * Crea nuova attività
   * @param {string} userKey
   * @param {Object} activityData
   * @returns {Object}
   */
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

  /**
   * Aggiorna attività esistente
   * @param {string} userKey
   * @param {string} activityId
   * @param {string} dateString
   * @param {Object} updates
   * @returns {Object}
   */
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
      id: activity.id, // Non modificabile
      date: activity.date, // Non modificabile
      createdAt: activity.createdAt, // Non modificabile
      updatedAt: new Date().toISOString()
    };

    await this.saveMonthData(userKey, dateString, monthData);
    return monthData.activities[index];
  }

  /**
   * Elimina attività
   * @param {string} userKey
   * @param {string} activityId
   * @param {string} dateString
   * @returns {boolean}
   */
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

  /**
   * Trova attività in intervallo date
   * @param {string} userKey
   * @param {string} fromDate - YYYY-MM-DD
   * @param {string} toDate - YYYY-MM-DD
   * @returns {Array<Object>}
   */
  async findByRange(userKey, fromDate, toDate) {
    // TODO: implementazione completa richiede iterazione mesi
    // Per semplicità, assumiamo stesso mese
    const monthData = await this.loadMonthData(userKey, fromDate);

    return monthData.activities.filter(act => {
      return act.date >= fromDate && act.date <= toDate;
    });
  }
}

module.exports = new ActivityStorage();
