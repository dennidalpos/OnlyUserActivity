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
        if (ldapClient.shouldDebug()) {
          console.debug('[ldap] required group check', {
            requiredGroup: config.ldap.requiredGroup,
            memberOf: ldapUser.memberOf,
            primaryGroupID: ldapUser.primaryGroupID
          });
        }

        const isMember = ldapClient.isMemberOfGroup(
          ldapUser.memberOf,
          config.ldap.requiredGroup
        );

        let isPrimaryGroup = false;
        let primaryGroupName = null;
        if (ldapUser.primaryGroupID) {
          primaryGroupName = await ldapClient.resolvePrimaryGroupName(
            serviceClient,
            ldapUser.primaryGroupID
          );
          isPrimaryGroup = ldapClient.isGroupNameMatch(primaryGroupName, config.ldap.requiredGroup);

          if (ldapClient.shouldDebug()) {
            console.debug('[ldap] primary group check', {
              primaryGroupID: ldapUser.primaryGroupID,
              primaryGroupName,
              isPrimaryGroup,
              requiredGroup: config.ldap.requiredGroup
            });
          }
        }

        if (!isMember && !isPrimaryGroup) {
          throw new Error(`Utente non appartiene al gruppo ${config.ldap.requiredGroup}`);
        }

        if (ldapClient.shouldDebug()) {
          console.debug('[ldap] group check passed', {
            isMember,
            isPrimaryGroup,
            primaryGroupName
          });
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
        const defaultContractPreset = config.server.defaultUserContractPreset || null;
        user = await userStorage.create({
          username: ldapUser.username,
          displayName: ldapUser.displayName,
          email: ldapUser.email,
          department: ldapUser.department,
          shift: defaultShift || null,
          contractPreset: defaultContractPreset || null,
          userType: 'ad',
          metadata: {
            ldapDN: ldapUser.dn
          }
        });
      } else {
        const updates = {};
        if (ldapUser.displayName && ldapUser.displayName !== user.displayName) {
          updates.displayName = ldapUser.displayName;
        }
        if ((ldapUser.email || null) !== (user.email || null)) {
          updates.email = ldapUser.email || null;
        }
        if ((ldapUser.department || null) !== (user.department || null)) {
          updates.department = ldapUser.department || null;
        }
        if (Object.keys(updates).length > 0) {
          user = await userStorage.update(user.userKey, updates);
        }
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
