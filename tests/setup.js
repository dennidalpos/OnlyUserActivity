// Jest setup file
// Configurazione globale per i test

// Mock environment variables per test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.ADMIN_SESSION_SECRET = 'test-admin-secret';
process.env.DATA_ROOT_PATH = './test-data';
process.env.LOG_LEVEL = 'silent';

// Setup e teardown globali
beforeAll(() => {
  // Setup globale prima di tutti i test
});

afterAll(() => {
  // Cleanup globale dopo tutti i test
});
