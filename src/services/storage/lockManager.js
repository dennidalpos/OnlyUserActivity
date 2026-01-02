const lockfile = require('proper-lockfile');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config');

/**
 * Gestione lock su file per operazioni concorrenti
 */
class LockManager {
  constructor() {
    this.locksDir = path.join(config.storage.rootPath, 'locks');
  }

  /**
   * Inizializza directory locks
   */
  async initialize() {
    try {
      await fs.mkdir(this.locksDir, { recursive: true });
    } catch (error) {
      // Ignora se già esiste
    }
  }

  /**
   * Acquisisce lock su file
   * @param {string} filePath - Path del file da lockare
   * @param {Object} options - Opzioni lockfile
   * @returns {Function} Release function
   */
  async acquireLock(filePath, options = {}) {
    const defaultOptions = {
      retries: {
        retries: 5,
        minTimeout: 100,
        maxTimeout: 1000
      },
      stale: 10000, // 10 secondi
      ...options
    };

    try {
      // Assicura che il file esista (lockfile richiede file esistente)
      await this.ensureFileExists(filePath);

      const release = await lockfile.lock(filePath, defaultOptions);
      return release;
    } catch (error) {
      throw new Error(`Impossibile acquisire lock su ${filePath}: ${error.message}`);
    }
  }

  /**
   * Assicura che il file esista (crea vuoto se non esiste)
   * @param {string} filePath
   */
  async ensureFileExists(filePath) {
    try {
      await fs.access(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File non esiste, crealo vuoto
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, '{}', 'utf8');
      }
    }
  }

  /**
   * Verifica se un file è lockato
   * @param {string} filePath
   * @returns {boolean}
   */
  async isLocked(filePath) {
    try {
      return await lockfile.check(filePath);
    } catch (error) {
      return false;
    }
  }
}

module.exports = new LockManager();
