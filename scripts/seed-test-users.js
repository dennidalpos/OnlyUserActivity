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
const REQUIRED_MINUTES = config.activity.requiredMinutes;

function getMonthRange(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { firstDay, lastDay };
}

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
    const rounded = Math.max(15, Math.round(raw / 15) * 15);
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

async function seedUserActivities(user, shiftType, activityTypes, monthStart, monthEnd) {
  const allDates = [];
  let cursor = formatDate(monthStart);
  const end = formatDate(monthEnd);

  while (cursor <= end) {
    if (isWorkingDay(cursor, shiftType)) {
      allDates.push(cursor);
    }
    cursor = addDays(cursor, 1);
  }

  const shuffled = allDates.sort(() => 0.5 - Math.random());
  const targetDays = shuffled.slice(0, Math.min(18, shuffled.length));
  const missingDays = new Set(targetDays.slice(0, 3));
  const incompleteDays = new Set(targetDays.slice(3, 6));

  for (const date of targetDays) {
    if (missingDays.has(date)) {
      continue;
    }

    const isIncomplete = incompleteDays.has(date);
    const targetMinutes = isIncomplete
      ? Math.max(120, REQUIRED_MINUTES - 120)
      : REQUIRED_MINUTES + getRandomItem([0, 30, 60]);

    const activityCount = getRandomItem([1, 2, 3]);
    const segments = splitDuration(targetMinutes, activityCount);

    for (const minutes of segments) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60 || 15;

      await activityService.createActivity(user.userKey, {
        date,
        durationHours: Math.max(1, hours),
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
  today.setMonth(today.getMonth() - 3);
  const { firstDay, lastDay } = getMonthRange(today);

  for (let i = 0; i < TOTAL_USERS; i += 1) {
    const index = String(i + 1).padStart(2, '0');
    const username = `testuser${index}`;
    const displayName = `Test User ${index}`;

    const user = await ensureUser(username, displayName);
    const shift = i < USERS_PER_SHIFT ? shiftFeriali.name : shift247.name;
    await settingsService.updateUserShift(user.userKey, shift);

    const shiftType = i < USERS_PER_SHIFT ? shiftFeriali : shift247;
    await seedUserActivities(user, shiftType, activityTypes, firstDay, lastDay);
  }

  console.log('Seed dati completato.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
