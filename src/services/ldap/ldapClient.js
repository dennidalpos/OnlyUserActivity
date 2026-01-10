const { Client } = require('ldapts');
const config = require('../../config');

class LDAPClient {
  shouldDebug() {
    return config.logging.categories.ldap === true;
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

    const groupLower = normalizedGroupName.toLowerCase();
    const requiredLower = normalizedRequired.toLowerCase();

    if (groupLower === requiredLower) {
      return true;
    }

    const variations = this.getGroupNameVariations(requiredLower);
    return variations.includes(groupLower);
  }

  getGroupNameVariations(groupName) {
    const variations = [groupName];

    const wellKnownGroups = {
      'domain users': ['domain user', 'utenti di dominio', 'utente di dominio'],
      'domain admins': ['domain admin', 'domain administrators', 'amministratori di dominio'],
      'administrators': ['administrator', 'amministratori'],
      'users': ['user', 'utenti', 'utente']
    };

    for (const [canonical, aliases] of Object.entries(wellKnownGroups)) {
      if (groupName === canonical) {
        variations.push(...aliases);
      } else if (aliases.includes(groupName)) {
        variations.push(canonical, ...aliases.filter(a => a !== groupName));
      }
    }

    return variations;
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
    if (!text) {
      return null;
    }
    return /^\d+$/.test(text) ? text : null;
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
      if (value.startsWith('S-') || value.startsWith('s-')) {
        return value;
      }
      if (value.length > 0 && value.charCodeAt(0) <= 255) {
        const buffer = Buffer.from(value, 'binary');
        return this.decodeSid(buffer);
      }
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

  encodeSid(sidString) {
    if (!sidString || typeof sidString !== 'string') {
      return null;
    }
    const parts = sidString.split('-');
    if (parts.length < 4 || parts[0] !== 'S') {
      return null;
    }

    const revision = parseInt(parts[1], 10);
    const authority = parseInt(parts[2], 10);
    const subAuthorities = parts.slice(3).map(p => parseInt(p, 10));

    const buffer = Buffer.alloc(8 + (subAuthorities.length * 4));
    buffer[0] = revision;
    buffer[1] = subAuthorities.length;
    buffer.writeUIntBE(authority, 2, 6);

    for (let i = 0; i < subAuthorities.length; i++) {
      buffer.writeUInt32LE(subAuthorities[i], 8 + (i * 4));
    }

    return buffer;
  }

  bufferToLdapHex(buffer) {
    if (!buffer) {
      return null;
    }
    return Array.from(buffer)
      .map(byte => `\\${byte.toString(16).padStart(2, '0')}`)
      .join('');
  }

  async getDomainSid(client) {
    const opts = {
      filter: '(objectClass=*)',
      scope: 'base',
      attributes: ['objectSid']
    };

    const { searchEntries } = await client.search(config.ldap.baseDN, opts);
    if (!searchEntries || searchEntries.length === 0) {
      this.logDebug('getDomainSid: no entries found');
      return null;
    }

    const sid = this.normalizeSidValue(searchEntries[0].objectSid);
    this.logDebug('getDomainSid: resolved', {
      rawObjectSid: searchEntries[0].objectSid,
      isBuffer: Buffer.isBuffer(searchEntries[0].objectSid),
      sid
    });
    return sid;
  }

  async resolvePrimaryGroupName(client, primaryGroupID) {
    const primaryGroupValue = this.normalizePrimaryGroupId(primaryGroupID);
    if (!primaryGroupValue) {
      this.logDebug('resolvePrimaryGroupName: invalid primaryGroupID', { primaryGroupID });
      return null;
    }

    const groupBase = config.ldap.groupSearchBase || config.ldap.baseDN;
    let searchEntries = [];

    try {
      const tokenOpts = {
        filter: `(primaryGroupToken=${primaryGroupValue})`,
        scope: 'sub',
        attributes: ['cn', 'distinguishedName', 'sAMAccountName']
      };
      const tokenResult = await client.search(groupBase, tokenOpts);
      searchEntries = tokenResult.searchEntries || [];
      this.logDebug('primaryGroupID lookup by primaryGroupToken', {
        primaryGroupValue,
        searchBase: groupBase,
        found: searchEntries.length,
        entries: searchEntries.map(e => ({
          cn: e.cn,
          dn: e.dn || e.distinguishedName,
          sAMAccountName: e.sAMAccountName
        }))
      });
    } catch (error) {
      this.logDebug('primaryGroupToken search failed', { error: error.message });
    }

    if ((!searchEntries || searchEntries.length === 0)) {
      try {
        const domainSid = await this.getDomainSid(client);
        if (domainSid && domainSid.startsWith('S-')) {
          const groupSid = `${domainSid}-${primaryGroupValue}`;
          const sidBuffer = this.encodeSid(groupSid);
          const hexSid = sidBuffer ? this.bufferToLdapHex(sidBuffer) : null;

          if (hexSid) {
            const opts = {
              filter: `(objectSid=${hexSid})`,
              scope: 'sub',
              attributes: ['cn', 'distinguishedName', 'sAMAccountName']
            };

            const result = await client.search(groupBase, opts);
            searchEntries = result.searchEntries || [];
            this.logDebug('primaryGroupID lookup by objectSid', {
              primaryGroupID,
              primaryGroupValue,
              domainSid,
              groupSid,
              hexSid,
              searchBase: groupBase,
              found: searchEntries.length,
              entries: searchEntries.map(e => ({
                cn: e.cn,
                dn: e.dn || e.distinguishedName,
                sAMAccountName: e.sAMAccountName
              }))
            });
          }
        }
      } catch (error) {
        this.logDebug('objectSid search failed', { error: error.message });
      }
    }

    if (!searchEntries || searchEntries.length === 0) {
      const wellKnownRids = {
        '512': 'Domain Admins',
        '513': 'Domain Users',
        '514': 'Domain Guests',
        '515': 'Domain Computers',
        '516': 'Domain Controllers',
        '519': 'Enterprise Admins',
        '520': 'Group Policy Creator Owners'
      };

      const wellKnownName = wellKnownRids[primaryGroupValue];
      if (wellKnownName) {
        this.logDebug('resolvePrimaryGroupName: using well-known RID mapping', {
          primaryGroupID,
          primaryGroupValue,
          groupName: wellKnownName
        });
        return wellKnownName;
      }

      this.logDebug('resolvePrimaryGroupName: no group found for primaryGroupID', {
        primaryGroupID,
        primaryGroupValue
      });
      return null;
    }

    const entry = searchEntries[0];
    let groupName = null;

    if (entry.cn) {
      groupName = this.normalizeGroupName(entry.cn);
    } else if (entry.sAMAccountName) {
      groupName = this.normalizeGroupName(entry.sAMAccountName);
    } else {
      const dn = entry.dn || entry.distinguishedName || '';
      groupName = this.normalizeGroupName(dn);
    }

    this.logDebug('resolvePrimaryGroupName: resolved', {
      primaryGroupID,
      primaryGroupValue,
      groupName,
      cn: entry.cn,
      sAMAccountName: entry.sAMAccountName
    });

    return groupName || null;
  }

  async unbind(client) {
    if (client) {
      await client.unbind();
    }
  }
}

module.exports = new LDAPClient();
