const path = require('path');
const config = require('../../config');
const fileStorage = require('./fileStorage');
const { generatePayloadHash } = require('../utils/hashUtils');
const { formatDate } = require('../utils/dateUtils');

/**
 * Servizio per audit logging append-only
 */
class AuditLogger {
  constructor() {
    this.rootPath = path.join(config.storage.rootPath, 'audit');
    this.payloadMode = config.storage.auditPayloadMode;
  }

  /**
   * Logga evento audit
   * @param {string} action - Tipo azione (LOGIN, CREATE_ACTIVITY, etc.)
   * @param {string} userKey - ID utente
   * @param {Object} payload - Dati azione
   * @param {string} requestId - ID richiesta
   * @param {string} ip - IP client
   * @param {string} username - Username (opzionale)
   */
  async log(action, userKey, payload, requestId, ip, username = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      requestId,
      userKey,
      username,
      action,
      ip,
      payloadHash: generatePayloadHash(payload),
      payload: this.sanitizePayload(payload)
    };

    const logPath = this.getLogPath(new Date());
    const logLine = JSON.stringify(entry);

    await fileStorage.appendLine(logPath, logLine);
  }

  /**
   * Sanitizza payload in base a AUDIT_PAYLOAD_MODE
   * @param {Object} payload
   * @returns {Object|null}
   */
  sanitizePayload(payload) {
    if (this.payloadMode === 'redacted') {
      return null;
    }

    if (this.payloadMode === 'full') {
      return payload;
    }

    // partial: rimuovi dati sensibili
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const { password, token, ...safe } = payload;
    return safe;
  }

  /**
   * Genera path file audit log per data
   * @param {Date} date
   * @returns {string}
   */
  getLogPath(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return path.join(this.rootPath, String(year), month, `${day}.jsonl`);
  }

  /**
   * Leggi audit log per data
   * @param {string} dateString - YYYY-MM-DD
   * @returns {Array<Object>}
   */
  async readLog(dateString) {
    const [year, month, day] = dateString.split('-');
    const logPath = path.join(this.rootPath, year, month, `${day}.jsonl`);

    const exists = await fileStorage.fileExists(logPath);
    if (!exists) {
      return [];
    }

    const fs = require('fs').promises;
    const content = await fs.readFile(logPath, 'utf8');
    const lines = content.trim().split('\n');

    return lines
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          return null;
        }
      })
      .filter(entry => entry !== null);
  }
}

module.exports = new AuditLogger();
