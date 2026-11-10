const fs = require('fs');
const path = require('path');
const pino = require('pino');
const config = require('../../config');

function createLogDestination() {
  if (!config.logging.toFile) {
    return undefined;
  }
  const logDir = path.dirname(config.logging.filePath);
  fs.mkdirSync(logDir, { recursive: true });
  return pino.destination({ dest: config.logging.filePath, sync: false });
}

function createLogger(destination) {
  return pino({
    level: config.logging.level,
    transport: !config.logging.toFile && config.env === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    } : undefined
  }, destination);
}

module.exports = {
  createLogDestination,
  createLogger
};
