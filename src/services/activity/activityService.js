const activityStorage = require('../storage/activityStorage');
const { calculateDuration } = require('../utils/timeUtils');
const {
  checkTimeOverlap,
  checkContinuity,
  calculateDailySummary,
  validateActivityType
} = require('./validationRules');

/**
 * Servizio business logic per attività
 */
class ActivityService {
  /**
   * Ottiene attività di un giorno con summary
   * @param {string} userKey
   * @param {string} date - YYYY-MM-DD
   * @returns {Object}
   */
  async getDayActivities(userKey, date) {
    const activities = await activityStorage.findByDate(userKey, date);

    // Ordina per startTime
    activities.sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    // Calcola durata per ogni attività
    const activitiesWithDuration = activities.map(act => ({
      ...act,
      durationMinutes: calculateDuration(act.startTime, act.endTime)
    }));

    const summary = calculateDailySummary(activitiesWithDuration);

    return {
      date,
      activities: activitiesWithDuration,
      summary
    };
  }

  /**
   * Crea nuova attività
   * @param {string} userKey
   * @param {Object} activityData
   * @returns {Object}
   */
  async createActivity(userKey, activityData) {
    // Validazione tipo attività
    const typeValidation = validateActivityType(
      activityData.activityType,
      activityData.customType
    );

    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    // Carica attività esistenti del giorno
    const existingActivities = await activityStorage.findByDate(userKey, activityData.date);

    // Verifica sovrapposizioni
    const overlapCheck = checkTimeOverlap(activityData, existingActivities);
    if (overlapCheck.hasOverlap) {
      const error = new Error(
        overlapCheck.error || 'L\'attività si sovrappone con un\'altra esistente'
      );
      error.code = 'TIME_OVERLAP';
      error.conflictingActivity = overlapCheck.conflictingActivity;
      throw error;
    }

    // Verifica continuità (se strict mode)
    const continuityCheck = checkContinuity(activityData, existingActivities);
    if (!continuityCheck.isContiguous) {
      const error = new Error(
        `L'attività deve iniziare alle ${continuityCheck.expectedStartTime} (termine dell'attività precedente)`
      );
      error.code = 'NON_CONTIGUOUS';
      error.expectedStartTime = continuityCheck.expectedStartTime;
      error.providedStartTime = continuityCheck.providedStartTime;
      throw error;
    }

    // Crea attività
    const activity = await activityStorage.create(userKey, activityData);

    // Aggiungi durata
    activity.durationMinutes = calculateDuration(activity.startTime, activity.endTime);

    return activity;
  }

  /**
   * Aggiorna attività esistente
   * @param {string} userKey
   * @param {string} activityId
   * @param {string} date
   * @param {Object} updates
   * @returns {Object}
   */
  async updateActivity(userKey, activityId, date, updates) {
    // Carica attività corrente
    const current = await activityStorage.findById(userKey, activityId, date);

    if (!current) {
      throw new Error('Attività non trovata');
    }

    // Merge updates con dati correnti
    const merged = { ...current, ...updates };

    // Validazione tipo se modificato
    if (updates.activityType || updates.customType) {
      const typeValidation = validateActivityType(
        merged.activityType,
        merged.customType
      );

      if (!typeValidation.valid) {
        throw new Error(typeValidation.error);
      }
    }

    // Se modificati orari, verifica sovrapposizioni
    if (updates.startTime || updates.endTime) {
      const existingActivities = await activityStorage.findByDate(userKey, date);
      const overlapCheck = checkTimeOverlap(merged, existingActivities, activityId);

      if (overlapCheck.hasOverlap) {
        const error = new Error(
          overlapCheck.error || 'L\'attività si sovrappone con un\'altra esistente'
        );
        error.code = 'TIME_OVERLAP';
        error.conflictingActivity = overlapCheck.conflictingActivity;
        throw error;
      }
    }

    // Aggiorna
    const updated = await activityStorage.update(userKey, activityId, date, updates);
    updated.durationMinutes = calculateDuration(updated.startTime, updated.endTime);

    return updated;
  }

  /**
   * Elimina attività
   * @param {string} userKey
   * @param {string} activityId
   * @param {string} date
   * @returns {boolean}
   */
  async deleteActivity(userKey, activityId, date) {
    return await activityStorage.delete(userKey, activityId, date);
  }

  /**
   * Ottiene attività in range
   * @param {string} userKey
   * @param {string} fromDate
   * @param {string} toDate
   * @returns {Object}
   */
  async getActivitiesRange(userKey, fromDate, toDate) {
    const activities = await activityStorage.findByRange(userKey, fromDate, toDate);

    // Aggiungi durata
    const activitiesWithDuration = activities.map(act => ({
      ...act,
      durationMinutes: calculateDuration(act.startTime, act.endTime)
    }));

    // Calcola summary per giorno
    const dailySummaries = {};
    activitiesWithDuration.forEach(act => {
      if (!dailySummaries[act.date]) {
        dailySummaries[act.date] = [];
      }
      dailySummaries[act.date].push(act);
    });

    Object.keys(dailySummaries).forEach(date => {
      dailySummaries[date] = calculateDailySummary(dailySummaries[date]);
    });

    return {
      from: fromDate,
      to: toDate,
      activities: activitiesWithDuration,
      dailySummaries
    };
  }
}

module.exports = new ActivityService();
