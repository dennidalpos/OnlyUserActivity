const { v4: uuidv4 } = require('uuid');

/**
 * Middleware che aggiunge requestId a ogni richiesta e logga
 */
function requestLogger(logger) {
  return (req, res, next) => {
    req.id = uuidv4();
    req.log = logger.child({ requestId: req.id });

    const startTime = Date.now();

    // Log richiesta
    req.log.info({
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }, 'Incoming request');

    // Log risposta
    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - startTime;
      req.log.info({
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      }, 'Request completed');

      originalSend.call(this, data);
    };

    next();
  };
}

module.exports = requestLogger;
