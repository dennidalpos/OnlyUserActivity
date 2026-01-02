const crypto = require('crypto');

/**
 * Genera hash SHA-256 del payload normalizzato
 * @param {Object} payload - Payload da hashare
 * @returns {string} Hash in formato "sha256:hexdigest"
 */
function generatePayloadHash(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'sha256:empty';
  }

  const normalized = normalizePayload(payload);
  const jsonString = JSON.stringify(normalized);

  const hash = crypto
    .createHash('sha256')
    .update(jsonString, 'utf8')
    .digest('hex');

  return `sha256:${hash}`;
}

/**
 * Normalizza payload per hashing deterministico
 * - Ordina chiavi alfabeticamente
 * - Rimuove campi temporali variabili
 * - Gestisce ricorsivamente oggetti annidati
 * @param {*} obj
 * @returns {*}
 */
function normalizePayload(obj) {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(normalizePayload);
  }

  // Campi da escludere dall'hash (variabili temporalmente)
  const excludeKeys = [
    'createdAt',
    'updatedAt',
    'timestamp',
    'requestId',
    'id', // UUID varia tra creazioni
    'iat',
    'exp'
  ];

  return Object.keys(obj)
    .filter(key => !excludeKeys.includes(key))
    .sort()
    .reduce((acc, key) => {
      acc[key] = normalizePayload(obj[key]);
      return acc;
    }, {});
}

/**
 * Genera ID univoco
 * @returns {string}
 */
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Genera token sicuro
 * @param {number} length - Lunghezza in byte
 * @returns {string}
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = {
  generatePayloadHash,
  normalizePayload,
  generateId,
  generateSecureToken
};
