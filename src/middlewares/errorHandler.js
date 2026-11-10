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
    const log = req.log || logger || console;

    let statusCode = err.statusCode || 500;
    let code = err.code || 'INTERNAL_ERROR';
    let message = err.message || 'Errore interno del server';
    let details = err.details || null;

    if (statusCode >= 500) {
      log.error({
        err,
        requestId,
        url: req.url,
        method: req.method,
        stack: err.stack
      }, 'Server error');
    }

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

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  errorHandler,
  asyncHandler
};
