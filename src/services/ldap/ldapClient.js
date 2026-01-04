const ldap = require('ldapjs');
const config = require('../../config');

class LDAPClient {
  createClient() {
    return new Promise((resolve, reject) => {
      const client = ldap.createClient({
        url: config.ldap.url,
        timeout: config.ldap.timeout,
        connectTimeout: config.ldap.timeout
      });

      client.on('error', (err) => {
        reject(new Error(`LDAP connection error: ${err.message}`));
      });

      const timeoutId = setTimeout(() => {
        client.destroy();
        reject(new Error('LDAP connection timeout'));
      }, config.ldap.timeout);

      client.on('connect', () => {
        clearTimeout(timeoutId);
        resolve(client);
      });
    });
  }

  bind(client, dn, password) {
    return new Promise((resolve, reject) => {
      client.bind(dn, password, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  searchUser(client, username) {
    return new Promise((resolve, reject) => {
      const filter = config.ldap.userSearchFilter.replace('{{username}}', username);
      const opts = {
        filter,
        scope: 'sub',
        attributes: ['dn', 'displayName', 'mail', 'department', 'memberOf', 'sAMAccountName']
      };

      client.search(config.ldap.baseDN, opts, (err, res) => {
        if (err) {
          return reject(err);
        }

        let user = null;

        res.on('searchEntry', (entry) => {
          user = {
            dn: entry.objectName,
            username: entry.object.sAMAccountName,
            displayName: entry.object.displayName || username,
            email: entry.object.mail || null,
            department: entry.object.department || null,
            memberOf: Array.isArray(entry.object.memberOf)
              ? entry.object.memberOf
              : (entry.object.memberOf ? [entry.object.memberOf] : [])
          };
        });

        res.on('error', (err) => {
          reject(err);
        });

        res.on('end', () => {
          resolve(user);
        });
      });
    });
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

  unbind(client) {
    if (client) {
      client.unbind();
    }
  }
}

module.exports = new LDAPClient();
