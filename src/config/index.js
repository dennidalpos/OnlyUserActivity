const path = require('path');
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  server: {
    host: process.env.SERVER_HOST || '0.0.0.0',
    port: parseInt(process.env.SERVER_PORT, 10) || 3000,
    trustProxy: parseInt(process.env.TRUST_PROXY, 10) || 0
  },

  https: {
    enabled: process.env.HTTPS_ENABLED === 'true',
    certPath: process.env.HTTPS_CERT_PATH,
    keyPath: process.env.HTTPS_KEY_PATH
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    toFile: process.env.LOG_TO_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs', 'activity-tracker.log')
  },

  ldap: {
    enabled: process.env.LDAP_ENABLED === 'true',
    url: process.env.LDAP_URL || 'ldap://localhost:389',
    baseDN: process.env.LDAP_BASE_DN || 'DC=example,DC=com',
    bindDN: process.env.LDAP_BIND_DN || '',
    bindPassword: process.env.LDAP_BIND_PASSWORD || '',
    userSearchFilter: process.env.LDAP_USER_SEARCH_FILTER || '(sAMAccountName={{username}})',
    groupSearchBase: process.env.LDAP_GROUP_SEARCH_BASE || '',
    requiredGroup: process.env.LDAP_REQUIRED_GROUP || 'Domain Users',
    timeout: parseInt(process.env.LDAP_TIMEOUT, 10) || 5000
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshEnabled: process.env.JWT_REFRESH_ENABLED === 'true'
  },

  storage: {
    rootPath: process.env.DATA_ROOT_PATH || './data',
    auditRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS, 10) || 730,
    auditPayloadMode: process.env.AUDIT_PAYLOAD_MODE || 'partial'
  },

  admin: {
    sessionSecret: process.env.ADMIN_SESSION_SECRET || 'change-me-in-production',
    sessionMaxAge: parseInt(process.env.ADMIN_SESSION_MAX_AGE, 10) || 3600000,
    defaultUsername: process.env.ADMIN_DEFAULT_USERNAME || 'admin',
    defaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'admin'
  },

  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    loginRateLimitMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 5,
    loginLockoutDurationMs: parseInt(process.env.LOGIN_LOCKOUT_DURATION_MS, 10) || 300000,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  activity: {
    strictContinuity: process.env.ACTIVITY_STRICT_CONTINUITY === 'true',
    requiredMinutes: parseInt(process.env.ACTIVITY_REQUIRED_MINUTES, 10) || 480
  }
};

function validateConfig() {
  const errors = [];

  if (config.env === 'production') {
    if (config.jwt.secret === 'change-me-in-production') {
      errors.push('JWT_SECRET must be changed in production');
    }
    if (config.admin.sessionSecret === 'change-me-in-production') {
      errors.push('ADMIN_SESSION_SECRET must be changed in production');
    }
  }

  if (config.ldap.enabled) {
    if (!config.ldap.url) {
      errors.push('LDAP_URL is required when LDAP_ENABLED=true');
    }
    if (!config.ldap.baseDN) {
      errors.push('LDAP_BASE_DN is required when LDAP_ENABLED=true');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

if (config.env === 'production' || process.env.VALIDATE_CONFIG === 'true') {
  try {
    validateConfig();
  } catch (error) {
    console.error('FATAL:', error.message);
    process.exit(1);
  }
}

module.exports = config;
