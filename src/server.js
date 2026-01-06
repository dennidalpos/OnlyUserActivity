const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('./app');
const config = require('./config');
const pino = require('pino');

function createLogDestination() {
  if (!config.logging.toFile) {
    return undefined;
  }
  const logDir = path.dirname(config.logging.filePath);
  fs.mkdirSync(logDir, { recursive: true });
  return pino.destination({ dest: config.logging.filePath, sync: false });
}

const logDestination = createLogDestination();
const logger = pino({
  level: config.logging.level
}, logDestination);

let server;

if (config.https.enabled) {
  try {
    const httpsOptions = {
      cert: fs.readFileSync(config.https.certPath),
      key: fs.readFileSync(config.https.keyPath)
    };
    server = https.createServer(httpsOptions, app);
    logger.info('HTTPS enabled');
  } catch (error) {
    logger.error({ err: error }, 'Errore caricamento certificati HTTPS');
    process.exit(1);
  }
} else {
  server = http.createServer(app);
  logger.info('HTTP mode (consider using reverse proxy with HTTPS in production)');
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Porta ${config.server.port} già in uso`);
  } else {
    logger.error({ err: error }, 'Errore server');
  }
  process.exit(1);
});

server.listen(config.server.port, config.server.host, () => {
  logger.info({
    host: config.server.host,
    port: config.server.port,
    env: config.env,
    protocol: config.https.enabled ? 'HTTPS' : 'HTTP'
  }, 'Server avviato');

  logger.info(`Access application at: ${config.https.enabled ? 'https' : 'http'}://${config.server.host}:${config.server.port}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
  process.exit(1);
});
