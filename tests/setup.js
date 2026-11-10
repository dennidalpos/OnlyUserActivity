process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.ADMIN_SESSION_SECRET = 'test-admin-secret';
process.env.LOG_LEVEL = 'silent';

const fs = require('fs/promises');
const path = require('path');

const workerId = process.env.JEST_WORKER_ID || '0';
const testDataPath = path.join(process.cwd(), 'test-data', `worker-${workerId}`);
const testEnvPath = path.join(testDataPath, '.env');

process.env.DATA_ROOT_PATH = testDataPath;
process.env.ONLYUSERACTIVITY_ENV_PATH = testEnvPath;

beforeAll(async () => {
  await fs.rm(testDataPath, { recursive: true, force: true });
  await fs.mkdir(testDataPath, { recursive: true });

  const envLines = [
    'NODE_ENV=test',
    'SERVER_HOST=127.0.0.1',
    'SERVER_PORT=3001',
    'TRUST_PROXY=0',
    'DEFAULT_USER_SHIFT=',
    'DEFAULT_USER_CONTRACT_PRESET=',
    'HTTPS_ENABLED=false',
    'LOG_LEVEL=silent',
    'LOG_TO_FILE=false',
    'LDAP_ENABLED=false',
    `JWT_SECRET=${process.env.JWT_SECRET}`,
    'JWT_EXPIRES_IN=8h',
    'JWT_REFRESH_ENABLED=false',
    `DATA_ROOT_PATH=${testDataPath}`,
    `ADMIN_SESSION_SECRET=${process.env.ADMIN_SESSION_SECRET}`,
    'ADMIN_SESSION_MAX_AGE=3600000',
    'ADMIN_DEFAULT_USERNAME=admin',
    'ADMIN_DEFAULT_PASSWORD=admin',
    'RATE_LIMIT_WINDOW_MS=900000',
    'RATE_LIMIT_MAX_REQUESTS=100',
    'LOGIN_RATE_LIMIT_MAX=5',
    'LOGIN_LOCKOUT_DURATION_MS=300000',
    'CORS_ORIGIN=http://localhost:3001',
    'ALLOW_PROCESS_SUPERVISOR_RESTART=false',
    'ACTIVITY_STRICT_CONTINUITY=false',
    'ACTIVITY_REQUIRED_MINUTES=480'
  ];

  await fs.writeFile(testEnvPath, `${envLines.join('\n')}\n`, 'utf8');
});

afterAll(async () => {
  await fs.rm(testDataPath, { recursive: true, force: true });
});
