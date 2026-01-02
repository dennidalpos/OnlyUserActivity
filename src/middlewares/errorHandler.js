/**
 * Middleware per gestione errori centralizzata
 */

class AppError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(logger) {
  return (err, req, res, next) => {
    const requestId = req.id || 'unknown';

    // Default error
    let statusCode = err.statusCode || 500;
    let code = err.code || 'INTERNAL_ERROR';
    let message = err.message || 'Errore interno del server';
    let details = err.details || null;

    // Log error
    if (statusCode >= 500) {
      req.log.error({
        err,
        requestId,
        url: req.url,
        method: req.method
      }, 'Server error');
    } else {
      req.log.warn({
        code,
        message,
        requestId,
        url: req.url
      }, 'Client error');
    }

    // Response
    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
        requestId
      }
    });
  };
}

module.exports = {
  AppError,
  errorHandler
};
