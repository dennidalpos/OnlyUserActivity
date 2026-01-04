const bcrypt = require('bcrypt');
const path = require('path');
const config = require('../../config');
const fileStorage = require('../storage/fileStorage');

const SALT_ROUNDS = 10;

class AdminAuthService {
  constructor() {
    this.credentialsPath = path.join(config.storage.rootPath, 'admin', 'credentials.json');
  }

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

  async loadCredentials() {
    const data = await fileStorage.readJSON(this.credentialsPath);
    return data || { users: [] };
  }

  async saveCredentials(data) {
    await fileStorage.writeJSON(this.credentialsPath, data);
  }

  async hashPassword(plainPassword) {
    return await bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  async verifyPassword(plainPassword, hash) {
    return await bcrypt.compare(plainPassword, hash);
  }

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
