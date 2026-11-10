const request = require('supertest');
const app = require('../src/app');
const userStorage = require('../src/services/storage/userStorage');
const { hashPassword } = require('../src/services/utils/hashUtils');

function extractAdminCsrfToken(html) {
  const match = html.match(/name="admin-csrf-token" content="([a-f0-9]+)"/);
  return match ? match[1] : null;
}

describe('critical application flows', () => {
  beforeAll(async () => {
    await app.initialize();
  });

  test('admin settings API returns 400 for invalid server port', async () => {
    const agent = request.agent(app);

    const loginPage = await agent.get('/admin/auth/login').expect(200);
    const loginCsrfToken = extractAdminCsrfToken(loginPage.text);

    await agent
      .post('/admin/auth/login')
      .type('form')
      .send({
        username: 'admin',
        password: 'admin',
        _csrf: loginCsrfToken
      })
      .expect(302);

    const settingsPage = await agent.get('/admin/settings').expect(200);
    const settingsCsrfToken = extractAdminCsrfToken(settingsPage.text);

    const response = await agent
      .post('/admin/api/settings/server')
      .set('x-csrf-token', settingsCsrfToken)
      .send({ port: '70000' })
      .expect(400);

    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      error: expect.stringContaining('Porta non valida')
    }));
  });

  test('activity creation validation rejects payloads without duration or times', async () => {
    const password = 'password-123';
    const user = await userStorage.create({
      username: 'local.validation',
      displayName: 'Local Validation',
      userType: 'local',
      passwordHash: await hashPassword(password)
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: user.username,
        password
      })
      .expect(200);

    const token = loginResponse.body.data.token;

    const response = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-03-20',
        activityType: 'lavoro'
      })
      .expect(400);

    expect(response.body.error).toEqual(expect.objectContaining({
      code: 'VALIDATION_ERROR',
      message: 'Errori di validazione'
    }));
  });

  test('user dashboard HTML loads the split frontend bundles after login', async () => {
    const password = 'password-123';
    await userStorage.create({
      username: 'local.dashboard',
      displayName: 'Local Dashboard',
      userType: 'local',
      passwordHash: await hashPassword(password)
    });

    const agent = request.agent(app);

    await agent
      .post('/user/auth/login')
      .type('form')
      .send({
        username: 'local.dashboard',
        password
      })
      .expect(302);

    const response = await agent
      .get('/user/dashboard')
      .expect(200);

    expect(response.text).toContain('/js/dashboard-core.js');
    expect(response.text).toContain('/js/dashboard-activities.js');
    expect(response.text).toContain('/js/dashboard-calendar.js');
  });
});
