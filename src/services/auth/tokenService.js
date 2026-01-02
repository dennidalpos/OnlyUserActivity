const jwt = require('jsonwebtoken');
const config = require('../../config');

/**
 * Servizio gestione JWT token
 */
class TokenService {
  /**
   * Genera JWT token
   * @param {Object} user - User object
   * @returns {Object} { token, expiresAt }
   */
  generateToken(user) {
    const payload = {
      userKey: user.userKey,
      username: user.username
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    // Calcola expiresAt
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000).toISOString();

    return {
      token,
      expiresAt
    };
  }

  /**
   * Verifica token
   * @param {string} token
   * @returns {Object} Decoded payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new Error('Token non valido o scaduto');
    }
  }

  /**
   * Decode token senza verifica (per debug)
   * @param {string} token
   * @returns {Object}
   */
  decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = new TokenService();
