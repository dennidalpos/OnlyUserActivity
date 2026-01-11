const path = require('path');
const fs = require('fs').promises;
const config = require('../../config');
const userStorage = require('../storage/userStorage');
const { hashPassword } = require('../utils/hashUtils');

class UserManagementService {
  constructor() {}

  async listLocalUsers() {
    const allUsers = await userStorage.listAll();
    return allUsers.map(user => ({
      userKey: user.userKey,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      department: user.department,
      shift: user.shift,
      contractPreset: user.contractPreset,
      userType: user.userType || 'local',
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }));
  }

  async createLocalUser(userData) {
    const {
      username,
      password,
      displayName,
      email,
      department,
      shift,
      contractPreset
    } = userData;

    if (!username || !password) {
      throw new Error('Username e password sono obbligatori');
    }

    const existing = await userStorage.findByUsername(username);
    if (existing) {
      throw new Error('Username già esistente');
    }

    const passwordHash = await hashPassword(password);
    const defaultShift = config.server.defaultUserShift || null;
    const defaultContractPreset = config.server.defaultUserContractPreset || null;

    const user = await userStorage.create({
      username,
      passwordHash,
      displayName: displayName || username,
      email: email || null,
      department: department || null,
      shift: shift || defaultShift || null,
      contractPreset: contractPreset || defaultContractPreset || null,
      userType: 'local'
    });

    return {
      userKey: user.userKey,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      department: user.department,
      contractPreset: user.contractPreset,
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

    if (updates.hasOwnProperty('contractPreset')) {
      allowedUpdates.contractPreset = updates.contractPreset;
    }

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
        contractPreset: updatedUser.contractPreset,
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
}

module.exports = new UserManagementService();
