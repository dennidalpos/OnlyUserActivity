const https = require('https');
const http = require('http');
const fs = require('fs');
const app = require('./app');
const config = require('./config');

let server;

async function bootstrap() {
  const logger = app.logger;

  await app.initialize();

  if (config.https.enabled) {
    const httpsOptions = {
      cert: fs.readFileSync(config.https.certPath),
      key: fs.readFileSync(config.https.keyPath)
    };
    server = https.createServer(httpsOptions, app);
    logger.info('HTTPS enabled');
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

  const shutdown = (signal) => {
    logger.info(`${signal} received, closing server...`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled rejection');
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  const logger = app.logger || console;
  logger.error({ err: error }, 'Fatal bootstrap error');
  process.exit(1);
});
