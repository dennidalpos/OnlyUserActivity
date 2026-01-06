const path = require('path');
const fileStorage = require('../storage/fileStorage');
const config = require('../../config');

class ShiftTypesService {
  constructor() {
    this.shiftTypesPath = path.join(config.storage.rootPath, 'shift-types.json');
  }

  async getShiftTypes() {
    try {
      const shiftTypes = await fileStorage.readJSON(this.shiftTypesPath);
      return shiftTypes || this.getDefaultShiftTypes();
    } catch (error) {
      return this.getDefaultShiftTypes();
    }
  }

  getDefaultShiftTypes() {
    return [
      {
        id: '24-7',
        name: '24/7',
        includeWeekends: true,
        includeHolidays: true,
        description: '24 ore su 24, 7 giorni su 7'
      },
      {
        id: 'feriali',
        name: 'Feriali',
        includeWeekends: false,
        includeHolidays: false,
        description: 'Solo giorni feriali'
      }
    ];
  }

  async setShiftTypes(shiftTypes) {
    await fileStorage.writeJSON(this.shiftTypesPath, shiftTypes);
    return shiftTypes;
  }

  async addShiftType(shiftType) {
    const shiftTypes = await this.getShiftTypes();

    // Verifica che non esista già un turno con lo stesso ID
    const existingIndex = shiftTypes.findIndex(st => st.id === shiftType.id);
    if (existingIndex !== -1) {
      throw new Error(`Tipo di turno con ID "${shiftType.id}" già esistente`);
    }

    // Valida i campi obbligatori
    if (!shiftType.id || !shiftType.name) {
      throw new Error('ID e nome sono obbligatori');
    }

    const newShiftType = {
      id: shiftType.id,
      name: shiftType.name,
      includeWeekends: shiftType.includeWeekends === true,
      includeHolidays: shiftType.includeHolidays === true,
      description: shiftType.description || ''
    };

    shiftTypes.push(newShiftType);
    await this.setShiftTypes(shiftTypes);

    return newShiftType;
  }

  async updateShiftType(id, updates) {
    const shiftTypes = await this.getShiftTypes();
    const index = shiftTypes.findIndex(st => st.id === id);

    if (index === -1) {
      throw new Error(`Tipo di turno "${id}" non trovato`);
    }

    // Non permettere di cambiare l'ID
    const updatedShiftType = {
      ...shiftTypes[index],
      name: updates.name !== undefined ? updates.name : shiftTypes[index].name,
      includeWeekends: updates.includeWeekends !== undefined ? updates.includeWeekends === true : shiftTypes[index].includeWeekends,
      includeHolidays: updates.includeHolidays !== undefined ? updates.includeHolidays === true : shiftTypes[index].includeHolidays,
      description: updates.description !== undefined ? updates.description : shiftTypes[index].description
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
}

module.exports = new ShiftTypesService();
