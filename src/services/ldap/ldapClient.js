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
      attributes: ['dn', 'displayName', 'mail', 'department', 'memberOf', 'sAMAccountName', 'primaryGroupID']
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
      memberOf,
      primaryGroupID: entry.primaryGroupID || null
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

  isGroupNameMatch(groupName, requiredGroup) {
    if (!groupName || !requiredGroup) {
      return false;
    }
    return groupName.toLowerCase() === requiredGroup.toLowerCase();
  }

  normalizeSidValue(value) {
    if (Array.isArray(value)) {
      return this.normalizeSidValue(value[0]);
    }
    if (!value) {
      return null;
    }
    if (Buffer.isBuffer(value)) {
      return this.decodeSid(value);
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value instanceof Uint8Array) {
      return this.decodeSid(Buffer.from(value));
    }
    return null;
  }

  decodeSid(buffer) {
    if (!buffer || buffer.length < 8) {
      return null;
    }
    const revision = buffer[0];
    const subAuthCount = buffer[1];
    const authority = buffer.readUIntBE(2, 6);
    let sid = `S-${revision}-${authority}`;
    for (let i = 0; i < subAuthCount; i++) {
      const offset = 8 + (i * 4);
      if (offset + 4 > buffer.length) {
        break;
      }
      sid += `-${buffer.readUInt32LE(offset)}`;
    }
    return sid;
  }

  async getDomainSid(client) {
    const opts = {
      filter: '(objectClass=*)',
      scope: 'base',
      attributes: ['objectSid']
    };

    const { searchEntries } = await client.search(config.ldap.baseDN, opts);
    if (!searchEntries || searchEntries.length === 0) {
      return null;
    }

    return this.normalizeSidValue(searchEntries[0].objectSid);
  }

  async resolvePrimaryGroupName(client, primaryGroupID) {
    const primaryGroupValue = Array.isArray(primaryGroupID)
      ? primaryGroupID[0]
      : primaryGroupID;
    if (!primaryGroupValue) {
      return null;
    }

    const domainSid = await this.getDomainSid(client);
    if (!domainSid) {
      return null;
    }

    const groupSid = `${domainSid}-${primaryGroupValue}`;
    const groupBase = config.ldap.groupSearchBase || config.ldap.baseDN;
    const opts = {
      filter: `(objectSid=${groupSid})`,
      scope: 'sub',
      attributes: ['cn', 'distinguishedName']
    };

    let { searchEntries } = await client.search(groupBase, opts);
    if (!searchEntries || searchEntries.length === 0) {
      const tokenOpts = {
        filter: `(primaryGroupToken=${primaryGroupValue})`,
        scope: 'sub',
        attributes: ['cn', 'distinguishedName']
      };
      ({ searchEntries } = await client.search(groupBase, tokenOpts));
      if (!searchEntries || searchEntries.length === 0) {
        return null;
      }
    }

    const entry = searchEntries[0];
    if (entry.cn) {
      return entry.cn;
    }
    const dn = entry.dn || entry.distinguishedName || '';
    const cnMatch = dn.match(/CN=([^,]+)/i);
    return cnMatch ? cnMatch[1] : null;
  }

  async unbind(client) {
    if (client) {
      await client.unbind();
    }
  }
}

module.exports = new LDAPClient();
