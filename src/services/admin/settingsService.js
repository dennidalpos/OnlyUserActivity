const path = require('path');
const fs = require('fs').promises;
const config = require('../../config');
const fileStorage = require('../storage/fileStorage');
const userStorage = require('../storage/userStorage');
const { hashPassword } = require('../utils/hashUtils');

class SettingsService {
  constructor() {
    this.envPath = path.join(process.cwd(), '.env');
  }

  async getCurrentSettings() {
    console.log('[SETTINGS] Lettura impostazioni correnti dal file .env...');
    console.log('[SETTINGS] Path file .env:', this.envPath);

    // Read from .env file directly to show saved values even before server restart
    let envSettings = {};
    try {
      const envContent = await fs.readFile(this.envPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const match = line.match(/^([A-Z_]+)=(.*)$/);
        if (match) {
          envSettings[match[1]] = match[2];
        }
      }
      console.log('[SETTINGS] File .env letto. Chiavi trovate:', Object.keys(envSettings).length);
    } catch (error) {
      console.warn('[SETTINGS] File .env non trovato, uso valori di default');
    }

    const settings = {
      ldap: {
        enabled: envSettings.hasOwnProperty('LDAP_ENABLED') ? envSettings.LDAP_ENABLED === 'true' : config.ldap.enabled,
        url: envSettings.LDAP_URL || config.ldap.url,
        baseDN: envSettings.LDAP_BASE_DN || config.ldap.baseDN,
        bindDN: envSettings.LDAP_BIND_DN || config.ldap.bindDN,
        userSearchFilter: envSettings.LDAP_USER_SEARCH_FILTER || config.ldap.userSearchFilter,
        requiredGroup: envSettings.LDAP_REQUIRED_GROUP || config.ldap.requiredGroup,
        timeout: parseInt(envSettings.LDAP_TIMEOUT, 10) || config.ldap.timeout
      },
      https: {
        enabled: envSettings.hasOwnProperty('HTTPS_ENABLED') ? envSettings.HTTPS_ENABLED === 'true' : config.https.enabled,
        certPath: envSettings.HTTPS_CERT_PATH || config.https.certPath,
        keyPath: envSettings.HTTPS_KEY_PATH || config.https.keyPath
      },
      server: {
        host: envSettings.SERVER_HOST || config.server.host,
        port: parseInt(envSettings.SERVER_PORT, 10) || config.server.port
      },
      activity: {
        strictContinuity: envSettings.hasOwnProperty('ACTIVITY_STRICT_CONTINUITY') ? envSettings.ACTIVITY_STRICT_CONTINUITY === 'true' : config.activity.strictContinuity,
        requiredMinutes: parseInt(envSettings.ACTIVITY_REQUIRED_MINUTES, 10) || config.activity.requiredMinutes
      }
    };

    console.log('[SETTINGS] Settings da restituire:', JSON.stringify(settings, null, 2));
    return settings;
  }

  async updateEnvFile(updates) {
    console.log('[SETTINGS] Aggiornamento file .env in corso...');
    console.log('[SETTINGS] Modifiche da applicare:', JSON.stringify(updates, null, 2));

    let envContent = '';

    try {
      envContent = await fs.readFile(this.envPath, 'utf-8');
      console.log('[SETTINGS] File .env letto con successo');
    } catch (error) {
      console.log('[SETTINGS] File .env non trovato, verrà creato');
      envContent = '';
    }

    const lines = envContent.split('\n');
    const updatedLines = [];
    const processedKeys = new Set();

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '' || trimmed.startsWith('#')) {
        updatedLines.push(line);
        continue;
      }

      const match = line.match(/^([A-Z_]+)=/);
      if (match) {
        const key = match[1];
        if (updates.hasOwnProperty(key)) {
          const oldValue = line.split('=')[1];
          const newValue = updates[key];
          console.log(`[SETTINGS] Aggiornamento ${key}: "${oldValue}" -> "${newValue}"`);
          updatedLines.push(`${key}=${updates[key]}`);
          processedKeys.add(key);
        } else {
          updatedLines.push(line);
        }
      } else {
        updatedLines.push(line);
      }
    }

    for (const [key, value] of Object.entries(updates)) {
      if (!processedKeys.has(key)) {
        console.log(`[SETTINGS] Aggiunta nuova chiave ${key}=${value}`);
        updatedLines.push(`${key}=${value}`);
      }
    }

    await fs.writeFile(this.envPath, updatedLines.join('\n'), 'utf-8');
    console.log('[SETTINGS] File .env salvato con successo');
    console.log('[SETTINGS] Path: ' + this.envPath);
  }

  async updateLdapSettings(ldapSettings) {
    console.log('[SETTINGS] Aggiornamento configurazione LDAP...');

    const updates = {};

    if (ldapSettings.hasOwnProperty('enabled')) {
      updates.LDAP_ENABLED = ldapSettings.enabled ? 'true' : 'false';
    }
    if (ldapSettings.url) {
      updates.LDAP_URL = ldapSettings.url;
    }
    if (ldapSettings.baseDN) {
      updates.LDAP_BASE_DN = ldapSettings.baseDN;
    }
    if (ldapSettings.bindDN) {
      updates.LDAP_BIND_DN = ldapSettings.bindDN;
    }
    if (ldapSettings.bindPassword) {
      updates.LDAP_BIND_PASSWORD = ldapSettings.bindPassword;
    }
    if (ldapSettings.userSearchFilter) {
      updates.LDAP_USER_SEARCH_FILTER = ldapSettings.userSearchFilter;
    }
    if (ldapSettings.requiredGroup) {
      updates.LDAP_REQUIRED_GROUP = ldapSettings.requiredGroup;
    }
    if (ldapSettings.timeout) {
      updates.LDAP_TIMEOUT = ldapSettings.timeout;
    }

    await this.updateEnvFile(updates);

    console.log('[SETTINGS] Configurazione LDAP aggiornata con successo');

    return {
      success: true,
      message: 'Configurazione LDAP aggiornata. Riavviare il server per applicare le modifiche.'
    };
  }

  async updateHttpsSettings(httpsSettings) {
    console.log('[SETTINGS] Aggiornamento configurazione HTTPS...');

    const updates = {};

    if (httpsSettings.hasOwnProperty('enabled')) {
      updates.HTTPS_ENABLED = httpsSettings.enabled ? 'true' : 'false';
    }
    if (httpsSettings.certPath) {
      updates.HTTPS_CERT_PATH = httpsSettings.certPath;
    }
    if (httpsSettings.keyPath) {
      updates.HTTPS_KEY_PATH = httpsSettings.keyPath;
    }

    await this.updateEnvFile(updates);

    console.log('[SETTINGS] Configurazione HTTPS aggiornata con successo');

    return {
      success: true,
      message: 'Configurazione HTTPS aggiornata. Riavviare il server per applicare le modifiche.'
    };
  }

  async updateServerSettings(serverSettings) {
    console.log('[SETTINGS] Aggiornamento configurazione server...');

    const updates = {};

    if (serverSettings.port) {
      const port = parseInt(serverSettings.port, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        console.error('[SETTINGS] Porta non valida:', serverSettings.port);
        throw new Error('Porta non valida. Deve essere tra 1 e 65535.');
      }
      updates.SERVER_PORT = port.toString();
    }
    if (serverSettings.host) {
      updates.SERVER_HOST = serverSettings.host;
    }

    await this.updateEnvFile(updates);

    console.log('[SETTINGS] Configurazione server aggiornata con successo');

    return {
      success: true,
      message: 'Configurazione server aggiornata. Riavviare il server per applicare le modifiche.'
    };
  }

  async listLocalUsers() {
    const allUsers = await userStorage.listAll();
    return allUsers.map(user => ({
      userKey: user.userKey,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      department: user.department,
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

  async deleteLocalUser(userKey) {
    const user = await userStorage.findByUserKey(userKey);

    if (!user) {
      throw new Error('Utente non trovato');
    }

    if (user.userType === 'ad') {
      throw new Error('Non è possibile eliminare utenti AD. Gli utenti AD vengono gestiti automaticamente.');
    }

    const userPath = path.join(config.storage.rootPath, 'users', `${userKey}.json`);
    await fs.unlink(userPath);

    const index = await userStorage.loadIndex();
    delete index[user.username.toLowerCase()];
    await userStorage.saveIndex(index);

    return {
      success: true,
      message: 'Utente eliminato con successo'
    };
  }
}

module.exports = new SettingsService();
