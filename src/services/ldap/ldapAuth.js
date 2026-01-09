const ldapClient = require('./ldapClient');
const config = require('../../config');
const userStorage = require('../storage/userStorage');

class LDAPAuth {
  async authenticate(username, password) {
    let serviceClient;
    let authClient;

    try {
      serviceClient = await ldapClient.createClient();

      if (config.ldap.bindDN) {
        try {
          await ldapClient.bind(serviceClient, config.ldap.bindDN, config.ldap.bindPassword);
        } catch (error) {
          if (this.isInvalidCredentialsError(error)) {
            throw new Error('Credenziali account di servizio LDAP non valide');
          }
          throw error;
        }
      }

      const ldapUser = await ldapClient.searchUser(serviceClient, username);

      if (!ldapUser) {
        throw new Error('Utente non trovato in LDAP');
      }

      if (config.ldap.requiredGroup) {
        const isMember = ldapClient.isMemberOfGroup(
          ldapUser.memberOf,
          config.ldap.requiredGroup
        );

        let hasPrimaryGroup = false;
        if (!isMember) {
          const primaryGroupName = await ldapClient.resolvePrimaryGroupName(
            serviceClient,
            ldapUser.primaryGroupID
          );
          hasPrimaryGroup = ldapClient.isGroupNameMatch(primaryGroupName, config.ldap.requiredGroup);
        }

        if (!isMember && !hasPrimaryGroup) {
          throw new Error(`Utente non appartiene al gruppo ${config.ldap.requiredGroup}`);
        }
      }

      authClient = await ldapClient.createClient();
      try {
        await ldapClient.bind(authClient, ldapUser.dn, password);
      } catch (error) {
        if (this.isInvalidCredentialsError(error)) {
          throw new Error('Username o password non validi');
        }
        throw error;
      }

      let user = await userStorage.findByUsername(username);

      if (!user) {
        const defaultShift = config.server.defaultUserShift || null;
        user = await userStorage.create({
          username: ldapUser.username,
          displayName: ldapUser.displayName,
          email: ldapUser.email,
          department: ldapUser.department,
          shift: defaultShift || null,
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
      if (this.isInvalidCredentialsError(error)) {
        throw new Error('Username o password non validi');
      }
      throw error;
    } finally {
      if (serviceClient) {
        await ldapClient.unbind(serviceClient);
      }
      if (authClient) {
        await ldapClient.unbind(authClient);
      }
    }
  }

  isInvalidCredentialsError(error) {
    const message = error?.message || '';
    const lowered = message.toLowerCase();
    return lowered.includes('invalid credentials')
      || message.includes('InvalidCredentialsError')
      || message.includes('Invalid Credentials');
  }
}

module.exports = new LDAPAuth();
