const path = require('path');
const fileStorage = require('../storage/fileStorage');
const config = require('../../config');

class ShiftTypesService {
  constructor() {
    this.shiftTypesPath = path.join(config.storage.rootPath, 'shift-types.json');
    this.cache = null;
    this.cacheTime = 0;
    this.cacheTTL = 5 * 60 * 1000;
  }

  invalidateCache() {
    this.cache = null;
    this.cacheTime = 0;
  }

  async getShiftTypes() {
    const now = Date.now();
    if (this.cache && (now - this.cacheTime) < this.cacheTTL) {
      return this.cache;
    }

    try {
      const shiftTypes = await fileStorage.readJSON(this.shiftTypesPath);
      const list = shiftTypes || this.getDefaultShiftTypes();
      this.cache = list.map(shiftType => this.normalizeShiftType(shiftType));
      this.cacheTime = now;
      return this.cache;
    } catch (error) {
      return this.getDefaultShiftTypes();
    }
  }

  getDefaultShiftTypes() {
    return [
      {
        id: '24-7',
        name: '24/7',
        workingDays: [1, 2, 3, 4, 5, 6, 7],
        includeWeekends: true,
        includeHolidays: true,
        contract: {
          type: 'full-time',
          weeklyHours: 40
        },
        description: '24 ore su 24, 7 giorni su 7'
      },
      {
        id: 'feriali',
        name: 'Feriali',
        workingDays: [1, 2, 3, 4, 5],
        includeWeekends: false,
        includeHolidays: false,
        contract: {
          type: 'full-time',
          weeklyHours: 40
        },
        description: 'Solo giorni feriali'
      }
    ];
  }

  async setShiftTypes(shiftTypes) {
    await fileStorage.writeJSON(this.shiftTypesPath, shiftTypes);
    this.invalidateCache();
    return shiftTypes;
  }

  async addShiftType(shiftType) {
    const shiftTypes = await this.getShiftTypes();

    const existingIndex = shiftTypes.findIndex(st => st.id === shiftType.id);
    if (existingIndex !== -1) {
      throw new Error(`Tipo di turno con ID "${shiftType.id}" già esistente`);
    }

    if (!shiftType.id || !shiftType.name) {
      throw new Error('ID e nome sono obbligatori');
    }

    const newShiftType = this.normalizeShiftType(shiftType);
    newShiftType.id = shiftType.id;
    newShiftType.name = shiftType.name;
    newShiftType.description = shiftType.description || '';

    shiftTypes.push(newShiftType);
    await this.setShiftTypes(shiftTypes);

    return newShiftType;
  }

  normalizeShiftType(shiftType) {
    const workingDays = this.normalizeWorkingDays(shiftType.workingDays, shiftType.includeWeekends);
    const contract = this.normalizeContract(shiftType.contract || {});
    return {
      id: shiftType.id,
      name: shiftType.name,
      workingDays,
      includeWeekends: shiftType.includeWeekends === true,
      includeHolidays: shiftType.includeHolidays === true,
      contract,
      description: shiftType.description || ''
    };
  }

  async updateShiftType(id, updates) {
    const shiftTypes = await this.getShiftTypes();
    const index = shiftTypes.findIndex(st => st.id === id);

    if (index === -1) {
      throw new Error(`Tipo di turno "${id}" non trovato`);
    }

    const base = shiftTypes[index];
    const workingDays = updates.workingDays !== undefined
      ? this.normalizeWorkingDays(updates.workingDays, updates.includeWeekends ?? base.includeWeekends)
      : base.workingDays;
    const contract = updates.contract !== undefined
      ? this.normalizeContract(updates.contract || {})
      : base.contract;

    const updatedShiftType = {
      ...base,
      name: updates.name !== undefined ? updates.name : shiftTypes[index].name,
      workingDays,
      includeWeekends: updates.includeWeekends !== undefined ? updates.includeWeekends === true : shiftTypes[index].includeWeekends,
      includeHolidays: updates.includeHolidays !== undefined ? updates.includeHolidays === true : shiftTypes[index].includeHolidays,
      contract,
      description: updates.description !== undefined ? updates.description : base.description
    };

    shiftTypes[index] = updatedShiftType;
    await this.setShiftTypes(shiftTypes);

    return updatedShiftType;
  }

  async removeShiftType(id) {
    const shiftTypes = await this.getShiftTypes();
    const index = shiftTypes.findIndex(st => st.id === id);

    if (index === -1) {
      throw new Error(`Tipo di turno "${id}" non trovato`);
    }

    shiftTypes.splice(index, 1);
    await this.setShiftTypes(shiftTypes);

    return { success: true, message: 'Tipo di turno eliminato con successo' };
  }

  normalizeWorkingDays(workingDays, includeWeekends) {
    if (Array.isArray(workingDays) && workingDays.length > 0) {
      return workingDays
        .map(day => Number(day))
        .filter(day => Number.isInteger(day) && day >= 1 && day <= 7);
    }

    if (includeWeekends === true) {
      return [1, 2, 3, 4, 5, 6, 7];
    }

    return [1, 2, 3, 4, 5];
  }

  normalizeContract(contract) {
    const type = typeof contract.type === 'string' && contract.type.length > 0
      ? contract.type
      : 'full-time';
    const weeklyHours = Number(contract.weeklyHours);
    return {
      type,
      weeklyHours: Number.isFinite(weeklyHours) && weeklyHours > 0 ? weeklyHours : null,
      presetId: contract.presetId || ''
    };
  }
}

module.exports = new ShiftTypesService();
