const crypto = require('crypto');

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

  const excludeKeys = [
    'createdAt',
    'updatedAt',
    'timestamp',
    'requestId',
    'id',
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

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = {
  generatePayloadHash,
  normalizePayload,
  generateId,
  generateSecureToken
};
