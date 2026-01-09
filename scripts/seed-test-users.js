const activityService = require('../src/services/activity/activityService');
const activityTypesService = require('../src/services/admin/activityTypesService');
const settingsService = require('../src/services/admin/settingsService');
const shiftTypesService = require('../src/services/admin/shiftTypesService');
const userStorage = require('../src/services/storage/userStorage');
const config = require('../src/config');
const { addDays, formatDate } = require('../src/services/utils/dateUtils');
const { findShiftType, isWorkingDay } = require('../src/services/utils/shiftUtils');

const TOTAL_USERS = 10;
const USERS_PER_SHIFT = 5;
const OK_USERS_PER_SHIFT = 3;
const REQUIRED_MINUTES = config.activity.requiredMinutes;

function getRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function splitDuration(totalMinutes, parts) {
  const segments = [];
  let remaining = totalMinutes;

  for (let i = 0; i < parts; i += 1) {
    const max = Math.max(15, Math.floor(remaining / (parts - i)));
    const min = 15;
    const raw = i === parts - 1 ? remaining : min + Math.floor(Math.random() * (max - min + 1));
    let rounded = Math.max(15, Math.floor(raw / 15) * 15);
    const remainingSlots = parts - i - 1;
    const minRemaining = remainingSlots * 15;
    const maxAllowed = Math.max(15, remaining - minRemaining);
    if (rounded > maxAllowed) {
      rounded = maxAllowed;
    }
    segments.push(rounded);
    remaining -= rounded;
  }

  if (remaining !== 0) {
    segments[segments.length - 1] += remaining;
  }

  return segments;
}

async function ensureUser(username, displayName) {
  const existing = await userStorage.findByUsername(username);
  if (existing) {
    return existing;
  }

  const user = await settingsService.createLocalUser({
    username,
    password: 'Password123!',
    displayName
  });

  return await userStorage.findByUserKey(user.userKey);
}

async function seedUserActivities(user, shiftType, activityTypes, fromDate, toDate, statusMode) {
  const workingDates = [];
  let cursor = fromDate;

  while (cursor <= toDate) {
    if (isWorkingDay(cursor, shiftType)) {
      workingDates.push(cursor);
    }
    cursor = addDays(cursor, 1);
  }

  let missingDays = new Set();
  let incompleteDays = new Set();

  if (statusMode === 'irregular' && workingDates.length > 0) {
    const shuffled = workingDates.slice().sort(() => 0.5 - Math.random());
    const missingCount = Math.max(1, Math.floor(workingDates.length * 0.05));
    const incompleteCount = Math.max(1, Math.floor(workingDates.length * 0.1));
    missingDays = new Set(shuffled.slice(0, Math.min(missingCount, shuffled.length)));
    incompleteDays = new Set(
      shuffled.slice(
        Math.min(missingCount, shuffled.length),
        Math.min(missingCount + incompleteCount, shuffled.length)
      )
    );
  }

  for (const date of workingDates) {
    if (missingDays.has(date)) {
      continue;
    }

    const isIncomplete = incompleteDays.has(date);
    const rawTargetMinutes = isIncomplete
      ? Math.max(120, Math.floor(REQUIRED_MINUTES * getRandomItem([0.5, 0.65, 0.8])))
      : REQUIRED_MINUTES + getRandomItem([0, 30, 60]);

    const maxDailyMinutes = (24 * 60) - 15;
    const cappedMinutes = Math.min(rawTargetMinutes, maxDailyMinutes);
    const targetMinutes = Math.max(15, Math.floor(cappedMinutes / 15) * 15);
    const maxSegments = Math.floor(targetMinutes / 15);
    const activityCount = Math.min(getRandomItem([1, 2, 3]), Math.max(1, maxSegments));
    const segments = splitDuration(targetMinutes, activityCount);

    for (const minutes of segments) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;

      await activityService.createActivity(user.userKey, {
        date,
        durationHours: hours,
        durationMinutes: mins,
        activityType: getRandomItem(activityTypes),
        notes: 'Dato di test generato automaticamente'
      });
    }
  }
}

async function main() {
  const shiftTypes = await shiftTypesService.getShiftTypes();
  const shiftFeriali = findShiftType(shiftTypes, 'Feriali');
  const shift247 = findShiftType(shiftTypes, '24/7');

  if (!shiftFeriali || !shift247) {
    throw new Error('Tipi di turno Feriali o 24/7 non trovati');
  }

  const activityTypes = (await activityTypesService.getActivityTypes())
    .filter(type => type !== 'altro');

  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 3);
  const fromDate = formatDate(startDate);
  const toDate = formatDate(today);

  for (let i = 0; i < TOTAL_USERS; i += 1) {
    const index = String(i + 1).padStart(2, '0');
    const username = `testuser${index}`;
    const displayName = `Test User ${index}`;

    const user = await ensureUser(username, displayName);
    const shift = i < USERS_PER_SHIFT ? shiftFeriali.name : shift247.name;
    await settingsService.updateUserShift(user.userKey, shift);

    const shiftType = i < USERS_PER_SHIFT ? shiftFeriali : shift247;
    const indexInShift = i % USERS_PER_SHIFT;
    const statusMode = indexInShift < OK_USERS_PER_SHIFT ? 'ok' : 'irregular';
    await seedUserActivities(user, shiftType, activityTypes, fromDate, toDate, statusMode);
  }

  console.log('Seed dati completato.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
