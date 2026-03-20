const path = require('path');
const fileStorage = require('../storage/fileStorage');
const config = require('../../config');

class ContractPresetsService {
  constructor() {
    this.presetsPath = path.join(config.storage.rootPath, 'contract-presets.json');
  }

  async getPresets() {
    try {
      const presets = await fileStorage.readJSON(this.presetsPath);
      return presets || this.getDefaultPresets();
    } catch (error) {
      return this.getDefaultPresets();
    }
  }

  async getPresetById(id) {
    if (!id) {
      return null;
    }

    const presets = await this.getPresets();
    return presets.find((preset) => preset.id === id) || null;
  }

  getDefaultPresets() {
    return [
      {
        id: 'full-time-40',
        name: 'Full-time 40h',
        type: 'full-time',
        weeklyHours: 40
      },
      {
        id: 'part-time-20',
        name: 'Part-time 20h',
        type: 'part-time',
        weeklyHours: 20
      }
    ];
  }

  async setPresets(presets) {
    await fileStorage.writeJSON(this.presetsPath, presets);
    return presets;
  }

  async addPreset(preset) {
    const presets = await this.getPresets();
    const normalized = this.normalizePreset(preset);

    const existingIndex = presets.findIndex(item => item.id === normalized.id);
    if (existingIndex !== -1) {
      throw new Error(`Preset contratto con ID "${normalized.id}" già esistente`);
    }

    presets.push(normalized);
    await this.setPresets(presets);
    return normalized;
  }

  async removePreset(id) {
    const presets = await this.getPresets();
    const index = presets.findIndex(item => item.id === id);

    if (index === -1) {
      throw new Error(`Preset contratto "${id}" non trovato`);
    }

    const userStorage = require('../storage/userStorage');
    const shiftTypesService = require('./shiftTypesService');

    const [users, shiftTypes] = await Promise.all([
      userStorage.listAll(),
      shiftTypesService.getShiftTypes()
    ]);

    if (config.server.defaultUserContractPreset === id) {
      throw new Error(`Non è possibile eliminare il preset contratto "${id}" perché è configurato come predefinito server`);
    }

    if (users.some(user => user.contractPreset === id)) {
      throw new Error(`Non è possibile eliminare il preset contratto "${id}" perché è assegnato ad almeno un utente`);
    }

    if (shiftTypes.some(shiftType => shiftType.contract?.presetId === id)) {
      throw new Error(`Non è possibile eliminare il preset contratto "${id}" perché è referenziato da almeno un turno`);
    }

    presets.splice(index, 1);
    await this.setPresets(presets);

    return { success: true, message: 'Preset contratto eliminato con successo' };
  }

  normalizePreset(preset) {
    if (!preset || !preset.id || !preset.name) {
      throw new Error('ID e nome sono obbligatori');
    }

    const weeklyHours = Number(preset.weeklyHours);
    if (!Number.isFinite(weeklyHours) || weeklyHours <= 0) {
      throw new Error('Le ore settimanali devono essere maggiori di 0');
    }

    const type = typeof preset.type === 'string' && preset.type.length > 0
      ? preset.type
      : 'full-time';

    return {
      id: String(preset.id).toLowerCase().trim(),
      name: String(preset.name).trim(),
      type,
      weeklyHours
    };
  }
}

module.exports = new ContractPresetsService();
