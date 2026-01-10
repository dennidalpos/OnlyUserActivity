const path = require('path');
const fs = require('fs').promises;
const config = require('../../config');
const fileStorage = require('../storage/fileStorage');
const userStorage = require('../storage/userStorage');
const { hashPassword } = require('../utils/hashUtils');
const ldapClient = require('../ldap/ldapClient');
const activityTypesService = require('./activityTypesService');
const shiftTypesService = require('./shiftTypesService');

class SettingsService {
  constructor() {
    this.envPath = path.join(process.cwd(), '.env');
    this.quickActionsPath = path.join(config.storage.rootPath, 'admin', 'quick-actions.json');
    this.defaultQuickActions = [
      {
        id: 'quick-malattia',
        label: 'Malattia',
        activityType: 'altro',
        notes: ''
      },
      {
        id: 'quick-ferie',
        label: 'Ferie',
        activityType: 'altro',
        notes: ''
      },
      {
        id: 'quick-congedo',
        label: 'Congedo',
        activityType: 'altro',
        notes: 'Congedo'
      },
      {
        id: 'quick-smart-working',
        label: 'Smart working',
        activityType: 'altro',
        notes: 'Smart working'
      },
      {
        id: 'quick-riposo',
        label: 'Riposo',
        activityType: 'altro',
        notes: ''
      },
      {
        id: 'quick-pausa',
        label: 'Pausa',
        activityType: 'pausa',
        notes: ''
      }
    ];
  }

  logSettings(message, ...args) {
    if (config.logging.categories.settings) {
      console.log(`[SETTINGS] ${message}`, ...args);
    }
  }

  resolveEnvValue(envSettings, key, fallback) {
    if (Object.prototype.hasOwnProperty.call(envSettings, key)) {
      return envSettings[key];
    }
    return fallback;
  }

  resolveEnvBoolean(envSettings, key, fallback) {
    if (Object.prototype.hasOwnProperty.call(envSettings, key)) {
      return envSettings[key] === 'true';
    }
    return fallback;
  }

  resolveEnvInt(envSettings, key, fallback) {
    if (Object.prototype.hasOwnProperty.call(envSettings, key)) {
      const parsed = parseInt(envSettings[key], 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
  }

  async getCurrentSettings() {
    this.logSettings('Lettura impostazioni correnti dal file .env...');
    this.logSettings('Path file .env:', this.envPath);

    let envSettings = {};
    try {
      const envContent = await fs.readFile(this.envPath, 'utf-8');
      const lines = envContent.split(/\r?\n/);

      for (const line of lines) {
        const trimmedLine = line.trim();
        const match = trimmedLine.match(/^([A-Z_]+)=(.*)$/);
        if (match) {
          envSettings[match[1]] = match[2];
        }
      }
      this.logSettings(' File .env letto. Chiavi trovate:', Object.keys(envSettings).length);
    } catch (error) {
      this.logSettings(' File .env non trovato, uso valori di default');
    }

    const settings = {
      ldap: {
        enabled: this.resolveEnvBoolean(envSettings, 'LDAP_ENABLED', config.ldap.enabled),
        url: this.resolveEnvValue(envSettings, 'LDAP_URL', config.ldap.url),
        baseDN: this.resolveEnvValue(envSettings, 'LDAP_BASE_DN', config.ldap.baseDN),
        bindDN: this.resolveEnvValue(envSettings, 'LDAP_BIND_DN', config.ldap.bindDN),
        bindPassword: this.resolveEnvValue(envSettings, 'LDAP_BIND_PASSWORD', config.ldap.bindPassword),
        userSearchFilter: this.resolveEnvValue(envSettings, 'LDAP_USER_SEARCH_FILTER', config.ldap.userSearchFilter),
        groupSearchBase: this.resolveEnvValue(envSettings, 'LDAP_GROUP_SEARCH_BASE', config.ldap.groupSearchBase),
        requiredGroup: this.resolveEnvValue(envSettings, 'LDAP_REQUIRED_GROUP', config.ldap.requiredGroup),
        timeout: this.resolveEnvInt(envSettings, 'LDAP_TIMEOUT', config.ldap.timeout)
      },
      https: {
        enabled: this.resolveEnvBoolean(envSettings, 'HTTPS_ENABLED', config.https.enabled),
        certPath: this.resolveEnvValue(envSettings, 'HTTPS_CERT_PATH', config.https.certPath),
        keyPath: this.resolveEnvValue(envSettings, 'HTTPS_KEY_PATH', config.https.keyPath)
      },
      server: {
        host: this.resolveEnvValue(envSettings, 'SERVER_HOST', config.server.host),
        port: this.resolveEnvInt(envSettings, 'SERVER_PORT', config.server.port),
        trustProxy: this.resolveEnvInt(envSettings, 'TRUST_PROXY', config.server.trustProxy),
        defaultUserShift: this.resolveEnvValue(envSettings, 'DEFAULT_USER_SHIFT', config.server.defaultUserShift)
      },
      logging: {
        level: this.resolveEnvValue(envSettings, 'LOG_LEVEL', config.logging.level),
        toFile: this.resolveEnvBoolean(envSettings, 'LOG_TO_FILE', config.logging.toFile),
        filePath: this.resolveEnvValue(envSettings, 'LOG_FILE_PATH', config.logging.filePath),
        categories: {
          ldap: this.resolveEnvBoolean(envSettings, 'LOG_LDAP', config.logging.categories.ldap),
          http: this.resolveEnvBoolean(envSettings, 'LOG_HTTP', config.logging.categories.http),
          server: this.resolveEnvBoolean(envSettings, 'LOG_SERVER', config.logging.categories.server),
          settings: this.resolveEnvBoolean(envSettings, 'LOG_SETTINGS', config.logging.categories.settings),
          errors: this.resolveEnvBoolean(envSettings, 'LOG_ERRORS', config.logging.categories.errors),
          audit: this.resolveEnvBoolean(envSettings, 'LOG_AUDIT', config.logging.categories.audit)
        }
      },
      jwt: {
        secret: this.resolveEnvValue(envSettings, 'JWT_SECRET', config.jwt.secret),
        expiresIn: this.resolveEnvValue(envSettings, 'JWT_EXPIRES_IN', config.jwt.expiresIn),
        refreshEnabled: this.resolveEnvBoolean(envSettings, 'JWT_REFRESH_ENABLED', config.jwt.refreshEnabled)
      },
      storage: {
        rootPath: this.resolveEnvValue(envSettings, 'DATA_ROOT_PATH', config.storage.rootPath),
        auditRetentionDays: this.resolveEnvInt(envSettings, 'AUDIT_LOG_RETENTION_DAYS', config.storage.auditRetentionDays),
        auditPayloadMode: this.resolveEnvValue(envSettings, 'AUDIT_PAYLOAD_MODE', config.storage.auditPayloadMode)
      },
      admin: {
        sessionSecret: this.resolveEnvValue(envSettings, 'ADMIN_SESSION_SECRET', config.admin.sessionSecret),
        sessionMaxAge: this.resolveEnvInt(envSettings, 'ADMIN_SESSION_MAX_AGE', config.admin.sessionMaxAge),
        defaultUsername: this.resolveEnvValue(envSettings, 'ADMIN_DEFAULT_USERNAME', config.admin.defaultUsername),
        defaultPassword: this.resolveEnvValue(envSettings, 'ADMIN_DEFAULT_PASSWORD', config.admin.defaultPassword)
      },
      security: {
        rateLimitWindowMs: this.resolveEnvInt(envSettings, 'RATE_LIMIT_WINDOW_MS', config.security.rateLimitWindowMs),
        rateLimitMaxRequests: this.resolveEnvInt(envSettings, 'RATE_LIMIT_MAX_REQUESTS', config.security.rateLimitMaxRequests),
        loginRateLimitMax: this.resolveEnvInt(envSettings, 'LOGIN_RATE_LIMIT_MAX', config.security.loginRateLimitMax),
        loginLockoutDurationMs: this.resolveEnvInt(envSettings, 'LOGIN_LOCKOUT_DURATION_MS', config.security.loginLockoutDurationMs),
        corsOrigin: this.resolveEnvValue(envSettings, 'CORS_ORIGIN', config.security.corsOrigin)
      },
      activity: {
        strictContinuity: this.resolveEnvBoolean(envSettings, 'ACTIVITY_STRICT_CONTINUITY', config.activity.strictContinuity),
        requiredMinutes: this.resolveEnvInt(envSettings, 'ACTIVITY_REQUIRED_MINUTES', config.activity.requiredMinutes)
      }
    };

    this.logSettings(' Settings da restituire:', JSON.stringify(settings, null, 2));
    return settings;
  }

  async updateEnvFile(updates) {
    this.logSettings(' Aggiornamento file .env in corso...');
    this.logSettings(' Modifiche da applicare:', JSON.stringify(updates, null, 2));

    let envContent = '';
    let fileExists = true;

    try {
      envContent = await fs.readFile(this.envPath, 'utf-8');
      this.logSettings(' File .env letto con successo');
    } catch (error) {
      this.logSettings(' File .env non trovato, provo a copiare da .env.example');
      fileExists = false;

      try {
        const examplePath = path.join(process.cwd(), '.env.example');
        envContent = await fs.readFile(examplePath, 'utf-8');
        this.logSettings(' Template .env.example caricato');
      } catch (exampleError) {
        this.logSettings(' .env.example non trovato, creo file vuoto');
        envContent = '';
      }
    }

    const lines = envContent.split(/\r?\n/);
    const updatedLines = [];
    const processedKeys = new Set();

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '' || trimmed.startsWith('#')) {
        updatedLines.push(trimmed);
        continue;
      }

      const match = trimmed.match(/^([A-Z_]+)=/);
      if (match) {
        const key = match[1];
        if (updates.hasOwnProperty(key)) {
          const oldValue = trimmed.split('=')[1];
          const newValue = updates[key];
          console.log(`[SETTINGS] Aggiornamento ${key}: "${oldValue}" -> "${newValue}"`);
          updatedLines.push(`${key}=${updates[key]}`);
          processedKeys.add(key);
        } else {
          updatedLines.push(trimmed);
        }
      } else {
        updatedLines.push(trimmed);
      }
    }

    for (const [key, value] of Object.entries(updates)) {
      if (!processedKeys.has(key)) {
        this.logSettings(`Aggiunta nuova chiave ${key}=${value}`);
        updatedLines.push(`${key}=${value}`);
      }
    }

    const finalContent = updatedLines.join('\n');
    await fs.writeFile(this.envPath, finalContent, 'utf-8');
    this.logSettings(' File .env salvato con successo');
    this.logSettings(' Path: ' + this.envPath);

    if (!fileExists) {
      this.logSettings(' IMPORTANTE: File .env creato per la prima volta. Riavviare il server per applicare le modifiche.');
    }
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

    await this.updateEnvFile(updates);

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

    await this.updateEnvFile(updates);

    this.logSettings(' Configurazione HTTPS aggiornata con successo');

    return {
      success: true,
      message: 'Configurazione HTTPS aggiornata. Riavviare il server per applicare le modifiche.'
    };
  }

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

    await this.updateEnvFile(updates);

    this.logSettings(' Configurazione server aggiornata con successo');

    return {
      success: true,
      message: 'Configurazione server aggiornata. Riavviare il server per applicare le modifiche.'
    };
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

    await this.updateEnvFile(updates);

    return {
      success: true,
      message: 'Impostazioni avanzate aggiornate. Riavviare il server per applicare le modifiche.'
    };
  }

  async testLdapBind({ url, bindDN, bindPassword, timeout }) {
    if (!url) {
      throw new Error('URL LDAP obbligatorio');
    }
    if (!bindDN) {
      throw new Error('Bind DN obbligatorio');
    }
    if (!bindPassword) {
      throw new Error('Password bind obbligatoria');
    }

    const ldapConfig = {
      url,
      timeout: this.parseIntSetting(timeout, 'Timeout LDAP', { min: 1000, max: 60000 }) || config.ldap.timeout
    };

    const client = await ldapClient.createClientWithConfig(ldapConfig);
    try {
      await ldapClient.bind(client, bindDN, bindPassword);
      return { success: true, message: 'Bind LDAP riuscito' };
    } finally {
      await ldapClient.unbind(client);
    }
  }

  async testStorageAccess(rootPath) {
    const trimmedPath = typeof rootPath === 'string' ? rootPath.trim() : '';
    const targetPath = trimmedPath || config.storage.rootPath;
    await fs.mkdir(targetPath, { recursive: true });
    const testFile = path.join(targetPath, `.write-test-${Date.now()}.tmp`);
    await fs.writeFile(testFile, 'ok', 'utf-8');
    await fs.unlink(testFile);
    return { success: true, message: `Scrittura riuscita su ${targetPath}` };
  }

  async testHttpsFiles(certPath, keyPath) {
    const trimmedCertPath = typeof certPath === 'string' ? certPath.trim() : '';
    const trimmedKeyPath = typeof keyPath === 'string' ? keyPath.trim() : '';
    if (!trimmedCertPath || !trimmedKeyPath) {
      const error = new Error('Percorsi certificato e chiave sono obbligatori');
      error.statusCode = 400;
      throw error;
    }
    try {
      await fs.access(trimmedCertPath);
      await fs.access(trimmedKeyPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const notFoundError = new Error('File HTTPS non trovato. Verifica i percorsi configurati.');
        notFoundError.statusCode = 400;
        throw notFoundError;
      }
      throw error;
    }
    return { success: true, message: 'File HTTPS trovati e accessibili' };
  }

  async listLocalUsers() {
    const allUsers = await userStorage.listAll();
    return allUsers.map(user => ({
      userKey: user.userKey,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      department: user.department,
      shift: user.shift,
      userType: user.userType || 'local',
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }));
  }

  async createLocalUser(userData) {
    const { username, password, displayName, email, department } = userData;

    if (!username || !password) {
      throw new Error('Username e password sono obbligatori');
    }

    const existing = await userStorage.findByUsername(username);
    if (existing) {
      throw new Error('Username già esistente');
    }

    const passwordHash = await hashPassword(password);

    const user = await userStorage.create({
      username,
      passwordHash,
      displayName: displayName || username,
      email: email || null,
      department: department || null,
      userType: 'local'
    });

    return {
      userKey: user.userKey,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      department: user.department,
      userType: user.userType
    };
  }

  async updateUserShift(userKey, shift) {
    const user = await userStorage.findByUserKey(userKey);

    if (!user) {
      throw new Error('Utente non trovato');
    }

    const updatedUser = await userStorage.update(userKey, { shift });

    return {
      success: true,
      user: {
        userKey: updatedUser.userKey,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        shift: updatedUser.shift
      },
      message: 'Turno aggiornato con successo'
    };
  }

  async updateUser(userKey, updates) {
    const user = await userStorage.findByUserKey(userKey);

    if (!user) {
      throw new Error('Utente non trovato');
    }

    if (user.userType === 'ad' && (updates.department || updates.email)) {
      throw new Error('Non è possibile modificare reparto ed email per utenti AD');
    }

    const allowedUpdates = {
      shift: updates.shift
    };

    if (user.userType !== 'ad') {
      if (updates.hasOwnProperty('department')) {
        allowedUpdates.department = updates.department;
      }
      if (updates.hasOwnProperty('email')) {
        allowedUpdates.email = updates.email;
      }
      if (updates.hasOwnProperty('displayName')) {
        allowedUpdates.displayName = updates.displayName;
      }
    }

    const updatedUser = await userStorage.update(userKey, allowedUpdates);

    return {
      success: true,
      user: {
        userKey: updatedUser.userKey,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        shift: updatedUser.shift,
        department: updatedUser.department,
        email: updatedUser.email
      },
      message: 'Informazioni utente aggiornate con successo'
    };
  }

  async resetLocalUserPassword(userKey, newPassword) {
    const user = await userStorage.findByUserKey(userKey);

    if (!user) {
      throw new Error('Utente non trovato');
    }

    if (user.userType === 'ad') {
      throw new Error('Non è possibile reimpostare la password per utenti AD');
    }

    if (!newPassword) {
      throw new Error('Nuova password obbligatoria');
    }

    const passwordHash = await hashPassword(newPassword);
    const updatedUser = await userStorage.update(userKey, { passwordHash });

    return {
      success: true,
      user: {
        userKey: updatedUser.userKey,
        username: updatedUser.username
      },
      message: 'Password reimpostata con successo'
    };
  }

  async removeUserActivityData(userKey) {
    const activitiesPath = path.join(config.storage.rootPath, 'activities', userKey);
    await fs.rm(activitiesPath, { recursive: true, force: true });
  }

  async collectAuditLogFiles(dirPath) {
    let entries = [];
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    const files = [];
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.collectAuditLogFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  async removeUserAuditLogs(userKey, username) {
    const auditRoot = path.join(config.storage.rootPath, 'audit');
    const auditFiles = await this.collectAuditLogFiles(auditRoot);

    for (const filePath of auditFiles) {
      let content = '';
      try {
        content = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        continue;
      }

      const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) {
        continue;
      }

      const remaining = [];
      let changed = false;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.userKey === userKey || (username && entry.username === username)) {
            changed = true;
            continue;
          }
          remaining.push(line);
        } catch (error) {
          remaining.push(line);
        }
      }

      if (!changed) {
        continue;
      }

      if (remaining.length === 0) {
        await fs.unlink(filePath);
      } else {
        await fs.writeFile(filePath, remaining.join('\n') + '\n', 'utf8');
      }
    }
  }

  async deleteLocalUser(userKey) {
    const user = await userStorage.findByUserKey(userKey);

    if (!user) {
      throw new Error('Utente non trovato');
    }

    const userPath = path.join(config.storage.rootPath, 'users', `${userKey}.json`);
    await fs.unlink(userPath);

    const index = await userStorage.loadIndex();
    delete index[user.username.toLowerCase()];
    await userStorage.saveIndex(index);
    userStorage.invalidateCache(userKey);

    await this.removeUserActivityData(userKey);
    await this.removeUserAuditLogs(userKey, user.username);

    return {
      success: true,
      message: 'Utente eliminato con successo'
    };
  }

  async exportServerConfiguration() {
    const settings = await this.getCurrentSettings();
    const quickActions = await this.getQuickActions();
    return {
      generatedAt: new Date().toISOString(),
      settings,
      quickActions
    };
  }

  async importServerConfiguration(payload) {
    if (!payload || typeof payload !== 'object' || !payload.settings) {
      throw new Error('File configurazione impostazioni non valido');
    }

    await this.applySettingsSnapshot(payload.settings);
    if (Array.isArray(payload.quickActions)) {
      await this.setQuickActions(payload.quickActions);
    }

    return {
      success: true,
      message: 'Configurazione impostazioni importata con successo'
    };
  }

  async exportFullConfiguration() {
    const settings = await this.getCurrentSettings();
    const activityTypes = await activityTypesService.getActivityTypes();
    const shiftTypes = await shiftTypesService.getShiftTypes();
    const quickActions = await this.getQuickActions();
    const users = await userStorage.listAll();
    const activities = await this.exportActivitiesSnapshot(settings.storage.rootPath);

    return {
      generatedAt: new Date().toISOString(),
      settings,
      activityTypes,
      shiftTypes,
      quickActions,
      users,
      activities
    };
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

  async importFullConfiguration(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload configurazione non valido');
    }

    if (payload.settings) {
      await this.applySettingsSnapshot(payload.settings);
    }

    if (Array.isArray(payload.activityTypes)) {
      await activityTypesService.setActivityTypes(payload.activityTypes);
    }

    if (Array.isArray(payload.shiftTypes)) {
      await shiftTypesService.setShiftTypes(payload.shiftTypes);
    }

    if (Array.isArray(payload.quickActions)) {
      await this.setQuickActions(payload.quickActions);
    }

    if (Array.isArray(payload.users)) {
      await this.importUsersSnapshot(payload.users);
    }

    if (Array.isArray(payload.activities)) {
      await this.importActivitiesSnapshot(payload.activities, payload.settings?.storage?.rootPath || config.storage.rootPath);
    }

    return { success: true, message: 'Configurazione importata con successo' };
  }

  async applySettingsSnapshot(settings) {
    const updates = {
      SERVER_HOST: settings.server?.host,
      SERVER_PORT: settings.server?.port,
      TRUST_PROXY: settings.server?.trustProxy,
      DEFAULT_USER_SHIFT: settings.server?.defaultUserShift,
      LDAP_ENABLED: settings.ldap?.enabled ? 'true' : 'false',
      LDAP_URL: settings.ldap?.url,
      LDAP_BASE_DN: settings.ldap?.baseDN,
      LDAP_BIND_DN: settings.ldap?.bindDN,
      LDAP_BIND_PASSWORD: settings.ldap?.bindPassword,
      LDAP_USER_SEARCH_FILTER: settings.ldap?.userSearchFilter,
      LDAP_GROUP_SEARCH_BASE: settings.ldap?.groupSearchBase,
      LDAP_REQUIRED_GROUP: settings.ldap?.requiredGroup,
      LDAP_TIMEOUT: settings.ldap?.timeout,
      HTTPS_ENABLED: settings.https?.enabled ? 'true' : 'false',
      HTTPS_CERT_PATH: settings.https?.certPath,
      HTTPS_KEY_PATH: settings.https?.keyPath,
      LOG_LEVEL: settings.logging?.level,
      LOG_TO_FILE: settings.logging?.toFile ? 'true' : 'false',
      LOG_FILE_PATH: settings.logging?.filePath,
      JWT_SECRET: settings.jwt?.secret,
      JWT_EXPIRES_IN: settings.jwt?.expiresIn,
      JWT_REFRESH_ENABLED: settings.jwt?.refreshEnabled ? 'true' : 'false',
      DATA_ROOT_PATH: settings.storage?.rootPath,
      AUDIT_LOG_RETENTION_DAYS: settings.storage?.auditRetentionDays,
      AUDIT_PAYLOAD_MODE: settings.storage?.auditPayloadMode,
      ADMIN_SESSION_SECRET: settings.admin?.sessionSecret,
      ADMIN_SESSION_MAX_AGE: settings.admin?.sessionMaxAge,
      ADMIN_DEFAULT_USERNAME: settings.admin?.defaultUsername,
      ADMIN_DEFAULT_PASSWORD: settings.admin?.defaultPassword,
      RATE_LIMIT_WINDOW_MS: settings.security?.rateLimitWindowMs,
      RATE_LIMIT_MAX_REQUESTS: settings.security?.rateLimitMaxRequests,
      LOGIN_RATE_LIMIT_MAX: settings.security?.loginRateLimitMax,
      LOGIN_LOCKOUT_DURATION_MS: settings.security?.loginLockoutDurationMs,
      CORS_ORIGIN: settings.security?.corsOrigin,
      ACTIVITY_STRICT_CONTINUITY: settings.activity?.strictContinuity ? 'true' : 'false',
      ACTIVITY_REQUIRED_MINUTES: settings.activity?.requiredMinutes
    };

    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined || updates[key] === null) {
        delete updates[key];
      }
    });

    await this.updateEnvFile(updates);
  }

  async importUsersSnapshot(users) {
    const usersPath = path.join(config.storage.rootPath, 'users');
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

    await userStorage.saveIndex(index);
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

  async getQuickActions() {
    try {
      const configData = await fileStorage.readJSON(this.quickActionsPath);
      const raw = Array.isArray(configData?.quickActions) ? configData.quickActions : this.defaultQuickActions;
      return this.normalizeQuickActions(raw);
    } catch (error) {
      return this.normalizeQuickActions(this.defaultQuickActions);
    }
  }

  async setQuickActions(actions) {
    if (!Array.isArray(actions)) {
      throw new Error('Le quick action devono essere un array');
    }
    const normalized = this.normalizeQuickActions(actions);
    await this.validateQuickActions(normalized);
    await fileStorage.writeJSON(this.quickActionsPath, {
      quickActions: normalized,
      updatedAt: new Date().toISOString()
    });
    return normalized;
  }

  async addQuickAction(payload) {
    const actions = await this.getQuickActions();
    const normalized = this.normalizeQuickActions([payload])[0];
    await this.validateQuickActions([normalized]);
    actions.push(normalized);
    return await this.setQuickActions(actions);
  }

  async updateQuickAction(id, payload) {
    const actions = await this.getQuickActions();
    const index = actions.findIndex(action => action.id === id);
    if (index === -1) {
      throw new Error('Quick action non trovata');
    }
    const updated = {
      ...actions[index],
      ...payload
    };
    const normalized = this.normalizeQuickActions([updated])[0];
    await this.validateQuickActions([normalized]);
    actions[index] = normalized;
    return await this.setQuickActions(actions);
  }

  async removeQuickAction(id) {
    const actions = await this.getQuickActions();
    const filtered = actions.filter(action => action.id !== id);
    if (filtered.length === actions.length) {
      throw new Error('Quick action non trovata');
    }
    return await this.setQuickActions(filtered);
  }

  normalizeQuickActions(actions) {
    return actions
      .filter(action => action && action.label)
      .map((action) => {
        const label = String(action.label).trim();
        const isPause = action.isPause === true || action.activityType === 'pausa';
        const activityType = isPause ? 'pausa' : 'altro';
        return {
          id: action.id || this.generateQuickActionId(label, activityType),
          label,
          activityType,
          notes: action.notes ? String(action.notes) : ''
        };
      });
  }

  async validateQuickActions(actions) {
    const allowedTypes = new Set(['altro', 'pausa']);
    const pauseCount = actions.filter(action => action.activityType === 'pausa').length;
    if (pauseCount > 1) {
      throw new Error('È consentita una sola quick action di tipo "pausa"');
    }

    actions.forEach((action) => {
      if (!action.label) {
        throw new Error('Ogni quick action deve avere un\'etichetta');
      }
      if (!allowedTypes.has(action.activityType)) {
        throw new Error(`Tipo attività non valido per quick action: ${action.activityType}`);
      }
    });
  }

  generateQuickActionId(label, activityType) {
    const base = `${activityType}-${label}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base}-${Date.now()}-${suffix}`;
  }
}

module.exports = new SettingsService();
