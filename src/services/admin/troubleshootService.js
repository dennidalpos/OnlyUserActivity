const path = require('path');
const fs = require('fs').promises;
const config = require('../../config');
const ldapClient = require('../ldap/ldapClient');

class TroubleshootService {
  constructor() {}

  parseIntSetting(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < min || parsed > max) {
      throw new Error(`${label} non valido. Deve essere tra ${min} e ${max}.`);
    }
    return parsed;
  }

  async testLdapBind({ url, bindDN, bindPassword, timeout }) {
    if (!url) {
      throw new Error('URL LDAP obbligatorio');
    }
    if (!bindDN) {
      throw new Error('Bind DN obbligatorio');
    }
    if (!bindPassword) {
      throw new Error('Password bind obbligatoria');
    }

    const ldapConfig = {
      url,
      timeout: this.parseIntSetting(timeout, 'Timeout LDAP', { min: 1000, max: 60000 }) || config.ldap.timeout
    };

    const client = await ldapClient.createClientWithConfig(ldapConfig);
    try {
      await ldapClient.bind(client, bindDN, bindPassword);
      return { success: true, message: 'Bind LDAP riuscito' };
    } finally {
      await ldapClient.unbind(client);
    }
  }

  async testStorageAccess(rootPath) {
    const trimmedPath = typeof rootPath === 'string' ? rootPath.trim() : '';
    const targetPath = trimmedPath || config.storage.rootPath;
    await fs.mkdir(targetPath, { recursive: true });
    const testFile = path.join(targetPath, `.write-test-${Date.now()}.tmp`);
    await fs.writeFile(testFile, 'ok', 'utf-8');
    await fs.unlink(testFile);
    return { success: true, message: `Scrittura riuscita su ${targetPath}` };
  }

  async testHttpsFiles(certPath, keyPath) {
    const trimmedCertPath = typeof certPath === 'string' ? certPath.trim() : '';
    const trimmedKeyPath = typeof keyPath === 'string' ? keyPath.trim() : '';
    if (!trimmedCertPath || !trimmedKeyPath) {
      const error = new Error('Percorsi certificato e chiave sono obbligatori');
      error.statusCode = 400;
      throw error;
    }
    try {
      await fs.access(trimmedCertPath);
      await fs.access(trimmedKeyPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const notFoundError = new Error('File HTTPS non trovato. Verifica i percorsi configurati.');
        notFoundError.statusCode = 400;
        throw notFoundError;
      }
      throw error;
    }
    return { success: true, message: 'File HTTPS trovati e accessibili' };
  }
}

module.exports = new TroubleshootService();
