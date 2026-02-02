const bcrypt = require('bcrypt');
const userStorage = require('../storage/userStorage');
const config = require('../../config');

class LocalAuth {
  async authenticate(username, password) {
    try {
      const user = await userStorage.findByUsername(username);

      if (!user) {
        throw new Error('Username o password non validi');
      }

      if (!user.passwordHash) {
        throw new Error('Utente non configurato per autenticazione locale');
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);

      if (!isValid) {
        throw new Error('Username o password non validi');
      }

      await userStorage.updateLastLogin(user.userKey);

      return user;

    } catch (error) {
      throw error;
    }
  }

  async register(userData) {
    const { username, password, displayName, email, department } = userData;

    const existing = await userStorage.findByUsername(username);
    if (existing) {
      throw new Error('Username già esistente');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await userStorage.create({
      username,
      displayName: displayName || username,
      email: email || '',
      department: department || '',
      passwordHash,
      metadata: {
        authMethod: 'local'
      }
    });

    return user;
  }

  async changePassword(username, oldPassword, newPassword) {
    await this.authenticate(username, oldPassword);

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const user = await userStorage.findByUsername(username);
    user.passwordHash = passwordHash;
    await userStorage.update(user.userKey, user);
  }
}

module.exports = new LocalAuth();
