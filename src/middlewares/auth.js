const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('./errorHandler');

/**
 * Middleware autenticazione JWT per API utenti
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(new AppError('Token di autenticazione mancante', 401, 'MISSING_TOKEN'));
  }

  jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Token scaduto', 401, 'TOKEN_EXPIRED'));
      }
      return next(new AppError('Token non valido', 401, 'INVALID_TOKEN'));
    }

    // Aggiungi user info alla request
    req.user = {
      userKey: decoded.userKey,
      username: decoded.username
    };

    next();
  });
}

module.exports = authenticateToken;
