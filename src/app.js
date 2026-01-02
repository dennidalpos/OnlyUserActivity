const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const pino = require('pino');
const config = require('./config');

// Middlewares
const requestLogger = require('./middlewares/requestLogger');
const { errorHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');

// Routes
const apiAuthRoutes = require('./routes/api/auth');
const apiActivitiesRoutes = require('./routes/api/activities');
const adminAuthRoutes = require('./routes/admin/auth');
const adminDashboardRoutes = require('./routes/admin/dashboard');

// Services
const fileStorage = require('./services/storage/fileStorage');
const adminAuthService = require('./services/auth/adminAuthService');

// Logger
const logger = pino({
  level: config.logging.level,
  transport: config.env === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});

const app = express();

// Trust proxy
app.set('trust proxy', config.server.trustProxy);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    }
  }
}));

// CORS per API
app.use('/api', cors({
  origin: config.security.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Session per admin
app.use('/admin', session({
  secret: config.admin.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: config.admin.sessionMaxAge,
    httpOnly: true,
    secure: config.env === 'production' && config.https.enabled
  }
}));

// Request logging
app.use(requestLogger(logger));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.env
  });
});

// API routes con rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth', apiAuthRoutes);
app.use('/api/activities', apiActivitiesRoutes);

// Admin routes
app.use('/admin/auth', adminAuthRoutes);
app.use('/admin', adminDashboardRoutes);

// Redirect root to admin
app.get('/', (req, res) => {
  res.redirect('/admin/dashboard');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Risorsa non trovata'
    }
  });
});

// Error handler (deve essere ultimo)
app.use(errorHandler(logger));

// Inizializzazione
async function initialize() {
  try {
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

// Chiama inizializzazione
initialize().catch(err => {
  logger.error({ err }, 'Fatal initialization error');
  process.exit(1);
});

module.exports = app;
