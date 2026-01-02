const ldapClient = require('./ldapClient');
const config = require('../../config');
const userStorage = require('../storage/userStorage');

/**
 * Servizio autenticazione LDAP
 */
class LDAPAuth {
  /**
   * Autentica utente contro LDAP/AD
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object>} User object
   */
  async authenticate(username, password) {
    let client;

    try {
      // Connetti a LDAP
      client = await ldapClient.createClient();

      // Se configurato bind DN, usa quello per cercare
      if (config.ldap.bindDN) {
        await ldapClient.bind(client, config.ldap.bindDN, config.ldap.bindPassword);
      }

      // Cerca utente
      const ldapUser = await ldapClient.searchUser(client, username);

      if (!ldapUser) {
        throw new Error('Utente non trovato in LDAP');
      }

      // Verifica membership gruppo
      if (config.ldap.requiredGroup) {
        const isMember = ldapClient.isMemberOfGroup(
          ldapUser.memberOf,
          config.ldap.requiredGroup
        );

        if (!isMember) {
          throw new Error(`Utente non appartiene al gruppo ${config.ldap.requiredGroup}`);
        }
      }

      // Autentica con credenziali utente
      ldapClient.unbind(client);
      client = await ldapClient.createClient();
      await ldapClient.bind(client, ldapUser.dn, password);

      // Crea o aggiorna utente locale
      let user = await userStorage.findByUsername(username);

      if (!user) {
        user = await userStorage.create({
          username: ldapUser.username,
          displayName: ldapUser.displayName,
          email: ldapUser.email,
          department: ldapUser.department,
          metadata: {
            ldapDN: ldapUser.dn
          }
        });
      } else {
        await userStorage.updateLastLogin(user.userKey);
      }

      return user;

    } catch (error) {
      if (error.message.includes('Invalid Credentials')) {
        throw new Error('Username o password non validi');
      }
      throw error;
    } finally {
      if (client) {
        ldapClient.unbind(client);
      }
    }
  }
}

module.exports = new LDAPAuth();
