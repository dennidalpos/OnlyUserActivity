const fs = require('fs/promises');
const path = require('path');
const request = require('supertest');

const app = require('../src/app');
const userStorage = require('../src/services/storage/userStorage');
const activityStorage = require('../src/services/storage/activityStorage');
const { hashPassword } = require('../src/services/utils/hashUtils');

function extractAdminCsrfToken(html) {
  const match = html.match(/name="admin-csrf-token" content="([a-f0-9]+)"/);
  return match ? match[1] : null;
}

async function loginAdmin() {
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
  const adminCsrfToken = extractAdminCsrfToken(settingsPage.text);

  return {
    agent,
    adminCsrfToken
  };
}

describe('admin operational routes', () => {
  let activeUser;
  let inactiveUser;

  beforeAll(async () => {
    await app.initialize();

    activeUser = await userStorage.create({
      username: 'local.admin.active',
      displayName: 'Local Admin Active',
      userType: 'local',
      passwordHash: await hashPassword('password-123')
    });

    inactiveUser = await userStorage.create({
      username: 'local.admin.inactive',
      displayName: 'Local Admin Inactive',
      userType: 'local',
      passwordHash: await hashPassword('password-123')
    });

    await activityStorage.create(activeUser.userKey, {
      date: '2026-03-18',
      startTime: '08:00',
      endTime: '16:00',
      activityType: 'lavoro',
      customType: '',
      notes: 'Turno completo'
    });
  });

  test('GET /admin/api/monitoring returns aggregated daily monitoring data', async () => {
    const { agent } = await loginAdmin();

    const response = await agent
      .get('/admin/api/monitoring?date=2026-03-18')
      .set('Accept', 'application/json')
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        date: '2026-03-18',
        summary: expect.objectContaining({
          totalUsers: 2,
          okCount: 1,
          absentCount: 1
        })
      })
    }));

    expect(response.body.data.users).toEqual(expect.arrayContaining([
      expect.objectContaining({
        username: activeUser.username,
        status: 'OK',
        totalMinutes: 480
      }),
      expect.objectContaining({
        username: inactiveUser.username,
        status: 'ASSENTE',
        totalMinutes: 0
      })
    ]));
  });

  test('POST /admin/api/export returns a CSV attachment', async () => {
    const { agent, adminCsrfToken } = await loginAdmin();

    const response = await agent
      .post('/admin/api/export')
      .set('x-csrf-token', adminCsrfToken)
      .send({
        userKeys: [activeUser.userKey],
        fromDate: '2026-03-18',
        toDate: '2026-03-18',
        format: 'csv',
        exportType: 'detailed'
      })
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment; filename=');
    expect(response.text).toContain(activeUser.username);
    expect(response.text).toContain('2026-03-18');
  });

  test('GET /admin/api/server/info exposes runtime information', async () => {
    const { agent } = await loginAdmin();

    const response = await agent
      .get('/admin/api/server/info')
      .set('Accept', 'application/json')
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        env: 'test',
        nodeVersion: expect.any(String),
        platform: expect.any(String),
        pid: expect.any(Number)
      })
    }));
  });

  test('POST /admin/api/server/restart rejects restart without supervisor support', async () => {
    const { agent, adminCsrfToken } = await loginAdmin();

    const response = await agent
      .post('/admin/api/server/restart')
      .set('x-csrf-token', adminCsrfToken)
      .send({})
      .expect(409);

    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      error: expect.stringContaining('Riavvio remoto non supportato')
    }));
  });

  test('settings export, import and troubleshoot routes operate on the isolated test env', async () => {
    const { agent, adminCsrfToken } = await loginAdmin();
    const storageProbeRoot = path.join(process.env.DATA_ROOT_PATH, 'storage-probe');

    const exportResponse = await agent
      .get('/admin/api/settings/server/export?sections=settings')
      .set('Accept', 'application/json')
      .expect(200);

    expect(exportResponse.body).toEqual(expect.objectContaining({
      generatedAt: expect.any(String),
      settings: expect.objectContaining({
        server: expect.objectContaining({
          host: '127.0.0.1',
          port: 3001
        })
      })
    }));

    const importResponse = await agent
      .post('/admin/api/settings/server/import')
      .set('x-csrf-token', adminCsrfToken)
      .send({
        sections: ['settings'],
        payload: {
          settings: {
            server: {
              host: '127.0.0.1',
              port: 3010,
              trustProxy: 1,
              defaultUserShift: 'Feriali',
              defaultUserContractPreset: ''
            }
          }
        }
      })
      .expect(200);

    expect(importResponse.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        success: true
      })
    }));

    const envContent = await fs.readFile(process.env.ONLYUSERACTIVITY_ENV_PATH, 'utf8');
    expect(envContent).toContain('SERVER_PORT=3010');
    expect(envContent).toContain('TRUST_PROXY=1');
    expect(envContent).toContain('DEFAULT_USER_SHIFT=Feriali');

    const troubleshootResponse = await agent
      .post('/admin/api/settings/troubleshoot')
      .set('x-csrf-token', adminCsrfToken)
      .send({
        type: 'storage',
        payload: {
          rootPath: storageProbeRoot
        }
      })
      .expect(200);

    expect(troubleshootResponse.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        success: true,
        message: expect.stringContaining(storageProbeRoot)
      })
    }));
  });
});
