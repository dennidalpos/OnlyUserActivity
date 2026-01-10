const { Client } = require('ldapts');
const config = require('../../config');

class LDAPClient {
  shouldDebug() {
    return process.env.LDAP_DEBUG === 'true';
  }

  logDebug(message, payload) {
    if (this.shouldDebug()) {
      if (payload !== undefined) {
        console.debug(`[ldap] ${message}`, payload);
      } else {
        console.debug(`[ldap] ${message}`);
      }
    }
  }

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

    const normalizedRequired = this.normalizeGroupName(requiredGroup);
    if (!normalizedRequired) {
      return false;
    }
    const requiredLower = normalizedRequired.toLowerCase();
    return memberOf.some(group => {
      const normalizedGroup = this.normalizeGroupName(group);
      return normalizedGroup && normalizedGroup.toLowerCase() === requiredLower;
    });
  }

  isGroupNameMatch(groupName, requiredGroup) {
    const normalizedGroupName = this.normalizeGroupName(groupName);
    const normalizedRequired = this.normalizeGroupName(requiredGroup);
    if (!normalizedGroupName || !normalizedRequired) {
      return false;
    }
    return normalizedGroupName.toLowerCase() === normalizedRequired.toLowerCase();
  }

  normalizeGroupName(value) {
    if (!value) {
      return '';
    }
    const candidate = Array.isArray(value) ? value[0] : value;
    const text = String(candidate).trim();
    const cnMatch = text.match(/CN=([^,]+)/i);
    return cnMatch ? cnMatch[1].trim() : text;
  }

  normalizePrimaryGroupId(value) {
    if (Array.isArray(value)) {
      return this.normalizePrimaryGroupId(value[0]);
    }
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    const text = String(value).trim();
    return text.length > 0 ? text : null;
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
    const primaryGroupValue = this.normalizePrimaryGroupId(primaryGroupID);
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
    this.logDebug('primaryGroupID lookup by objectSid', {
      primaryGroupID,
      primaryGroupValue,
      domainSid,
      groupSid,
      searchBase: groupBase,
      found: (searchEntries || []).length
    });
    if (!searchEntries || searchEntries.length === 0) {
      const tokenOpts = {
        filter: `(primaryGroupToken=${primaryGroupValue})`,
        scope: 'sub',
        attributes: ['cn', 'distinguishedName']
      };
      ({ searchEntries } = await client.search(groupBase, tokenOpts));
      this.logDebug('primaryGroupID lookup by primaryGroupToken', {
        primaryGroupValue,
        searchBase: groupBase,
        found: (searchEntries || []).length
      });
      if (!searchEntries || searchEntries.length === 0) {
        return null;
      }
    }

    const entry = searchEntries[0];
    if (entry.cn) {
      return this.normalizeGroupName(entry.cn);
    }
    const dn = entry.dn || entry.distinguishedName || '';
    const normalized = this.normalizeGroupName(dn);
    return normalized || null;
  }

  async unbind(client) {
    if (client) {
      await client.unbind();
    }
  }
}

module.exports = new LDAPClient();
