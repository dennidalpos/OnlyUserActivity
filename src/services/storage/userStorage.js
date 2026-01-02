const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const fileStorage = require('./fileStorage');

/**
 * Servizio per gestione utenti su filesystem
 */
class UserStorage {
  constructor() {
    this.usersPath = path.join(config.storage.rootPath, 'users');
    this.indexPath = path.join(this.usersPath, 'index.json');
  }

  /**
   * Carica o crea indice username -> userKey
   */
  async loadIndex() {
    const index = await fileStorage.readJSON(this.indexPath);
    return index || {};
  }

  /**
   * Salva indice
   */
  async saveIndex(index) {
    await fileStorage.writeJSON(this.indexPath, index);
  }

  /**
   * Trova utente per username
   * @param {string} username
   * @returns {Object|null}
   */
  async findByUsername(username) {
    const index = await this.loadIndex();
    const userKey = index[username.toLowerCase()];

    if (!userKey) {
      return null;
    }

    return await this.findByUserKey(userKey);
  }

  /**
   * Trova utente per userKey
   * @param {string} userKey
   * @returns {Object|null}
   */
  async findByUserKey(userKey) {
    const userPath = path.join(this.usersPath, `${userKey}.json`);
    return await fileStorage.readJSON(userPath);
  }

  /**
   * Crea nuovo utente
   * @param {Object} userData - { username, displayName, email, department }
   * @returns {Object}
   */
  async create(userData) {
    const userKey = uuidv4();
    const now = new Date().toISOString();

    const user = {
      userKey,
      username: userData.username,
      displayName: userData.displayName || userData.username,
      email: userData.email || null,
      department: userData.department || null,
      createdAt: now,
      lastLoginAt: now,
      metadata: userData.metadata || {}
    };

    // Salva file utente
    const userPath = path.join(this.usersPath, `${userKey}.json`);
    await fileStorage.writeJSON(userPath, user);

    // Aggiorna indice
    const index = await this.loadIndex();
    index[userData.username.toLowerCase()] = userKey;
    await this.saveIndex(index);

    return user;
  }

  /**
   * Aggiorna utente esistente
   * @param {string} userKey
   * @param {Object} updates
   * @returns {Object}
   */
  async update(userKey, updates) {
    const user = await this.findByUserKey(userKey);

    if (!user) {
      throw new Error(`Utente ${userKey} non trovato`);
    }

    const updatedUser = {
      ...user,
      ...updates,
      userKey, // Non modificabile
      username: user.username, // Non modificabile
      createdAt: user.createdAt, // Non modificabile
      updatedAt: new Date().toISOString()
    };

    const userPath = path.join(this.usersPath, `${userKey}.json`);
    await fileStorage.writeJSON(userPath, updatedUser);

    return updatedUser;
  }

  /**
   * Aggiorna timestamp ultimo login
   * @param {string} userKey
   */
  async updateLastLogin(userKey) {
    return await this.update(userKey, {
      lastLoginAt: new Date().toISOString()
    });
  }

  /**
   * Lista tutti gli utenti
   * @returns {Array<Object>}
   */
  async listAll() {
    const index = await this.loadIndex();
    const users = [];

    for (const userKey of Object.values(index)) {
      const user = await this.findByUserKey(userKey);
      if (user) {
        users.push(user);
      }
    }

    return users;
  }
}

module.exports = new UserStorage();
