const ldapClient = require('./ldapClient');
const config = require('../../config');
const userStorage = require('../storage/userStorage');

class LDAPAuth {
  async authenticate(username, password) {
    let client;

    try {
      client = await ldapClient.createClient();

      if (config.ldap.bindDN) {
        await ldapClient.bind(client, config.ldap.bindDN, config.ldap.bindPassword);
      }

      const ldapUser = await ldapClient.searchUser(client, username);

      if (!ldapUser) {
        throw new Error('Utente non trovato in LDAP');
      }

      if (config.ldap.requiredGroup) {
        const isMember = ldapClient.isMemberOfGroup(
          ldapUser.memberOf,
          config.ldap.requiredGroup
        );

        if (!isMember) {
          throw new Error(`Utente non appartiene al gruppo ${config.ldap.requiredGroup}`);
        }
      }

      ldapClient.unbind(client);
      client = await ldapClient.createClient();
      await ldapClient.bind(client, ldapUser.dn, password);

      let user = await userStorage.findByUsername(username);

      if (!user) {
        user = await userStorage.create({
          username: ldapUser.username,
          displayName: ldapUser.displayName,
          email: ldapUser.email,
          department: ldapUser.department,
          userType: 'ad',
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
