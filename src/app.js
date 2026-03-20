const express = require('express');
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');

const requestLogger = require('./middlewares/requestLogger');
const { errorHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { attachAdminCsrf } = require('./middlewares/adminCsrf');

const apiAuthRoutes = require('./routes/api/auth');
const apiActivitiesRoutes = require('./routes/api/activities');
const adminAuthRoutes = require('./routes/admin/auth');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const userAuthRoutes = require('./routes/user/auth');
const userDashboardRoutes = require('./routes/user/dashboard');

const fileStorage = require('./services/storage/fileStorage');
const adminAuthService = require('./services/auth/adminAuthService');
const { createLogDestination, createLogger } = require('./services/utils/logUtils');

const logDestination = createLogDestination();
const logger = createLogger(logDestination);

const app = express();

app.set('trust proxy', config.server.trustProxy);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res, next) => {
  res.locals.uiHelpEnabled = config.env !== 'production';
  next();
});

app.use('/admin', session({
  name: 'admin.sid',
  secret: config.admin.sessionSecret,
  resave: false,
  saveUninitialized: false,
  proxy: config.server.trustProxy > 0,
  cookie: {
    path: '/admin',
    maxAge: config.admin.sessionMaxAge,
    httpOnly: true,
    secure: config.env === 'production' && config.https.enabled,
    sameSite: 'lax'
  }
}));

app.use('/user', session({
  name: 'user.sid',
  secret: config.jwt.secret,
  resave: false,
  saveUninitialized: false,
  proxy: config.server.trustProxy > 0,
  cookie: {
    path: '/user',
    maxAge: 8 * 60 * 60 * 1000,
    httpOnly: true,
    secure: config.env === 'production' && config.https.enabled,
    sameSite: 'lax'
  }
}));

app.use('/admin', attachAdminCsrf);

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
  if (req.accepts(['html', 'json']) === 'html') {
    return res.status(404).render('errors/error', {
      title: 'Errore',
      error: 'Risorsa non trovata'
    });
  }
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Risorsa non trovata'
    }
  });
});

app.use(errorHandler(logger));

let initializationPromise = null;

async function initializeApp() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      logger.info('Inizializzazione storage...');
      await fileStorage.initialize();

      logger.info('Inizializzazione credenziali admin...');
      await adminAuthService.initialize();

      logger.info('Inizializzazione completata');
    })();
  }

  return initializationPromise;
}

app.initialize = initializeApp;
app.logger = logger;

module.exports = app;
