const fs = require('fs').promises;
const path = require('path');
const config = require('../../config');
const lockManager = require('./lockManager');

class FileStorage {
  constructor() {
    this.rootPath = config.storage.rootPath;
  }

  async initialize() {
    const dirs = [
      'users',
      'activities',
      'audit',
      'admin',
      'locks'
    ];

    for (const dir of dirs) {
      await this.ensureDir(path.join(this.rootPath, dir));
    }

    await lockManager.initialize();
  }

  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async readJSON(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }

      const backupPath = `${filePath}.bak`;
      try {
        const backupContent = await fs.readFile(backupPath, 'utf8');
        return JSON.parse(backupContent);
      } catch (backupError) {
        throw new Error(`Impossibile leggere ${filePath}: ${error.message}`);
      }
    }
  }

  async writeJSON(filePath, data) {
    let release;

    try {
      release = await lockManager.acquireLock(filePath);

      try {
        await fs.copyFile(filePath, `${filePath}.bak`);
      } catch (error) {
      }

      const dir = path.dirname(filePath);
      await this.ensureDir(dir);

      const tempPath = `${filePath}.tmp`;
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(tempPath, content, 'utf8');
      await this.replaceFile(tempPath, filePath);

    } finally {
      if (release) {
        await release();
      }
    }
  }

  async replaceFile(tempPath, filePath) {
    try {
      await fs.rename(tempPath, filePath);
      return;
    } catch (error) {
      if (!['EPERM', 'EXDEV', 'EBUSY'].includes(error.code)) {
        throw error;
      }
    }

    await fs.copyFile(tempPath, filePath);
    await fs.unlink(tempPath);
  }

  async appendLine(filePath, line) {
    const dir = path.dirname(filePath);
    await this.ensureDir(dir);

    await fs.appendFile(filePath, line + '\n', 'utf8');
  }

  async listFiles(dirPath) {
    try {
      return await fs.readdir(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

module.exports = new FileStorage();
