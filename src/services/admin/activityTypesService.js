const path = require('path');
const config = require('../../config');
const fileStorage = require('../storage/fileStorage');

class ActivityTypesService {
  constructor() {
    this.configPath = path.join(config.storage.rootPath, 'admin', 'activity-types.json');
    this.defaultTypes = [
      'lavoro',
      'meeting',
      'formazione',
      'supporto',
      'ferie',
      'festività',
      'malattia',
      'permesso',
      'riposo',
      'trasferta',
      'pausa',
      'altro'
    ];
  }

  async getActivityTypes() {
    try {
      const config = await fileStorage.readJSON(this.configPath);
      return config?.activityTypes || this.defaultTypes;
    } catch (error) {
      return this.defaultTypes;
    }
  }

  async setActivityTypes(types) {
    if (!Array.isArray(types) || types.length === 0) {
      throw new Error('I tipi di attività devono essere un array non vuoto');
    }

    for (const type of types) {
      if (typeof type !== 'string' || type.trim() === '') {
        throw new Error('Ogni tipo di attività deve essere una stringa non vuota');
      }
    }

    const uniqueTypes = [...new Set(types.map(t => t.trim().toLowerCase()))];

    await fileStorage.writeJSON(this.configPath, {
      activityTypes: uniqueTypes,
      updatedAt: new Date().toISOString()
    });

    return uniqueTypes;
  }

  async addActivityType(newType) {
    if (!newType || typeof newType !== 'string' || newType.trim() === '') {
      throw new Error('Il tipo di attività deve essere una stringa non vuota');
    }

    const types = await this.getActivityTypes();
    const normalizedType = newType.trim().toLowerCase();

    if (types.includes(normalizedType)) {
      throw new Error('Questo tipo di attività esiste già');
    }

    types.push(normalizedType);
    await this.setActivityTypes(types);

    return types;
  }

  async removeActivityType(typeToRemove) {
    if (!typeToRemove || typeof typeToRemove !== 'string') {
      throw new Error('Il tipo di attività da rimuovere deve essere una stringa');
    }

    const types = await this.getActivityTypes();
    const normalizedType = typeToRemove.trim().toLowerCase();

    if (!types.includes(normalizedType)) {
      throw new Error('Tipo di attività non trovato');
    }

    const filteredTypes = types.filter(t => t !== normalizedType);

    if (filteredTypes.length === 0) {
      throw new Error('Non è possibile rimuovere tutti i tipi di attività');
    }

    await this.setActivityTypes(filteredTypes);

    return filteredTypes;
  }

  async resetToDefaults() {
    await this.setActivityTypes(this.defaultTypes);
    return this.defaultTypes;
  }
}

module.exports = new ActivityTypesService();
