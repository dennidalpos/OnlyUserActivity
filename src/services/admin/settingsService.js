const config = require('../../config');
const shiftTypesService = require('./shiftTypesService');
const contractPresetsService = require('./contractPresetsService');

const envService = require('./envService');
const userManagementService = require('./userManagementService');
const configExportService = require('./configExportService');
const quickActionsService = require('./quickActionsService');
const troubleshootService = require('./troubleshootService');

class SettingsService {
  constructor() {
    this.quickActionsPath = quickActionsService.quickActionsPath;
    this.defaultQuickActions = quickActionsService.defaultQuickActions;
  }

  logSettings(message, ...args) {
    if (config.logging.categories.settings) {
      console.log(`[SETTINGS] ${message}`, ...args);
    }
  }

  // ========== ENV SERVICE DELEGATES ==========
  resolveEnvValue(envSettings, key, fallback) {
    return envService.resolveEnvValue(envSettings, key, fallback);
  }

  resolveEnvBoolean(envSettings, key, fallback) {
    return envService.resolveEnvBoolean(envSettings, key, fallback);
  }

  resolveEnvInt(envSettings, key, fallback) {
    return envService.resolveEnvInt(envSettings, key, fallback);
  }

  async getCurrentSettings() {
    return envService.getCurrentSettings();
  }

  async updateEnvFile(updates) {
    return envService.updateEnvFile(updates);
  }

  async applySettingsSnapshot(settings) {
    return envService.applySettingsSnapshot(settings);
  }

  // ========== SETTINGS UPDATE METHODS ==========
  async normalizeDefaultUserShift(defaultUserShift) {
    const trimmed = typeof defaultUserShift === 'string' ? defaultUserShift.trim() : '';
    if (!trimmed) {
      return '';
    }

    const shiftTypes = await shiftTypesService.getShiftTypes();
    const matched = shiftTypes.find(shiftType => shiftType.name === trimmed || shiftType.id === trimmed);
    if (!matched) {
      throw new Error('Turno predefinito non valido. Seleziona un turno esistente.');
    }

    return matched.name;
  }

  async normalizeDefaultUserContractPreset(defaultUserContractPreset) {
    const trimmed = typeof defaultUserContractPreset === 'string' ? defaultUserContractPreset.trim() : '';
    if (!trimmed) {
      return '';
    }

    const presets = await contractPresetsService.getPresets();
    const matched = presets.find(preset => preset.id === trimmed);
    if (!matched) {
      throw new Error('Preset contratto predefinito non valido. Seleziona un preset esistente.');
    }

    return matched.id;
  }

  parseIntSetting(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < min || parsed > max) {
      throw new Error(`${label} non valido. Deve essere tra ${min} e ${max}.`);
    }
    return parsed;
  }

  async updateLdapSettings(ldapSettings) {
    this.logSettings(' Aggiornamento configurazione LDAP...');

    const updates = {};

    if (ldapSettings.hasOwnProperty('enabled')) {
      updates.LDAP_ENABLED = ldapSettings.enabled ? 'true' : 'false';
    }
    if (ldapSettings.hasOwnProperty('url')) {
      updates.LDAP_URL = ldapSettings.url;
    }
    if (ldapSettings.hasOwnProperty('baseDN')) {
      updates.LDAP_BASE_DN = ldapSettings.baseDN;
    }
    if (ldapSettings.hasOwnProperty('bindDN')) {
      updates.LDAP_BIND_DN = ldapSettings.bindDN;
    }
    if (ldapSettings.hasOwnProperty('bindPassword')) {
      updates.LDAP_BIND_PASSWORD = ldapSettings.bindPassword;
    }
    if (ldapSettings.hasOwnProperty('userSearchFilter')) {
      updates.LDAP_USER_SEARCH_FILTER = ldapSettings.userSearchFilter;
    }
    if (ldapSettings.hasOwnProperty('groupSearchBase')) {
      updates.LDAP_GROUP_SEARCH_BASE = ldapSettings.groupSearchBase;
    }
    if (ldapSettings.hasOwnProperty('requiredGroup')) {
      updates.LDAP_REQUIRED_GROUP = ldapSettings.requiredGroup;
    }
    if (ldapSettings.hasOwnProperty('timeout')) {
      updates.LDAP_TIMEOUT = ldapSettings.timeout;
    }

    await envService.updateEnvFile(updates);

    this.logSettings(' Configurazione LDAP aggiornata con successo');

    return {
      success: true,
      message: 'Configurazione LDAP aggiornata. Riavviare il server per applicare le modifiche.'
    };
  }

  async updateHttpsSettings(httpsSettings) {
    this.logSettings(' Aggiornamento configurazione HTTPS...');

    const updates = {};

    if (httpsSettings.hasOwnProperty('enabled')) {
      updates.HTTPS_ENABLED = httpsSettings.enabled ? 'true' : 'false';
    }
    if (httpsSettings.hasOwnProperty('certPath')) {
      updates.HTTPS_CERT_PATH = httpsSettings.certPath;
    }
    if (httpsSettings.hasOwnProperty('keyPath')) {
      updates.HTTPS_KEY_PATH = httpsSettings.keyPath;
    }

    await envService.updateEnvFile(updates);

    this.logSettings(' Configurazione HTTPS aggiornata con successo');

    return {
      success: true,
      message: 'Configurazione HTTPS aggiornata. Riavviare il server per applicare le modifiche.'
    };
  }

  async updateServerSettings(serverSettings) {
    this.logSettings(' Aggiornamento configurazione server...');

    const updates = {};

    if (serverSettings.port) {
      const port = parseInt(serverSettings.port, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        this.logSettings(' Porta non valida:', serverSettings.port);
        throw new Error('Porta non valida. Deve essere tra 1 e 65535.');
      }
      updates.SERVER_PORT = port.toString();
    }
    if (serverSettings.host) {
      updates.SERVER_HOST = serverSettings.host;
    }
    if (serverSettings.hasOwnProperty('trustProxy')) {
      const trustProxy = parseInt(serverSettings.trustProxy, 10);
      if (isNaN(trustProxy) || trustProxy < 0) {
        throw new Error('Trust proxy non valido. Deve essere un numero >= 0.');
      }
      updates.TRUST_PROXY = trustProxy.toString();
    }
    if (serverSettings.hasOwnProperty('defaultUserShift')) {
      const normalizedShift = await this.normalizeDefaultUserShift(serverSettings.defaultUserShift);
      updates.DEFAULT_USER_SHIFT = normalizedShift;
    }
    if (serverSettings.hasOwnProperty('defaultUserContractPreset')) {
      const normalizedContractPreset = await this.normalizeDefaultUserContractPreset(
        serverSettings.defaultUserContractPreset
      );
      updates.DEFAULT_USER_CONTRACT_PRESET = normalizedContractPreset;
    }

    await envService.updateEnvFile(updates);

    this.logSettings(' Configurazione server aggiornata con successo');

    return {
      success: true,
      message: 'Configurazione server aggiornata. Riavviare il server per applicare le modifiche.'
    };
  }

  async updateAdvancedSettings(advancedSettings) {
    this.logSettings(' Aggiornamento impostazioni avanzate...');

    const updates = {};
    const server = advancedSettings.server || {};
    const https = advancedSettings.https || {};
    const logging = advancedSettings.logging || {};
    const ldap = advancedSettings.ldap || {};
    const jwt = advancedSettings.jwt || {};
    const storage = advancedSettings.storage || {};
    const admin = advancedSettings.admin || {};
    const security = advancedSettings.security || {};
    const activity = advancedSettings.activity || {};

    if (server.hasOwnProperty('host')) {
      updates.SERVER_HOST = server.host;
    }
    const serverPort = this.parseIntSetting(server.port, 'Porta server', { min: 1, max: 65535 });
    if (serverPort !== null) {
      updates.SERVER_PORT = serverPort.toString();
    }
    const trustProxy = this.parseIntSetting(server.trustProxy, 'Trust proxy', { min: 0, max: 10 });
    if (trustProxy !== null) {
      updates.TRUST_PROXY = trustProxy.toString();
    }
    if (server.hasOwnProperty('defaultUserShift')) {
      const normalizedShift = await this.normalizeDefaultUserShift(server.defaultUserShift);
      updates.DEFAULT_USER_SHIFT = normalizedShift;
    }
    if (server.hasOwnProperty('defaultUserContractPreset')) {
      const normalizedContractPreset = await this.normalizeDefaultUserContractPreset(
        server.defaultUserContractPreset
      );
      updates.DEFAULT_USER_CONTRACT_PRESET = normalizedContractPreset;
    }

    if (https.hasOwnProperty('enabled')) {
      updates.HTTPS_ENABLED = https.enabled ? 'true' : 'false';
    }
    if (https.hasOwnProperty('certPath')) {
      updates.HTTPS_CERT_PATH = https.certPath;
    }
    if (https.hasOwnProperty('keyPath')) {
      updates.HTTPS_KEY_PATH = https.keyPath;
    }

    if (logging.hasOwnProperty('level')) {
      updates.LOG_LEVEL = logging.level;
    }
    if (logging.hasOwnProperty('toFile')) {
      updates.LOG_TO_FILE = logging.toFile ? 'true' : 'false';
    }
    if (logging.hasOwnProperty('filePath')) {
      updates.LOG_FILE_PATH = logging.filePath;
    }
    if (logging.hasOwnProperty('categories')) {
      const { categories } = logging;
      if (categories.hasOwnProperty('ldap')) {
        updates.LOG_LDAP = categories.ldap ? 'true' : 'false';
      }
      if (categories.hasOwnProperty('http')) {
        updates.LOG_HTTP = categories.http ? 'true' : 'false';
      }
      if (categories.hasOwnProperty('server')) {
        updates.LOG_SERVER = categories.server ? 'true' : 'false';
      }
      if (categories.hasOwnProperty('settings')) {
        updates.LOG_SETTINGS = categories.settings ? 'true' : 'false';
      }
      if (categories.hasOwnProperty('errors')) {
        updates.LOG_ERRORS = categories.errors ? 'true' : 'false';
      }
      if (categories.hasOwnProperty('audit')) {
        updates.LOG_AUDIT = categories.audit ? 'true' : 'false';
      }
    }

    if (ldap.hasOwnProperty('enabled')) {
      updates.LDAP_ENABLED = ldap.enabled ? 'true' : 'false';
    }
    if (ldap.hasOwnProperty('url')) {
      updates.LDAP_URL = ldap.url;
    }
    if (ldap.hasOwnProperty('baseDN')) {
      updates.LDAP_BASE_DN = ldap.baseDN;
    }
    if (ldap.hasOwnProperty('bindDN')) {
      updates.LDAP_BIND_DN = ldap.bindDN;
    }
    if (ldap.hasOwnProperty('bindPassword')) {
      updates.LDAP_BIND_PASSWORD = ldap.bindPassword;
    }
    if (ldap.hasOwnProperty('userSearchFilter')) {
      updates.LDAP_USER_SEARCH_FILTER = ldap.userSearchFilter;
    }
    if (ldap.hasOwnProperty('groupSearchBase')) {
      updates.LDAP_GROUP_SEARCH_BASE = ldap.groupSearchBase;
    }
    if (ldap.hasOwnProperty('requiredGroup')) {
      updates.LDAP_REQUIRED_GROUP = ldap.requiredGroup;
    }
    const ldapTimeout = this.parseIntSetting(ldap.timeout, 'Timeout LDAP', { min: 1000, max: 60000 });
    if (ldapTimeout !== null) {
      updates.LDAP_TIMEOUT = ldapTimeout.toString();
    }

    if (jwt.hasOwnProperty('secret')) {
      updates.JWT_SECRET = jwt.secret;
    }
    if (jwt.hasOwnProperty('expiresIn')) {
      updates.JWT_EXPIRES_IN = jwt.expiresIn;
    }
    if (jwt.hasOwnProperty('refreshEnabled')) {
      updates.JWT_REFRESH_ENABLED = jwt.refreshEnabled ? 'true' : 'false';
    }

    if (storage.hasOwnProperty('rootPath')) {
      updates.DATA_ROOT_PATH = storage.rootPath;
    }
    const auditRetentionDays = this.parseIntSetting(storage.auditRetentionDays, 'Retention log audit', { min: 1, max: 3650 });
    if (auditRetentionDays !== null) {
      updates.AUDIT_LOG_RETENTION_DAYS = auditRetentionDays.toString();
    }
    if (storage.hasOwnProperty('auditPayloadMode')) {
      updates.AUDIT_PAYLOAD_MODE = storage.auditPayloadMode;
    }

    if (admin.hasOwnProperty('sessionSecret')) {
      updates.ADMIN_SESSION_SECRET = admin.sessionSecret;
    }
    const sessionMaxAge = this.parseIntSetting(admin.sessionMaxAge, 'Sessione admin max age', { min: 60000, max: 86400000 });
    if (sessionMaxAge !== null) {
      updates.ADMIN_SESSION_MAX_AGE = sessionMaxAge.toString();
    }
    if (admin.hasOwnProperty('defaultUsername')) {
      updates.ADMIN_DEFAULT_USERNAME = admin.defaultUsername;
    }
    if (admin.hasOwnProperty('defaultPassword')) {
      updates.ADMIN_DEFAULT_PASSWORD = admin.defaultPassword;
    }

    const rateLimitWindowMs = this.parseIntSetting(security.rateLimitWindowMs, 'Rate limit window', { min: 1000, max: 3600000 });
    if (rateLimitWindowMs !== null) {
      updates.RATE_LIMIT_WINDOW_MS = rateLimitWindowMs.toString();
    }
    const rateLimitMaxRequests = this.parseIntSetting(security.rateLimitMaxRequests, 'Rate limit max requests', { min: 1, max: 10000 });
    if (rateLimitMaxRequests !== null) {
      updates.RATE_LIMIT_MAX_REQUESTS = rateLimitMaxRequests.toString();
    }
    const loginRateLimitMax = this.parseIntSetting(security.loginRateLimitMax, 'Login rate limit max', { min: 1, max: 50 });
    if (loginRateLimitMax !== null) {
      updates.LOGIN_RATE_LIMIT_MAX = loginRateLimitMax.toString();
    }
    const loginLockoutDurationMs = this.parseIntSetting(security.loginLockoutDurationMs, 'Login lockout duration', { min: 1000, max: 3600000 });
    if (loginLockoutDurationMs !== null) {
      updates.LOGIN_LOCKOUT_DURATION_MS = loginLockoutDurationMs.toString();
    }
    if (security.hasOwnProperty('corsOrigin')) {
      updates.CORS_ORIGIN = security.corsOrigin;
    }

    if (activity.hasOwnProperty('strictContinuity')) {
      updates.ACTIVITY_STRICT_CONTINUITY = activity.strictContinuity ? 'true' : 'false';
    }
    const requiredMinutes = this.parseIntSetting(activity.requiredMinutes, 'Minuti richiesti attività', { min: 1, max: 1440 });
    if (requiredMinutes !== null) {
      updates.ACTIVITY_REQUIRED_MINUTES = requiredMinutes.toString();
    }

    await envService.updateEnvFile(updates);

    return {
      success: true,
      message: 'Impostazioni avanzate aggiornate. Riavviare il server per applicare le modifiche.'
    };
  }

  // ========== TROUBLESHOOT SERVICE DELEGATES ==========
  async testLdapBind(params) {
    return troubleshootService.testLdapBind(params);
  }

  async testStorageAccess(rootPath) {
    return troubleshootService.testStorageAccess(rootPath);
  }

  async testHttpsFiles(certPath, keyPath) {
    return troubleshootService.testHttpsFiles(certPath, keyPath);
  }

  // ========== USER MANAGEMENT SERVICE DELEGATES ==========
  async listLocalUsers() {
    return userManagementService.listLocalUsers();
  }

  async createLocalUser(userData) {
    return userManagementService.createLocalUser(userData);
  }

  async updateUserShift(userKey, shift) {
    return userManagementService.updateUserShift(userKey, shift);
  }

  async updateUser(userKey, updates) {
    return userManagementService.updateUser(userKey, updates);
  }

  async resetLocalUserPassword(userKey, newPassword) {
    return userManagementService.resetLocalUserPassword(userKey, newPassword);
  }

  async removeUserActivityData(userKey) {
    return userManagementService.removeUserActivityData(userKey);
  }

  async collectAuditLogFiles(dirPath) {
    return userManagementService.collectAuditLogFiles(dirPath);
  }

  async removeUserAuditLogs(userKey, username) {
    return userManagementService.removeUserAuditLogs(userKey, username);
  }

  async deleteLocalUser(userKey) {
    return userManagementService.deleteLocalUser(userKey);
  }

  // ========== CONFIG EXPORT SERVICE DELEGATES ==========
  async exportServerConfiguration(options) {
    return configExportService.exportServerConfiguration(options);
  }

  async importServerConfiguration(payload, options) {
    return configExportService.importServerConfiguration(payload, options);
  }

  async exportFullConfiguration(options) {
    return configExportService.exportFullConfiguration(options);
  }

  async exportActivitiesSnapshot(rootPath) {
    return configExportService.exportActivitiesSnapshot(rootPath);
  }

  async importFullConfiguration(payload, options) {
    return configExportService.importFullConfiguration(payload, options);
  }

  async importUsersSnapshot(users) {
    return configExportService.importUsersSnapshot(users);
  }

  async importActivitiesSnapshot(entries, rootPath) {
    return configExportService.importActivitiesSnapshot(entries, rootPath);
  }

  // ========== QUICK ACTIONS SERVICE DELEGATES ==========
  async getQuickActions() {
    return quickActionsService.getQuickActions();
  }

  async setQuickActions(actions) {
    return quickActionsService.setQuickActions(actions);
  }

  async addQuickAction(payload) {
    return quickActionsService.addQuickAction(payload);
  }

  async updateQuickAction(id, payload) {
    return quickActionsService.updateQuickAction(id, payload);
  }

  async removeQuickAction(id) {
    return quickActionsService.removeQuickAction(id);
  }

  normalizeQuickActions(actions) {
    return quickActionsService.normalizeQuickActions(actions);
  }

  async validateQuickActions(actions) {
    return quickActionsService.validateQuickActions(actions);
  }

  generateQuickActionId(label, activityType) {
    return quickActionsService.generateQuickActionId(label, activityType);
  }
}

module.exports = new SettingsService();
