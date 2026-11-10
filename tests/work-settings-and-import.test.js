const fs = require('fs/promises');
const path = require('path');
const shiftTypesService = require('../src/services/admin/shiftTypesService');
const contractPresetsService = require('../src/services/admin/contractPresetsService');
const configExportService = require('../src/services/admin/configExportService');
const envService = require('../src/services/admin/envService');

describe('work settings and configuration import', () => {
  test('contract preset assigned to a shift drives effective weekly hours and required daily minutes', async () => {
    await contractPresetsService.setPresets([
      {
        id: 'part-time-30',
        name: 'Part-time 30h',
        type: 'part-time',
        weeklyHours: 30
      }
    ]);

    await shiftTypesService.setShiftTypes([
      {
        id: 'feriali',
        name: 'Feriali',
        workingDays: [1, 2, 3, 4, 5],
        includeWeekends: false,
        includeHolidays: false,
        contract: {
          presetId: 'part-time-30'
        }
      }
    ]);

    const workSettings = await shiftTypesService.resolveUserWorkSettings({
      shift: 'Feriali',
      contractPreset: null
    });

    expect(workSettings.contract).toEqual(expect.objectContaining({
      presetId: 'part-time-30',
      weeklyHours: 30
    }));
    expect(workSettings.requiredMinutes).toBe(360);
  });

  test('full configuration import writes users in the imported storage root', async () => {
    const importedRoot = path.join(process.cwd(), 'test-data-import-root');
    const applySettingsSnapshotSpy = jest
      .spyOn(envService, 'applySettingsSnapshot')
      .mockResolvedValue();

    await fs.rm(importedRoot, { recursive: true, force: true });

    await configExportService.importFullConfiguration({
      settings: {
        storage: {
          rootPath: importedRoot
        }
      },
      users: [
        {
          userKey: 'imported-user',
          username: 'imported.user',
          displayName: 'Imported User',
          userType: 'local'
        }
      ]
    }, {
      sections: ['advanced', 'users']
    });

    const importedIndexPath = path.join(importedRoot, 'users', 'index.json');
    const importedUserPath = path.join(importedRoot, 'users', 'imported-user.json');

    await expect(fs.readFile(importedIndexPath, 'utf8')).resolves.toContain('imported.user');
    await expect(fs.readFile(importedUserPath, 'utf8')).resolves.toContain('Imported User');

    await fs.rm(importedRoot, { recursive: true, force: true });
    applySettingsSnapshotSpy.mockRestore();
  });
});
