const express = require('express');
const request = require('supertest');

describe('API auth route', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.LDAP_ENABLED = 'false';
  });

  test('uses local auth when LDAP is enabled but authMethod=local is requested', async () => {
    process.env.LDAP_ENABLED = 'true';

    const localAuthenticate = jest.fn().mockResolvedValue({
      userKey: 'local-1',
      username: 'mario',
      displayName: 'Mario Rossi'
    });
    const ldapAuthenticate = jest.fn();
    const auditLog = jest.fn().mockResolvedValue();

    jest.doMock('../src/services/auth/localAuth', () => ({
      authenticate: localAuthenticate
    }));
    jest.doMock('../src/services/ldap/ldapAuth', () => ({
      authenticate: ldapAuthenticate
    }));
    jest.doMock('../src/services/auth/tokenService', () => ({
      generateToken: () => ({ token: 'jwt-token', expiresAt: '2099-01-01T00:00:00.000Z' })
    }));
    jest.doMock('../src/services/storage/auditLogger', () => ({
      log: auditLog
    }));

    const authRoute = require('../src/routes/api/auth');
    const { errorHandler } = require('../src/middlewares/errorHandler');

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/auth', authRoute);
    testApp.use(errorHandler(console));

    const response = await request(testApp)
      .post('/api/auth/login')
      .send({ username: 'mario', password: 'secret', authMethod: 'local' })
      .expect(200);

    expect(localAuthenticate).toHaveBeenCalledWith('mario', 'secret');
    expect(ldapAuthenticate).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalled();
    expect(response.body.data).toEqual(expect.objectContaining({
      token: 'jwt-token',
      userKey: 'local-1',
      username: 'mario'
    }));
  });
});
