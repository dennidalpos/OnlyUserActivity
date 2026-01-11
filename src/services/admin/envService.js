const path = require('path');
const fs = require('fs').promises;
const config = require('../../config');

class EnvService {
  constructor() {
    this.envPath = path.join(process.cwd(), '.env');
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
        defaultUserShift: this.resolveEnvValue(envSettings, 'DEFAULT_USER_SHIFT', config.server.defaultUserShift),
        defaultUserContractPreset: this.resolveEnvValue(
          envSettings,
          'DEFAULT_USER_CONTRACT_PRESET',
          config.server.defaultUserContractPreset
        )
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

    this.logSettings(' Settings caricati con successo');
    return settings;
  }

  async updateEnvFile(updates) {
    this.logSettings(' Aggiornamento file .env in corso...');
    const safeUpdates = { ...updates };
    if (safeUpdates.LDAP_BIND_PASSWORD) safeUpdates.LDAP_BIND_PASSWORD = '[REDACTED]';
    if (safeUpdates.JWT_SECRET) safeUpdates.JWT_SECRET = '[REDACTED]';
    if (safeUpdates.ADMIN_SESSION_SECRET) safeUpdates.ADMIN_SESSION_SECRET = '[REDACTED]';
    if (safeUpdates.ADMIN_DEFAULT_PASSWORD) safeUpdates.ADMIN_DEFAULT_PASSWORD = '[REDACTED]';
    this.logSettings(' Modifiche da applicare:', JSON.stringify(safeUpdates, null, 2));

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

  async applySettingsSnapshot(settings) {
    const updates = {
      SERVER_HOST: settings.server?.host,
      SERVER_PORT: settings.server?.port,
      TRUST_PROXY: settings.server?.trustProxy,
      DEFAULT_USER_SHIFT: settings.server?.defaultUserShift,
      DEFAULT_USER_CONTRACT_PRESET: settings.server?.defaultUserContractPreset,
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
}

module.exports = new EnvService();
