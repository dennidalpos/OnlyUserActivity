const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const pino = require('pino');
const config = require('./config');

const requestLogger = require('./middlewares/requestLogger');
const { errorHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');

const apiAuthRoutes = require('./routes/api/auth');
const apiActivitiesRoutes = require('./routes/api/activities');
const adminAuthRoutes = require('./routes/admin/auth');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const userAuthRoutes = require('./routes/user/auth');
const userDashboardRoutes = require('./routes/user/dashboard');

const fileStorage = require('./services/storage/fileStorage');
const adminAuthService = require('./services/auth/adminAuthService');

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
  level: config.logging.level,
  transport: !config.logging.toFile && config.env === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
}, logDestination);

const app = express();

app.set('trust proxy', config.server.trustProxy);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      upgradeInsecureRequests: null
    }
  },
  hsts: config.https.enabled ? undefined : false
}));

app.use('/api', cors({
  origin: config.security.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/admin', session({
  secret: config.admin.sessionSecret,
  resave: false,
  saveUninitialized: false,
  proxy: config.server.trustProxy > 0,
  cookie: {
    maxAge: config.admin.sessionMaxAge,
    httpOnly: true,
    secure: config.env === 'production' && config.https.enabled,
    sameSite: 'lax'
  }
}));

app.use('/user', session({
  secret: config.jwt.secret,
  resave: false,
  saveUninitialized: false,
  proxy: config.server.trustProxy > 0,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000,
    httpOnly: true,
    secure: config.env === 'production' && config.https.enabled,
    sameSite: 'lax'
  }
}));

app.use(requestLogger(logger));

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.env
  });
});

app.use('/api', apiLimiter);
app.use('/api/auth', apiAuthRoutes);
app.use('/api/activities', apiActivitiesRoutes);

app.use('/user/auth', userAuthRoutes);
app.use('/user', userDashboardRoutes);

app.use('/admin/auth', adminAuthRoutes);
app.use('/admin', adminDashboardRoutes);

app.get('/', (req, res) => {
  res.redirect('/user/auth/login');
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Risorsa non trovata'
    }
  });
});

app.use(errorHandler(logger));

async function initialize() {
  try {
    await ensureEnvFile();

    logger.info('Inizializzazione storage...');
    await fileStorage.initialize();

    logger.info('Inizializzazione credenziali admin...');
    await adminAuthService.initialize();

    logger.info('Inizializzazione completata');
  } catch (error) {
    logger.error({ err: error }, 'Errore durante inizializzazione');
    process.exit(1);
  }
}

async function ensureEnvFile() {
  const fs = require('fs').promises;
  const envPath = path.join(process.cwd(), '.env');
  const examplePath = path.join(process.cwd(), '.env.example');

  try {
    await fs.access(envPath);
  } catch (error) {
    logger.warn('.env file non trovato, copio da .env.example');
    try {
      const content = await fs.readFile(examplePath, 'utf-8');
      await fs.writeFile(envPath, content, 'utf-8');
      logger.info('.env file creato con successo da .env.example');
    } catch (copyError) {
      logger.error({ err: copyError }, 'Impossibile creare .env da .env.example');
      logger.warn('Continuazione con valori di default dalla configurazione');
    }
  }
}

initialize().catch(err => {
  logger.error({ err }, 'Fatal initialization error');
  process.exit(1);
});

module.exports = app;
