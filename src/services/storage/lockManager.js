const lockfile = require('proper-lockfile');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config');

class LockManager {
  constructor() {
    this.locksDir = path.join(config.storage.rootPath, 'locks');
  }

  async initialize() {
    try {
      await fs.mkdir(this.locksDir, { recursive: true });
    } catch (error) {
    }
  }

  async acquireLock(filePath, options = {}) {
    const defaultOptions = {
      retries: {
        retries: 5,
        minTimeout: 100,
        maxTimeout: 1000
      },
      stale: 10000,
      ...options
    };

    try {
      await this.ensureFileExists(filePath);

      const release = await lockfile.lock(filePath, defaultOptions);
      return release;
    } catch (error) {
      throw new Error(`Impossibile acquisire lock su ${filePath}: ${error.message}`);
    }
  }

  async ensureFileExists(filePath) {
    try {
      await fs.access(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, '{}', 'utf8');
      }
    }
  }

  async isLocked(filePath) {
    try {
      return await lockfile.check(filePath);
    } catch (error) {
      return false;
    }
  }
}

module.exports = new LockManager();
