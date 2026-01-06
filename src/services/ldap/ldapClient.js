const { Client } = require('ldapts');
const config = require('../../config');

class LDAPClient {
  createClient() {
    return this.createClientWithConfig(config.ldap);
  }

  async createClientWithConfig(ldapConfig) {
    const client = new Client({
      url: ldapConfig.url,
      timeout: ldapConfig.timeout,
      connectTimeout: ldapConfig.timeout
    });

    return client;
  }

  async bind(client, dn, password) {
    await client.bind(dn, password);
  }

  async searchUser(client, username) {
    const filter = config.ldap.userSearchFilter.replace('{{username}}', username);
    const opts = {
      filter,
      scope: 'sub',
      attributes: ['dn', 'displayName', 'mail', 'department', 'memberOf', 'sAMAccountName']
    };

    const { searchEntries } = await client.search(config.ldap.baseDN, opts);

    if (!searchEntries || searchEntries.length === 0) {
      return null;
    }

    const entry = searchEntries[0];
    const memberOf = Array.isArray(entry.memberOf)
      ? entry.memberOf
      : (entry.memberOf ? [entry.memberOf] : []);

    return {
      dn: entry.dn,
      username: entry.sAMAccountName || username,
      displayName: entry.displayName || username,
      email: entry.mail || null,
      department: entry.department || null,
      memberOf
    };
  }

  isMemberOfGroup(memberOf, requiredGroup) {
    if (!memberOf || memberOf.length === 0) {
      return false;
    }

    const groupLower = requiredGroup.toLowerCase();
    return memberOf.some(group => {
      const cnMatch = group.match(/CN=([^,]+)/i);
      if (cnMatch) {
        return cnMatch[1].toLowerCase() === groupLower;
      }
      return group.toLowerCase().includes(groupLower);
    });
  }

  async unbind(client) {
    if (client) {
      await client.unbind();
    }
  }
}

module.exports = new LDAPClient();
