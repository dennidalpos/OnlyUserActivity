process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.ADMIN_SESSION_SECRET = 'test-admin-secret';
process.env.DATA_ROOT_PATH = './test-data';
process.env.LOG_LEVEL = 'silent';

beforeAll(() => {
});

afterAll(() => {
});
