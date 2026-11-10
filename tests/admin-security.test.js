const request = require('supertest');
const app = require('../src/app');

describe('admin security flows', () => {
  test('GET /admin/auth/login exposes a CSRF token', async () => {
    const response = await request(app)
      .get('/admin/auth/login')
      .expect(200);

    expect(response.text).toMatch(/name="admin-csrf-token" content="[a-f0-9]+"/);
  });

  test('POST /admin/auth/login rejects requests without a CSRF token', async () => {
    const response = await request(app)
      .post('/admin/auth/login')
      .type('form')
      .send({ username: 'admin', password: 'admin' })
      .expect(403);

    expect(response.text).toContain('Token CSRF non valido o mancante');
  });
});
