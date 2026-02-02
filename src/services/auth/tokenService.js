const jwt = require('jsonwebtoken');
const config = require('../../config');

class TokenService {
  generateToken(user) {
    const payload = {
      userKey: user.userKey,
      username: user.username
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000).toISOString();

    return {
      token,
      expiresAt
    };
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new Error('Token non valido o scaduto');
    }
  }

  decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = new TokenService();
