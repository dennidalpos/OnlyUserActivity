const { v4: uuidv4 } = require('uuid');

function requestLogger(logger) {
  return (req, res, next) => {
    req.id = uuidv4();
    req.log = logger.child({ requestId: req.id });

    const startTime = Date.now();

    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - startTime;

      if (res.statusCode >= 400) {
        req.log.error({
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`
        }, 'Request failed');
      }

      originalSend.call(this, data);
    };

    next();
  };
}

module.exports = requestLogger;
