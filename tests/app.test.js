const request = require('supertest');
const app = require('../src/app');

describe('application smoke tests', () => {
  test('GET /health returns service status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      status: 'ok',
      env: 'test'
    }));
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  test('GET / redirects to user login', async () => {
    const response = await request(app)
      .get('/')
      .expect(302);

    expect(response.headers.location).toBe('/user/auth/login');
  });
});
