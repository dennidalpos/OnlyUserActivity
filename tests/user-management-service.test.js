const userManagementService = require('../src/services/admin/userManagementService');
const userStorage = require('../src/services/storage/userStorage');

describe('user management deletion policy', () => {
  test('deleteLocalUser blocks manual deletion of AD users', async () => {
    const adUser = await userStorage.create({
      username: 'ldap.user',
      displayName: 'LDAP User',
      userType: 'ad'
    });

    await expect(userManagementService.deleteLocalUser(adUser.userKey))
      .rejects
      .toThrow('Non è possibile eliminare manualmente gli utenti AD');
  });
});
