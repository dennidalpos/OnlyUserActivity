const fs = require('fs').promises;
const path = require('path');
const config = require('../../config');
const lockManager = require('./lockManager');

/**
 * Servizio base per operazioni filesystem con locking
 */
class FileStorage {
  constructor() {
    this.rootPath = config.storage.rootPath;
  }

  /**
   * Inizializza struttura directory
   */
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

  /**
   * Assicura che directory esista
   */
  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Legge file JSON in modo sicuro
   * @param {string} filePath
   * @returns {Object|null}
   */
  async readJSON(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // File non esiste
      }

      // Tentativo recovery da backup
      const backupPath = `${filePath}.bak`;
      try {
        const backupContent = await fs.readFile(backupPath, 'utf8');
        return JSON.parse(backupContent);
      } catch (backupError) {
        throw new Error(`Impossibile leggere ${filePath}: ${error.message}`);
      }
    }
  }

  /**
   * Scrive file JSON con lock e backup
   * @param {string} filePath
   * @param {Object} data
   */
  async writeJSON(filePath, data) {
    let release;

    try {
      // Acquisisce lock
      release = await lockManager.acquireLock(filePath);

      // Backup file esistente
      try {
        await fs.copyFile(filePath, `${filePath}.bak`);
      } catch (error) {
        // File non esiste ancora, ok
      }

      // Scrittura atomica: temp + rename
      const dir = path.dirname(filePath);
      await this.ensureDir(dir);

      const tempPath = `${filePath}.tmp`;
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(tempPath, content, 'utf8');
      await fs.rename(tempPath, filePath);

    } finally {
      if (release) {
        await release();
      }
    }
  }

  /**
   * Append line a file (per audit log)
   * @param {string} filePath
   * @param {string} line
   */
  async appendLine(filePath, line) {
    const dir = path.dirname(filePath);
    await this.ensureDir(dir);

    await fs.appendFile(filePath, line + '\n', 'utf8');
  }

  /**
   * Lista file in directory
   * @param {string} dirPath
   * @returns {Array<string>}
   */
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

  /**
   * Verifica esistenza file
   * @param {string} filePath
   * @returns {boolean}
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Elimina file
   * @param {string} filePath
   */
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
