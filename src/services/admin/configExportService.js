const path = require('path');
const fs = require('fs').promises;
const config = require('../../config');
const fileStorage = require('../storage/fileStorage');
const userStorage = require('../storage/userStorage');
const activityTypesService = require('./activityTypesService');
const shiftTypesService = require('./shiftTypesService');
const contractPresetsService = require('./contractPresetsService');

class ConfigExportService {
  constructor() {
    this._envService = null;
    this._quickActionsService = null;
  }

  get envService() {
    if (!this._envService) {
      this._envService = require('./envService');
    }
    return this._envService;
  }

  get quickActionsService() {
    if (!this._quickActionsService) {
      this._quickActionsService = require('./quickActionsService');
    }
    return this._quickActionsService;
  }

  async exportServerConfiguration(options = {}) {
    const sections = Array.isArray(options.sections) ? options.sections : null;
    const includeSection = (name) => !sections || sections.includes(name);
    const payload = {
      generatedAt: new Date().toISOString()
    };

    if (includeSection('settings')) {
      payload.settings = await this.envService.getCurrentSettings();
    }
    if (includeSection('activityTypes')) {
      payload.activityTypes = await activityTypesService.getActivityTypes();
    }
    if (includeSection('shiftTypes')) {
      payload.shiftTypes = await shiftTypesService.getShiftTypes();
    }
    if (includeSection('contractPresets')) {
      payload.contractPresets = await contractPresetsService.getPresets();
    }
    if (includeSection('quickActions')) {
      payload.quickActions = await this.quickActionsService.getQuickActions();
    }

    return payload;
  }

  async importServerConfiguration(payload, options = {}) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('File configurazione impostazioni non valido');
    }

    const sections = Array.isArray(options.sections) ? options.sections : null;
    const includeSection = (name) => !sections || sections.includes(name);

    await this.validateImportReferences(payload, options);

    if (includeSection('settings')) {
      if (!payload.settings) {
        throw new Error('Configurazione impostazioni priva delle impostazioni server');
      }
      await this.envService.applySettingsSnapshot(payload.settings);
    }

    if (includeSection('activityTypes') && Array.isArray(payload.activityTypes)) {
      await activityTypesService.setActivityTypes(payload.activityTypes);
    }

    if (includeSection('contractPresets') && Array.isArray(payload.contractPresets)) {
      await contractPresetsService.setPresets(payload.contractPresets);
    }

    if (includeSection('shiftTypes') && Array.isArray(payload.shiftTypes)) {
      await shiftTypesService.setShiftTypes(payload.shiftTypes);
    }

    if (includeSection('quickActions') && Array.isArray(payload.quickActions)) {
      await this.quickActionsService.setQuickActions(payload.quickActions);
    }

    return {
      success: true,
      message: 'Configurazione impostazioni importata con successo'
    };
  }

  async exportFullConfiguration(options = {}) {
    const sections = Array.isArray(options.sections) ? options.sections : null;
    const includeSection = (name) => !sections || sections.includes(name);
    const payload = {
      generatedAt: new Date().toISOString()
    };
    const settings = await this.envService.getCurrentSettings();

    const includeSettings = includeSection('settings');
    const includeLogging = includeSection('logging');
    const includeLdap = includeSection('ldap');
    const includeHttps = includeSection('https');
    const includeAdvanced = includeSection('advanced');

    if (includeSettings) {
      payload.settings = settings;
    } else {
      const partialSettings = {};
      if (includeLogging) {
        partialSettings.logging = settings.logging;
      }
      if (includeLdap) {
        partialSettings.ldap = settings.ldap;
      }
      if (includeHttps) {
        partialSettings.https = settings.https;
      }
      if (includeAdvanced) {
        partialSettings.jwt = settings.jwt;
        partialSettings.storage = settings.storage;
        partialSettings.admin = settings.admin;
        partialSettings.security = settings.security;
        partialSettings.activity = settings.activity;
      }
      if (Object.keys(partialSettings).length > 0) {
        payload.settings = partialSettings;
      }
    }
    if (includeSection('activityTypes')) {
      payload.activityTypes = await activityTypesService.getActivityTypes();
    }
    if (includeSection('shiftTypes')) {
      payload.shiftTypes = await shiftTypesService.getShiftTypes();
    }
    if (includeSection('contractPresets')) {
      payload.contractPresets = await contractPresetsService.getPresets();
    }
    if (includeSection('quickActions')) {
      payload.quickActions = await this.quickActionsService.getQuickActions();
    }
    if (includeSection('users')) {
      payload.users = await userStorage.listAll();
    }
    if (includeSection('activities')) {
      payload.activities = await this.exportActivitiesSnapshot(settings.storage.rootPath);
    }

    return payload;
  }

  async exportActivitiesSnapshot(rootPath) {
    const activitiesPath = path.join(rootPath, 'activities');
    const snapshot = [];

    let userDirs = [];
    try {
      userDirs = await fs.readdir(activitiesPath, { withFileTypes: true });
    } catch (error) {
      return snapshot;
    }

    for (const userDir of userDirs) {
      if (!userDir.isDirectory()) {
        continue;
      }

      const userKey = userDir.name;
      const userPath = path.join(activitiesPath, userKey);
      let yearDirs = [];

      try {
        yearDirs = await fs.readdir(userPath, { withFileTypes: true });
      } catch (error) {
        continue;
      }

      for (const yearDir of yearDirs) {
        if (!yearDir.isDirectory()) {
          continue;
        }

        const year = yearDir.name;
        const yearPath = path.join(userPath, year);
        let monthFiles = [];

        try {
          monthFiles = await fs.readdir(yearPath, { withFileTypes: true });
        } catch (error) {
          continue;
        }

        for (const monthFile of monthFiles) {
          if (!monthFile.isFile() || !monthFile.name.endsWith('.json')) {
            continue;
          }

          const filePath = path.join(yearPath, monthFile.name);
          const monthData = await fileStorage.readJSON(filePath);

          if (!monthData) {
            continue;
          }

          snapshot.push({
            userKey,
            year,
            month: monthFile.name.replace('.json', ''),
            data: monthData
          });
        }
      }
    }

    return snapshot;
  }

  async importFullConfiguration(payload, options = {}) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload configurazione non valido');
    }

    const sections = Array.isArray(options.sections) ? options.sections : null;
    const includeSection = (name) => !sections || sections.includes(name);

    const includeSettings = includeSection('settings');
    const includeLogging = includeSection('logging');
    const includeLdap = includeSection('ldap');
    const includeHttps = includeSection('https');
    const includeAdvanced = includeSection('advanced');
    const needsSettings = includeSettings || includeLogging || includeLdap || includeHttps || includeAdvanced;

    await this.validateImportReferences(payload, options);

    if (needsSettings) {
      if (!payload.settings) {
        throw new Error('Configurazione completa priva delle impostazioni server');
      }

      if (includeSettings) {
        await this.envService.applySettingsSnapshot(payload.settings);
      } else {
        const partialSettings = {};
        if (includeLogging) {
          if (!payload.settings.logging) {
            throw new Error('Configurazione completa priva della sezione logging');
          }
          partialSettings.logging = payload.settings.logging;
        }
        if (includeLdap) {
          if (!payload.settings.ldap) {
            throw new Error('Configurazione completa priva della sezione LDAP');
          }
          partialSettings.ldap = payload.settings.ldap;
        }
        if (includeHttps) {
          if (!payload.settings.https) {
            throw new Error('Configurazione completa priva della sezione HTTPS');
          }
          partialSettings.https = payload.settings.https;
        }
        if (includeAdvanced) {
          const hasAdvancedSection = payload.settings.jwt
            || payload.settings.storage
            || payload.settings.admin
            || payload.settings.security
            || payload.settings.activity;
          if (!hasAdvancedSection) {
            throw new Error('Configurazione completa priva della sezione impostazioni avanzate');
          }
          partialSettings.jwt = payload.settings.jwt;
          partialSettings.storage = payload.settings.storage;
          partialSettings.admin = payload.settings.admin;
          partialSettings.security = payload.settings.security;
          partialSettings.activity = payload.settings.activity;
        }
        await this.envService.applySettingsSnapshot(partialSettings);
      }
    }

    if (includeSection('activityTypes') && Array.isArray(payload.activityTypes)) {
      await activityTypesService.setActivityTypes(payload.activityTypes);
    }

    if (includeSection('contractPresets') && Array.isArray(payload.contractPresets)) {
      await contractPresetsService.setPresets(payload.contractPresets);
    }

    if (includeSection('shiftTypes') && Array.isArray(payload.shiftTypes)) {
      await shiftTypesService.setShiftTypes(payload.shiftTypes);
    }

    if (includeSection('quickActions') && Array.isArray(payload.quickActions)) {
      await this.quickActionsService.setQuickActions(payload.quickActions);
    }

    if (includeSection('users')) {
      if (!Array.isArray(payload.users)) {
        throw new Error('Configurazione completa priva della sezione utenti');
      }
      await this.importUsersSnapshot(payload.users, payload.settings?.storage?.rootPath || config.storage.rootPath);
    }

    if (includeSection('activities')) {
      if (!Array.isArray(payload.activities)) {
        throw new Error('Configurazione completa priva della sezione attività');
      }
      await this.importActivitiesSnapshot(payload.activities, payload.settings?.storage?.rootPath || config.storage.rootPath);
    }

    return { success: true, message: 'Configurazione importata con successo' };
  }

  async importUsersSnapshot(users, rootPath = config.storage.rootPath) {
    const usersPath = path.join(rootPath, 'users');
    const indexPath = path.join(usersPath, 'index.json');
    const index = {};

    await fs.mkdir(usersPath, { recursive: true });

    for (const user of users) {
      if (!user?.userKey || !user?.username) {
        continue;
      }

      const userPath = path.join(usersPath, `${user.userKey}.json`);
      await fileStorage.writeJSON(userPath, user);
      index[user.username.toLowerCase()] = user.userKey;
    }

    await fileStorage.writeJSON(indexPath, index);
    userStorage.invalidateAllCache();
  }

  async importActivitiesSnapshot(entries, rootPath) {
    const activitiesPath = path.join(rootPath, 'activities');

    for (const entry of entries) {
      if (!entry?.userKey || !entry?.year || !entry?.month || !entry?.data) {
        continue;
      }

      const monthDir = path.join(activitiesPath, entry.userKey, String(entry.year));
      await fs.mkdir(monthDir, { recursive: true });
      const filePath = path.join(monthDir, `${entry.month}.json`);
      await fileStorage.writeJSON(filePath, entry.data);
    }
  }

  async validateImportReferences(payload, options = {}) {
    const snapshot = await this.buildReferenceSnapshot(payload, options);
    this.validateReferenceSnapshot(snapshot);
  }

  async buildReferenceSnapshot(payload, options = {}) {
    const sections = Array.isArray(options.sections) ? options.sections : null;
    const includeSection = (name) => !sections || sections.includes(name);
    const currentSettings = await this.envService.getCurrentSettings();

    return {
      settings: {
        server: {
          ...currentSettings.server,
          ...(payload.settings?.server || {})
        },
        storage: {
          ...currentSettings.storage,
          ...(payload.settings?.storage || {})
        }
      },
      shiftTypes: includeSection('shiftTypes') && Array.isArray(payload.shiftTypes)
        ? payload.shiftTypes
        : await shiftTypesService.getShiftTypes(),
      contractPresets: includeSection('contractPresets') && Array.isArray(payload.contractPresets)
        ? payload.contractPresets
        : await contractPresetsService.getPresets(),
      users: includeSection('users') && Array.isArray(payload.users)
        ? payload.users
        : await userStorage.listAll()
    };
  }

  validateReferenceSnapshot(snapshot) {
    const shiftValues = new Set(
      (snapshot.shiftTypes || []).flatMap(shiftType => [shiftType.id, shiftType.name].filter(Boolean))
    );
    const presetIds = new Set(
      (snapshot.contractPresets || []).map(preset => preset.id).filter(Boolean)
    );

    for (const user of snapshot.users || []) {
      if (user.shift && !shiftValues.has(user.shift)) {
        throw new Error(`Turno non valido per l'utente "${user.username || user.userKey}". Seleziona un turno esistente.`);
      }
      if (user.contractPreset && !presetIds.has(user.contractPreset)) {
        throw new Error(`Preset contratto non valido per l'utente "${user.username || user.userKey}". Seleziona un preset esistente.`);
      }
    }

    for (const shiftType of snapshot.shiftTypes || []) {
      if (shiftType.contract?.presetId && !presetIds.has(shiftType.contract.presetId)) {
        throw new Error(`Il turno "${shiftType.name || shiftType.id}" referenzia un preset contratto inesistente.`);
      }
    }

    if (snapshot.settings.server?.defaultUserShift && !shiftValues.has(snapshot.settings.server.defaultUserShift)) {
      throw new Error('Turno predefinito non valido. Seleziona un turno esistente.');
    }

    if (snapshot.settings.server?.defaultUserContractPreset && !presetIds.has(snapshot.settings.server.defaultUserContractPreset)) {
      throw new Error('Preset contratto predefinito non valido. Seleziona un preset esistente.');
    }
  }
}

module.exports = new ConfigExportService();
