const bcrypt = require('bcrypt');
const path = require('path');
const config = require('../../config');
const fileStorage = require('../storage/fileStorage');

const SALT_ROUNDS = 10;

/**
 * Servizio autenticazione admin locale
 */
class AdminAuthService {
  constructor() {
    this.credentialsPath = path.join(config.storage.rootPath, 'admin', 'credentials.json');
  }

  /**
   * Inizializza credenziali admin di default
   */
  async initialize() {
    const credentials = await this.loadCredentials();

    if (!credentials || credentials.users.length === 0) {
      const defaultHash = await this.hashPassword(config.admin.defaultPassword);
      await this.saveCredentials({
        users: [{
          username: config.admin.defaultUsername,
          passwordHash: defaultHash,
          passwordChangedAt: new Date().toISOString(),
          requirePasswordChange: true,
          createdAt: new Date().toISOString()
        }]
      });
    }
  }

  /**
   * Carica credenziali
   */
  async loadCredentials() {
    const data = await fileStorage.readJSON(this.credentialsPath);
    return data || { users: [] };
  }

  /**
   * Salva credenziali
   */
  async saveCredentials(data) {
    await fileStorage.writeJSON(this.credentialsPath, data);
  }

  /**
   * Hash password
   */
  async hashPassword(plainPassword) {
    return await bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  /**
   * Verifica password
   */
  async verifyPassword(plainPassword, hash) {
    return await bcrypt.compare(plainPassword, hash);
  }

  /**
   * Autentica admin
   * @param {string} username
   * @param {string} password
   * @returns {Object} Admin user
   */
  async authenticate(username, password) {
    const credentials = await this.loadCredentials();
    const adminUser = credentials.users.find(u => u.username === username);

    if (!adminUser) {
      throw new Error('Username o password non validi');
    }

    const isValid = await this.verifyPassword(password, adminUser.passwordHash);

    if (!isValid) {
      throw new Error('Username o password non validi');
    }

    return {
      username: adminUser.username,
      requirePasswordChange: adminUser.requirePasswordChange
    };
  }

  /**
   * Cambia password admin
   * @param {string} username
   * @param {string} newPassword
   */
  async changePassword(username, newPassword) {
    const credentials = await this.loadCredentials();
    const userIndex = credentials.users.findIndex(u => u.username === username);

    if (userIndex === -1) {
      throw new Error('Utente non trovato');
    }

    const newHash = await this.hashPassword(newPassword);
    credentials.users[userIndex].passwordHash = newHash;
    credentials.users[userIndex].passwordChangedAt = new Date().toISOString();
    credentials.users[userIndex].requirePasswordChange = false;

    await this.saveCredentials(credentials);
  }
}

module.exports = new AdminAuthService();
