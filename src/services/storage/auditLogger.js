const path = require('path');
const config = require('../../config');
const fileStorage = require('./fileStorage');
const { generatePayloadHash } = require('../utils/hashUtils');

class AuditLogger {
  constructor() {
    this.rootPath = path.join(config.storage.rootPath, 'audit');
    this.payloadMode = config.storage.auditPayloadMode;
  }

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

  sanitizePayload(payload) {
    if (this.payloadMode === 'redacted') {
      return null;
    }

    if (this.payloadMode === 'full') {
      return payload;
    }

    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const { password, token, ...safe } = payload;
    return safe;
  }

  getLogPath(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return path.join(this.rootPath, String(year), month, `${day}.jsonl`);
  }

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
