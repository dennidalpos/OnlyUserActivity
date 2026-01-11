const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const fileStorage = require('./fileStorage');

class UserStorage {
  constructor() {
    this.usersPath = path.join(config.storage.rootPath, 'users');
    this.indexPath = path.join(this.usersPath, 'index.json');
    this.userCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000;
    this.indexCache = null;
    this.indexCacheTime = 0;
  }

  async loadIndex() {
    const now = Date.now();
    if (this.indexCache && (now - this.indexCacheTime) < this.cacheTimeout) {
      return this.indexCache;
    }

    const index = await fileStorage.readJSON(this.indexPath);
    this.indexCache = index || {};
    this.indexCacheTime = now;
    return this.indexCache;
  }

  async saveIndex(index) {
    await fileStorage.writeJSON(this.indexPath, index);
    this.indexCache = index;
    this.indexCacheTime = Date.now();
  }

  invalidateCache(userKey) {
    this.userCache.delete(userKey);
  }

  invalidateAllCache() {
    this.userCache.clear();
    this.indexCache = null;
    this.indexCacheTime = 0;
  }

  async findByUsername(username) {
    const index = await this.loadIndex();
    const userKey = index[username.toLowerCase()];

    if (!userKey) {
      return null;
    }

    return await this.findByUserKey(userKey);
  }

  async findByUserKey(userKey) {
    const cached = this.userCache.get(userKey);
    if (cached && (Date.now() - cached.time) < this.cacheTimeout) {
      return cached.user;
    }

    const userPath = path.join(this.usersPath, `${userKey}.json`);
    const user = await fileStorage.readJSON(userPath);

    if (user) {
      this.userCache.set(userKey, { user, time: Date.now() });
    }

    return user;
  }

  async create(userData) {
    const userKey = uuidv4();
    const now = new Date().toISOString();

    const user = {
      userKey,
      username: userData.username,
      displayName: userData.displayName || userData.username,
      email: userData.email || null,
      department: userData.department || null,
      shift: userData.shift || null,
      contractPreset: userData.contractPreset || null,
      userType: userData.userType || 'local',
      createdAt: now,
      lastLoginAt: now,
      metadata: userData.metadata || {}
    };

    if (userData.passwordHash) {
      user.passwordHash = userData.passwordHash;
    }

    const userPath = path.join(this.usersPath, `${userKey}.json`);
    await fileStorage.writeJSON(userPath, user);

    const index = await this.loadIndex();
    index[userData.username.toLowerCase()] = userKey;
    await this.saveIndex(index);

    this.userCache.set(userKey, { user, time: Date.now() });

    return user;
  }

  async update(userKey, updates) {
    const user = await this.findByUserKey(userKey);

    if (!user) {
      throw new Error(`Utente ${userKey} non trovato`);
    }

    const updatedUser = {
      ...user,
      ...updates,
      userKey,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: new Date().toISOString()
    };

    const userPath = path.join(this.usersPath, `${userKey}.json`);
    await fileStorage.writeJSON(userPath, updatedUser);

    this.userCache.set(userKey, { user: updatedUser, time: Date.now() });

    return updatedUser;
  }

  async updateLastLogin(userKey) {
    return await this.update(userKey, {
      lastLoginAt: new Date().toISOString()
    });
  }

  async listAll() {
    const index = await this.loadIndex();
    const userKeys = Object.values(index);

    // Parallel fetch instead of sequential
    const userPromises = userKeys.map(userKey => this.findByUserKey(userKey));
    const usersOrNull = await Promise.all(userPromises);

    return usersOrNull.filter(user => user !== null);
  }
}

module.exports = new UserStorage();
